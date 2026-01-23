/**
 * DataContext with API Integration
 * This version uses PostgreSQL via API instead of localStorage
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { checkApiAvailability, migrateLocalStorageToDatabase } from '../utils/migration';

// Initial database structure
const INITIAL_DB = {
    version: '4.0',
    customers: [],
    brokers: [],
    companyReps: [],
    commissionPayments: [],
    projects: [],
    receipts: [],
    interactions: [],
    inventory: [],
    masterProjects: [],
    settings: {
        currency: 'PKR',
        currencySymbol: '₨',
        defaultCycle: 'quarterly',
        followUpDays: [1, 3, 7, 14, 30],
        defaultCommissionRate: 1,
    },
    lastUpdated: new Date().toISOString(),
    changeCount: 0
};

// ========== CONTEXT ==========
const DataContext = createContext(null);

export function DataProvider({ children }) {
    const [db, setDb] = useState(INITIAL_DB);
    const [loading, setLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState(null);
    const [saveStatus, setSaveStatus] = useState('saved');
    const [apiAvailable, setApiAvailable] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'checking' | 'migrating' | 'completed' | 'failed'>('idle');

    const changeCountRef = useRef(0);
    const saveTimeoutRef = useRef(null);

    // Check API availability and migrate if needed
    useEffect(() => {
        const initialize = async () => {
            try {
                setMigrationStatus('checking');
                console.log('🔍 Checking API availability...');
                const available = await checkApiAvailability();
                console.log('API available:', available);
                setApiAvailable(available);

                if (available) {
                    // Check if we need to migrate from localStorage
                    const hasLocalStorageData = localStorage.getItem('sitara_crm_data');
                    const hasMigrated = localStorage.getItem('sitara_crm_migrated');

                    console.log('LocalStorage check:', {
                        hasData: !!hasLocalStorageData,
                        dataLength: hasLocalStorageData?.length || 0,
                        hasMigrated: hasMigrated
                    });

                    if (hasLocalStorageData && !hasMigrated) {
                        // Ask user if they want to migrate
                        const shouldMigrate = window.confirm(
                            'We found data in localStorage. Would you like to migrate it to the database?\n\n' +
                            'Click OK to migrate, or Cancel to start fresh with the database.'
                        );

                        if (shouldMigrate) {
                            try {
                                setMigrationStatus('migrating');
                                console.log('🔄 Starting migration process...');
                                const result = await Promise.race([
                                    migrateLocalStorageToDatabase(),
                                    new Promise((_, reject) =>
                                        setTimeout(() => reject(new Error('Migration timeout after 60 seconds')), 60000)
                                    )
                                ]);

                                if (result.success) {
                                    localStorage.setItem('sitara_crm_migrated', 'true');
                                    setMigrationStatus('completed');
                                    console.log('✅ Migration completed:', result.stats);

                                    // Show success message
                                    alert(`Migration completed successfully!\n\n${JSON.stringify(result.stats, null, 2)}\n\nClick OK to continue.`);

                                    // Load data from API after migration
                                    console.log('🔄 Loading data from API after migration...');
                                    await loadDataFromAPI();
                                    console.log('✅ Data loading complete');
                                } else {
                                    setMigrationStatus('failed');
                                    console.error('❌ Migration failed:', result.message);
                                    alert(`Migration failed: ${result.message}\n\nPlease check the console for details.`);
                                    // Still try to load data from API
                                    await loadDataFromAPI();
                                }
                            } catch (error) {
                                setMigrationStatus('failed');
                                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                console.error('❌ Migration error:', error);
                                alert(`Migration error: ${errorMessage}\n\nPlease check the console and try again.`);
                                // Still try to load data from API
                                await loadDataFromAPI();
                            }
                        } else {
                            localStorage.setItem('sitara_crm_migrated', 'skipped');
                            console.log('Migration skipped by user');
                            // Load data from API even if migration was skipped
                            await loadDataFromAPI();
                        }
                    } else if (!hasLocalStorageData) {
                        console.log('No localStorage data found - starting fresh with database');
                        // Load data from API
                        await loadDataFromAPI();
                    } else if (hasMigrated) {
                        console.log('Migration already completed or skipped');
                        // Load data from API
                        await loadDataFromAPI();
                    }
                    // Note: loadDataFromAPI is called inside the migration block above
                } else {
                    console.warn('⚠️ API not available, falling back to localStorage');
                    loadDataFromLocalStorage();
                }
            } catch (error) {
                console.error('Error initializing:', error);
                loadDataFromLocalStorage();
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, []);

    // Load data from API
    const loadDataFromAPI = useCallback(async () => {
        try {
            console.log('📥 Loading data from API...');
            setLoading(true);

            // Add timeout to prevent hanging
            const result = await Promise.race([
                apiService.getAllData(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Data loading timeout after 30 seconds')), 30000)
                )
            ]);

            if (result.success && result.data) {
                const data = result.data;
                setDb({
                    version: data.version || '4.0',
                    customers: data.customers || [],
                    brokers: data.brokers || [],
                    companyReps: data.companyReps || [],
                    commissionPayments: data.commissionPayments || [],
                    projects: data.projects || [],
                    receipts: data.receipts || [],
                    interactions: data.interactions || [],
                    inventory: data.inventory || [],
                    masterProjects: data.masterProjects || [],
                    settings: {
                        ...INITIAL_DB.settings,
                        ...(data.settings || {})
                    },
                    lastUpdated: data.lastUpdated || new Date().toISOString(),
                    changeCount: 0
                });
                setLastSaved(data.lastUpdated || 'Never');
                console.log('✅ Data loaded from API:', {
                    customers: data.customers?.length || 0,
                    brokers: data.brokers?.length || 0,
                    projects: data.projects?.length || 0,
                });
            } else {
                console.warn('⚠️ API returned no data or failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Error loading data from API:', error);
            // Don't throw - just log and continue
        } finally {
            console.log('✅ Setting loading to false');
            setLoading(false);
        }
    }, []);

    // Fallback: Load data from localStorage
    const loadDataFromLocalStorage = useCallback(() => {
        try {
            const stored = localStorage.getItem('sitara_crm_data');
            if (stored) {
                let data = JSON.parse(stored);
                if (data.state && typeof data.state === 'object') {
                    data = data.state;
                }
                setDb({
                    ...INITIAL_DB,
                    ...data,
                    settings: { ...INITIAL_DB.settings, ...(data.settings || {}) }
                });
                setLastSaved(data.lastUpdated || 'Never');
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }, []);

    // Save data to API
    const saveDataToAPI = useCallback(async (data) => {
        if (!apiAvailable) return false;

        try {
            // For now, we'll save individual changes as they happen
            // In a production app, you might want to batch these
            setSaveStatus('saving');
            // The actual save happens in individual CRUD operations
            setSaveStatus('saved');
            setLastSaved(new Date().toISOString());
            return true;
        } catch (error) {
            console.error('Error saving to API:', error);
            setSaveStatus('error');
            return false;
        }
    }, [apiAvailable]);

    // ========== ID GENERATOR ==========
    const generateId = useCallback((prefix = 'id') => {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // ========== UPDATE DB ==========
    const updateDb = useCallback((updater) => {
        changeCountRef.current += 1;
        setDb((prev) => {
            const newDb = typeof updater === 'function' ? updater(prev) : updater;
            if (JSON.stringify(newDb) === JSON.stringify(prev)) {
                return prev;
            }
            return { ...newDb, changeCount: changeCountRef.current };
        });
    }, []);

    // ========== CUSTOMER FUNCTIONS ==========
    const addCustomer = useCallback(async (customerData) => {
        const newCustomer = {
            ...customerData,
            id: customerData.id || generateId('cust'),
            type: 'customer',
            status: customerData.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (apiAvailable) {
            const result = await apiService.createCustomer(newCustomer);
            if (result.success && result.data) {
                updateDb((prev) => ({
                    ...prev,
                    customers: [...(prev.customers || []), result.data]
                }));
                return result.data;
            }
        } else {
            updateDb((prev) => ({
                ...prev,
                customers: [...(prev.customers || []), newCustomer]
            }));
            // Save to localStorage
            const current = { ...db, customers: [...(db.customers || []), newCustomer] };
            localStorage.setItem('sitara_crm_data', JSON.stringify(current));
        }
        return newCustomer;
    }, [generateId, updateDb, apiAvailable, db]);

    const updateCustomer = useCallback(async (customerId, updates) => {
        if (apiAvailable) {
            const result = await apiService.updateCustomer(customerId, updates);
            if (result.success && result.data) {
                updateDb((prev) => ({
                    ...prev,
                    customers: (prev.customers || []).map((c) =>
                        c.id === customerId ? result.data : c
                    )
                }));
                return;
            }
        }
        updateDb((prev) => ({
            ...prev,
            customers: (prev.customers || []).map((c) =>
                c.id === customerId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
            )
        }));
    }, [updateDb, apiAvailable]);

    const deleteCustomer = useCallback(async (customerId) => {
        if (apiAvailable) {
            const result = await apiService.deleteCustomer(customerId);
            if (result.success) {
                updateDb((prev) => ({
                    ...prev,
                    customers: (prev.customers || []).filter((c) => c.id !== customerId)
                }));
                return;
            }
        }
        updateDb((prev) => ({
            ...prev,
            customers: (prev.customers || []).filter((c) => c.id !== customerId)
        }));
    }, [updateDb, apiAvailable]);

    // ========== BROKER FUNCTIONS ==========
    const addBroker = useCallback(async (brokerData) => {
        const existingBroker = db.brokers?.find(b => b.phone === brokerData.phone);
        if (existingBroker) {
            return { error: 'Phone number already exists', existing: existingBroker };
        }

        const newBroker = {
            id: brokerData.id || generateId('broker'),
            name: brokerData.name,
            phone: brokerData.phone,
            cnic: brokerData.cnic || '',
            email: brokerData.email || '',
            address: brokerData.address || '',
            company: brokerData.company || '',
            commissionRate: parseFloat(brokerData.commissionRate) || db.settings?.defaultCommissionRate || 1,
            bankDetails: brokerData.bankDetails || '',
            notes: brokerData.notes || '',
            status: brokerData.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (apiAvailable) {
            const result = await apiService.createBroker(newBroker);
            if (result.success && result.data) {
                updateDb((prev) => ({
                    ...prev,
                    brokers: [...(prev.brokers || []), result.data]
                }));
                return result.data;
            }
        } else {
            updateDb((prev) => ({
                ...prev,
                brokers: [...(prev.brokers || []), newBroker]
            }));
        }
        return newBroker;
    }, [generateId, updateDb, db.brokers, db.settings, apiAvailable]);

    const updateBroker = useCallback(async (brokerId, updates) => {
        if (apiAvailable) {
            const result = await apiService.updateBroker(brokerId, updates);
            if (result.success && result.data) {
                updateDb((prev) => ({
                    ...prev,
                    brokers: (prev.brokers || []).map((b) =>
                        b.id === brokerId ? result.data : b
                    )
                }));
                return;
            }
        }
        updateDb((prev) => ({
            ...prev,
            brokers: (prev.brokers || []).map((b) =>
                b.id === brokerId ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
            )
        }));
    }, [updateDb, apiAvailable]);

    const deleteBroker = useCallback(async (brokerId) => {
        if (apiAvailable) {
            const result = await apiService.deleteBroker(brokerId);
            if (result.success) {
                updateDb((prev) => ({
                    ...prev,
                    brokers: (prev.brokers || []).filter((b) => b.id !== brokerId)
                }));
                return;
            }
        }
        updateDb((prev) => ({
            ...prev,
            brokers: (prev.brokers || []).filter((b) => b.id !== brokerId)
        }));
    }, [updateDb, apiAvailable]);

    // ========== BROKER FINANCIALS - CRITICAL MISSING FUNCTION ==========
    const getBrokerFinancials = useCallback((brokerId) => {
        const projects = db.projects || [];
        const commissionPayments = db.commissionPayments || [];

        // Get all projects associated with this broker
        const brokerProjects = projects.filter(p =>
            String(p.brokerId || p.broker_id) === String(brokerId)
        );

        // Calculate metrics
        const totalDeals = brokerProjects.length;
        const totalSales = brokerProjects.reduce((sum, p) => {
            const sale = parseFloat(p.sale || p.saleValue || p.total_sale || 0);
            return sum + sale;
        }, 0);

        // Get broker's commission rate (default 1%)
        const broker = (db.brokers || []).find(b => String(b.id) === String(brokerId));
        const commissionRate = parseFloat(broker?.commissionRate || broker?.commission_rate || 1);

        // Calculate total commission (based on sales and commission rate)
        const totalCommission = totalSales * (commissionRate / 100);

        // Get paid commission from commission payments
        const brokerPayments = commissionPayments.filter(cp =>
            String(cp.recipientId || cp.recipient_id) === String(brokerId) &&
            (cp.recipientType || cp.recipient_type) === 'broker'
        );

        const commissionPaid = brokerPayments.reduce((sum, p) => {
            return sum + parseFloat(p.paidAmount || p.paid_amount || p.amount || 0);
        }, 0);

        const commissionPending = totalCommission - commissionPaid;

        // Get active/completed deal counts
        const activeDeals = brokerProjects.filter(p =>
            (p.status || '').toLowerCase() === 'active'
        ).length;

        const completedDeals = brokerProjects.filter(p =>
            (p.status || '').toLowerCase() === 'completed'
        ).length;

        return {
            totalDeals,
            activeDeals,
            completedDeals,
            totalSales,
            totalCommission,
            commissionPaid,
            commissionPending,
            commissionRate
        };
    }, [db.projects, db.commissionPayments, db.brokers]);

    // ========== BULK IMPORT BROKERS - CRITICAL MISSING FUNCTION ==========
    const bulkImportBrokers = useCallback(async (brokersToImport) => {
        const added = [];
        const skipped = [];
        const errors = [];

        for (const brokerData of brokersToImport) {
            try {
                // Check for existing broker by phone
                const existingBroker = db.brokers?.find(b => b.phone === brokerData.phone);
                if (existingBroker) {
                    skipped.push({ ...brokerData, reason: 'Phone number already exists' });
                    continue;
                }

                const newBroker = {
                    id: generateId('broker'),
                    name: brokerData.name || '',
                    phone: brokerData.phone || '',
                    cnic: brokerData.cnic || '',
                    email: brokerData.email || '',
                    address: brokerData.address || '',
                    company: brokerData.company || '',
                    commissionRate: parseFloat(brokerData.commissionRate) || db.settings?.defaultCommissionRate || 1,
                    bankDetails: brokerData.bankDetails || '',
                    notes: brokerData.notes || '',
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                if (apiAvailable) {
                    const result = await apiService.createBroker(newBroker);
                    if (result.success && result.data) {
                        added.push(result.data);
                    } else {
                        errors.push({ ...brokerData, reason: result.error || 'API error' });
                    }
                } else {
                    added.push(newBroker);
                }
            } catch (error) {
                errors.push({ ...brokerData, reason: error.message });
            }
        }

        // Update local state with all added brokers
        if (added.length > 0) {
            updateDb((prev) => ({
                ...prev,
                brokers: [...(prev.brokers || []), ...added]
            }));
        }

        return { added, skipped, errors };
    }, [generateId, updateDb, db.brokers, db.settings, apiAvailable]);

    // ========== PROJECT FUNCTIONS ==========
    const addProject = useCallback(async (projectData) => {
        const newProject = {
            ...projectData,
            id: projectData.id || generateId('proj'),
            status: projectData.status || 'active',
            cycle: projectData.cycle || projectData.paymentCycle || 'bi_annual',
            sale: parseFloat(projectData.sale || projectData.saleValue || projectData.totalSale || 0),
            received: parseFloat(projectData.received || projectData.totalReceived || 0),
            receivable: parseFloat(projectData.receivable || projectData.totalReceivable || 0),
            installments: projectData.installments || [],
            brokerId: projectData.brokerId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!newProject.receivable || newProject.receivable === 0) {
            newProject.receivable = newProject.sale - newProject.received;
        }

        if (apiAvailable) {
            const result = await apiService.createProject(newProject);
            if (result.success && result.data) {
                updateDb((prev) => ({
                    ...prev,
                    projects: [...(prev.projects || []), result.data]
                }));
                return result.data;
            }
        } else {
            updateDb((prev) => ({
                ...prev,
                projects: [...(prev.projects || []), newProject]
            }));
        }
        return newProject;
    }, [generateId, updateDb, apiAvailable]);

    // ========== BACKUP & IMPORT/EXPORT ==========
    const exportData = useCallback(async () => {
        if (apiAvailable) {
            const result = await apiService.exportBackup();
            if (result.success && result.data) {
                return JSON.stringify(result.data, null, 2);
            }
        }
        return JSON.stringify({ ...db, exportDate: new Date().toISOString() }, null, 2);
    }, [db, apiAvailable]);

    const exportToFile = useCallback((filename = null) => {
        const exportDataObj = {
            ...db,
            exportInfo: {
                exportedAt: new Date().toISOString(),
                version: db.version || '4.0',
                source: 'Sitara CRM'
            }
        };

        const blob = new Blob([JSON.stringify(exportDataObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `sitara-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return {
            success: true,
            filename: link.download
        };
    }, [db]);

    const createManualBackup = useCallback(() => {
        const backupData = {
            ...db,
            backupType: 'manual',
            createdAt: new Date().toISOString()
        };

        const backupKey = `sitara_crm_backup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backupData));

        const backupIndex = JSON.parse(localStorage.getItem('sitara_crm_backup_index') || '[]');
        backupIndex.push({
            key: backupKey,
            type: 'manual',
            createdAt: new Date().toISOString(),
            size: JSON.stringify(backupData).length
        });
        localStorage.setItem('sitara_crm_backup_index', JSON.stringify(backupIndex.slice(-10)));

        return {
            success: true,
            key: backupKey,
            createdAt: new Date().toISOString()
        };
    }, [db]);

    const getBackupList = useCallback(() => {
        try {
            const backupIndex = JSON.parse(localStorage.getItem('sitara_crm_backup_index') || '[]');
            return backupIndex.map(backup => ({
                ...backup,
                exists: !!localStorage.getItem(backup.key)
            }));
        } catch (error) {
            console.error('Error getting backup list:', error);
            return [];
        }
    }, []);

    const importBackup = useCallback(async (backupJson) => {
        try {
            let backupData = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson;

            // Handle Zustand format or nested state
            if (backupData.state && typeof backupData.state === 'object') {
                backupData = backupData.state;
            }

            // Remove export metadata if present
            if (backupData.exportInfo) {
                delete backupData.exportInfo;
            }
            if (backupData.exportDate) {
                delete backupData.exportDate;
            }

            console.log('📥 Importing backup data:', {
                hasCustomers: !!backupData.customers,
                customersCount: backupData.customers?.length || 0,
                hasBrokers: !!backupData.brokers,
                brokersCount: backupData.brokers?.length || 0,
                hasProjects: !!backupData.projects,
                projectsCount: backupData.projects?.length || 0,
            });

            if (apiAvailable) {
                const result = await apiService.importBackup(backupData);
                if (result.success) {
                    await loadDataFromAPI();
                    return { success: true, data: backupData };
                }
                return { success: false, error: result.error || 'Import failed' };
            } else {
                // Fallback to localStorage
                setDb(backupData);
                localStorage.setItem('sitara_crm_data', JSON.stringify(backupData));
                return { success: true, data: backupData };
            }
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, error: error.message || 'Failed to import backup' };
        }
    }, [apiAvailable, loadDataFromAPI]);

    const restoreFromBackup = useCallback(async (backupKey) => {
        try {
            createManualBackup();

            const backupDataStr = localStorage.getItem(backupKey);
            if (!backupDataStr) {
                return { success: false, error: 'Backup not found' };
            }

            const backupData = JSON.parse(backupDataStr);

            if (apiAvailable) {
                const result = await apiService.importBackup(backupData);
                if (result.success) {
                    await loadDataFromAPI();
                    return { success: true, data: backupData };
                }
                return { success: false, error: result.error };
            } else {
                setDb(backupData);
                localStorage.setItem('sitara_crm_data', JSON.stringify(backupData));
                return { success: true, data: backupData };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, [apiAvailable, loadDataFromAPI, createManualBackup]);

    const deleteBackup = useCallback((backupKey) => {
        try {
            localStorage.removeItem(backupKey);
            const backupIndex = JSON.parse(localStorage.getItem('sitara_crm_backup_index') || '[]');
            const updatedIndex = backupIndex.filter(b => b.key !== backupKey);
            localStorage.setItem('sitara_crm_backup_index', JSON.stringify(updatedIndex));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, []);

    const cleanupOldBackups = useCallback((keepCount = 10) => {
        try {
            const backupIndex = JSON.parse(localStorage.getItem('sitara_crm_backup_index') || '[]');
            if (backupIndex.length <= keepCount) {
                return { success: true, deleted: 0 };
            }

            const sorted = [...backupIndex].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            const toDelete = sorted.slice(keepCount);
            toDelete.forEach(backup => {
                localStorage.removeItem(backup.key);
            });

            const updatedIndex = sorted.slice(0, keepCount);
            localStorage.setItem('sitara_crm_backup_index', JSON.stringify(updatedIndex));

            return { success: true, deleted: toDelete.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, []);

    const clearAllData = useCallback(async () => {
        try {
            if (apiAvailable) {
                // Clear all data from API
                await apiService.clearAllData();
                setDb(INITIAL_DB);
                await loadDataFromAPI();
            } else {
                setDb(INITIAL_DB);
                localStorage.removeItem('sitara_crm_data');
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, [apiAvailable, loadDataFromAPI]);

    // Storage info helper
    const getStorageInfo = useCallback(() => {
        try {
            let totalSize = 0;
            let itemCount = 0;
            const breakdown = {};

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                totalSize += size;
                itemCount++;

                if (key && key.startsWith('sitara_crm')) {
                    breakdown[key] = {
                        size: size,
                        sizeFormatted: `${(size / 1024).toFixed(2)} KB`
                    };
                }
            }

            const estimatedMax = 10 * 1024 * 1024;

            return {
                used: totalSize,
                usedFormatted: `${(totalSize / 1024).toFixed(2)} KB`,
                estimatedMax: estimatedMax,
                estimatedMaxFormatted: `${(estimatedMax / 1024 / 1024).toFixed(2)} MB`,
                percentUsed: ((totalSize / estimatedMax) * 100).toFixed(2),
                itemCount,
                breakdown,
                crmDataSize: breakdown['sitara_crm_data']?.size || 0,
                crmDataSizeFormatted: breakdown['sitara_crm_data']?.sizeFormatted || '0 KB'
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }, []);


    // Manual migration trigger
    const triggerMigration = useCallback(async () => {
        try {
            const hasLocalStorageData = localStorage.getItem('sitara_crm_data');
            if (!hasLocalStorageData) {
                alert('No data found in localStorage to migrate.');
                return { success: false, message: 'No localStorage data found' };
            }

            setMigrationStatus('migrating');
            const result = await migrateLocalStorageToDatabase();
            if (result.success) {
                localStorage.setItem('sitara_crm_migrated', 'true');
                setMigrationStatus('completed');
                console.log('✅ Migration completed:', result.stats);
                await loadDataFromAPI();
                alert(`Migration completed successfully!\n\n${JSON.stringify(result.stats, null, 2)}`);
                return result;
            } else {
                setMigrationStatus('failed');
                console.error('❌ Migration failed:', result.message);
                alert(`Migration failed: ${result.message}`);
                return result;
            }
        } catch (error) {
            setMigrationStatus('failed');
            console.error('❌ Migration error:', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    }, [loadDataFromAPI]);

    // ========== CONTEXT VALUE ==========
    const value = {
        // State
        db,
        loading,
        lastSaved,
        saveStatus,
        apiAvailable,
        migrationStatus,
        triggerMigration,

        // Data arrays
        customers: db?.customers || [],
        brokers: db?.brokers || [],
        companyReps: db?.companyReps || [],
        commissionPayments: db?.commissionPayments || [],
        projects: db?.projects || [],
        transactions: db?.projects || [],
        receipts: db?.receipts || [],
        interactions: db?.interactions || [],
        inventory: db?.inventory || [],
        masterProjects: db?.masterProjects || [],
        settings: db?.settings || INITIAL_DB.settings,

        // CRUD operations
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addBroker,
        updateBroker,
        deleteBroker,
        getBrokerFinancials,  // <-- ADDED: Missing function
        bulkImportBrokers,    // <-- ADDED: Missing function
        addProject,
        updateProject: async (id, updates) => {
            if (apiAvailable) {
                const result = await apiService.updateProject(id, updates);
                if (result.success && result.data) {
                    updateDb((prev) => ({
                        ...prev,
                        projects: (prev.projects || []).map((p) => p.id === id ? result.data : p)
                    }));
                }
            } else {
                updateDb((prev) => ({
                    ...prev,
                    projects: (prev.projects || []).map((p) =>
                        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
                    )
                }));
            }
        },
        deleteProject: async (id) => {
            if (apiAvailable) {
                const result = await apiService.deleteProject(id);
                if (result.success) {
                    updateDb((prev) => ({
                        ...prev,
                        projects: (prev.projects || []).filter((p) => p.id !== id)
                    }));
                }
            } else {
                updateDb((prev) => ({
                    ...prev,
                    projects: (prev.projects || []).filter((p) => p.id !== id)
                }));
            }
        },

        // Backup & Data Management
        exportData,
        exportToFile,
        createManualBackup,
        getBackupList,
        restoreFromBackup,
        deleteBackup,
        cleanupOldBackups,
        clearAllData,
        importBackup,
        refreshData: loadDataFromAPI,
        generateId,
        storageInfo: getStorageInfo(),

        // Getters
        getCustomer: useCallback((id) => {
            return (db.customers || []).find((c) => String(c.id) === String(id));
        }, [db.customers]),
        getBroker: useCallback((id) => {
            return (db.brokers || []).find((b) => String(b.id) === String(id));
        }, [db.brokers]),
        getProject: useCallback((id) => {
            return (db.projects || []).find((p) => String(p.id) === String(id));
        }, [db.projects]),
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>
                        {migrationStatus === 'migrating' ? '🔄 Migrating data...' : migrationStatus === 'completed' ? '✅ Migration complete! Loading...' : '📊 Loading CRM...'}
                    </div>
                    {migrationStatus === 'checking' && <div>Checking API connection...</div>}
                    {migrationStatus === 'migrating' && <div style={{ marginTop: '10px', fontSize: '14px' }}>Please wait, this may take a moment...</div>}
                    {migrationStatus === 'completed' && <div style={{ marginTop: '10px', fontSize: '14px' }}>Loading your data...</div>}
                </div>
            </div>
        );
    }

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) {
        throw new Error('useData must be used within a DataProvider');
    }
    return ctx;
}

export default DataContext;