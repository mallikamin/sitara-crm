import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ========== STORAGE KEYS ==========
const STORAGE_KEYS = {
  MAIN_DATA: 'sitara_crm_data',
  BACKUP_PREFIX: 'sitara_crm_backup_',
  BACKUP_INDEX: 'sitara_crm_backup_index',
  AUTO_BACKUP: 'sitara_crm_auto_backup',
  SETTINGS: 'sitara_crm_settings'
};

// ========== CONFIGURATION ==========
const CONFIG = {
  MAX_BACKUPS: 10,
  AUTO_BACKUP_INTERVAL: 300000,
  DEBOUNCE_SAVE_MS: 500,
  BACKUP_ON_CHANGES: 50,
};

// Initial database structure - NOW WITH INDEPENDENT BROKERS ARRAY
const INITIAL_DB = {
  version: '4.0', // Version bump for new structure
  customers: [],
  brokers: [],    // NEW: Independent brokers array
  companyReps: [], // NEW: Company representatives
  commissionPayments: [], // NEW: Track commission payments
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

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ========== STORAGE UTILITIES ==========
const StorageManager = {
  getStorageInfo: () => {
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
        
        if (key.startsWith('sitara_crm')) {
          breakdown[key] = {
            size: size,
            sizeFormatted: formatBytes(size)
          };
        }
      }
      
      const estimatedMax = 10 * 1024 * 1024;
      
      return {
        used: totalSize,
        usedFormatted: formatBytes(totalSize),
        estimatedMax: estimatedMax,
        estimatedMaxFormatted: formatBytes(estimatedMax),
        percentUsed: ((totalSize / estimatedMax) * 100).toFixed(2),
        itemCount,
        breakdown,
        crmDataSize: breakdown[STORAGE_KEYS.MAIN_DATA]?.size || 0,
        crmDataSizeFormatted: breakdown[STORAGE_KEYS.MAIN_DATA]?.sizeFormatted || '0 B'
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  },

  compress: (data) => JSON.stringify(data),
  decompress: (str) => JSON.parse(str),

  safeSave: (key, data) => {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return { success: true, size: new Blob([serialized]).size };
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded! Attempting cleanup...');
        StorageManager.cleanupOldBackups(5);
        try {
          localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
          return { success: true, size: new Blob([JSON.stringify(data)]).size, cleaned: true };
        } catch (retryError) {
          return { success: false, error: 'Storage full even after cleanup' };
        }
      }
      return { success: false, error: error.message };
    }
  },

  safeLoad: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return null;
    }
  },

  getBackupIndex: () => {
    try {
      const index = localStorage.getItem(STORAGE_KEYS.BACKUP_INDEX);
      return index ? JSON.parse(index) : [];
    } catch {
      return [];
    }
  },

  saveBackupIndex: (index) => {
    localStorage.setItem(STORAGE_KEYS.BACKUP_INDEX, JSON.stringify(index));
  },

  createBackup: (data, type = 'auto') => {
    const timestamp = new Date().toISOString();
    const backupKey = `${STORAGE_KEYS.BACKUP_PREFIX}${Date.now()}`;
    
    const backupData = {
      ...data,
      backupInfo: {
        timestamp,
        type,
        version: data.version || '4.0'
      }
    };
    
    const result = StorageManager.safeSave(backupKey, backupData);
    
    if (result.success) {
      const index = StorageManager.getBackupIndex();
      index.unshift({
        key: backupKey,
        timestamp,
        type,
        size: result.size,
        sizeFormatted: formatBytes(result.size),
        recordCounts: {
          customers: data.customers?.length || 0,
          brokers: data.brokers?.length || 0,
          projects: data.projects?.length || 0,
          receipts: data.receipts?.length || 0,
          inventory: data.inventory?.length || 0,
          interactions: data.interactions?.length || 0
        }
      });
      
      while (index.length > CONFIG.MAX_BACKUPS) {
        const removed = index.pop();
        localStorage.removeItem(removed.key);
      }
      
      StorageManager.saveBackupIndex(index);
      console.log(`✅ Backup created: ${type} - ${timestamp}`);
      return { success: true, key: backupKey, timestamp };
    }
    
    return { success: false, error: result.error };
  },

  restoreBackup: (backupKey) => {
    try {
      const backupData = StorageManager.safeLoad(backupKey);
      if (!backupData) {
        return { success: false, error: 'Backup not found' };
      }
      return { success: true, data: backupData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteBackup: (backupKey) => {
    try {
      localStorage.removeItem(backupKey);
      const index = StorageManager.getBackupIndex();
      const newIndex = index.filter(b => b.key !== backupKey);
      StorageManager.saveBackupIndex(newIndex);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  cleanupOldBackups: (keepCount = CONFIG.MAX_BACKUPS) => {
    const index = StorageManager.getBackupIndex();
    const toRemove = index.slice(keepCount);
    
    toRemove.forEach(backup => {
      localStorage.removeItem(backup.key);
    });
    
    StorageManager.saveBackupIndex(index.slice(0, keepCount));
    console.log(`🧹 Cleaned up ${toRemove.length} old backups`);
    return toRemove.length;
  },

  exportToFile: (data, filename = null) => {
    const exportData = {
      ...data,
      exportInfo: {
        exportedAt: new Date().toISOString(),
        version: data.version || '4.0',
        source: 'Sitara CRM'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `sitara_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, filename: a.download };
  },

  validateImportData: (data) => {
    const errors = [];
    const warnings = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format - must be a JSON object');
      return { valid: false, errors, warnings };
    }
    
    const requiredArrays = ['customers', 'projects', 'receipts', 'inventory'];
    requiredArrays.forEach(key => {
      if (data[key] && !Array.isArray(data[key])) {
        errors.push(`${key} must be an array`);
      }
    });
    
    const checkDuplicates = (arr, name) => {
      if (!arr) return;
      const ids = arr.map(item => item.id).filter(Boolean);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        warnings.push(`Found ${duplicates.length} duplicate IDs in ${name}`);
      }
    };
    
    checkDuplicates(data.customers, 'customers');
    checkDuplicates(data.brokers, 'brokers');
    checkDuplicates(data.projects, 'projects');
    checkDuplicates(data.receipts, 'receipts');
    checkDuplicates(data.inventory, 'inventory');
    
    if (data.version && parseFloat(data.version) > 4.0) {
      warnings.push(`Data is from a newer version (${data.version}). Some features may not work correctly.`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        customers: data.customers?.length || 0,
        brokers: data.brokers?.length || 0,
        projects: data.projects?.length || 0,
        receipts: data.receipts?.length || 0,
        inventory: data.inventory?.length || 0,
        interactions: data.interactions?.length || 0
      }
    };
  }
};

// ========== DATA MIGRATION: Move brokers from customers to brokers array ==========
const migrateData = (data) => {
  // ========== ALWAYS FIX COMMISSION RATES ==========
  // Fix old 2.5% commission rates to 1%
  if (Array.isArray(data.brokers)) {
    data.brokers = data.brokers.map(broker => {
      if (broker.commissionRate === 2.5) {
        console.log("📝 Fixing broker commission: " + broker.name + " 2.5% → 1%");
        return { ...broker, commissionRate: 1 };
      }
      return broker;
    });
  }
  
  // Fix commission rates in projects/transactions
  if (Array.isArray(data.projects)) {
    data.projects = data.projects.map(project => {
      const updates = {};
      if (project.brokerCommissionRate === 2.5) {
        updates.brokerCommissionRate = 1;
      }
      if (project.companyRepCommissionRate === 2.5) {
        updates.companyRepCommissionRate = 1;
      }
      if (Object.keys(updates).length > 0) {
        return { ...project, ...updates };
      }
      return project;
    });
  }
  
  // Fix settings default commission rate
  if (data.settings?.defaultCommissionRate === 2.5) {
    data.settings.defaultCommissionRate = 1;
  }
  if (data.settings?.commissionRate === 2.5) {
    data.settings.commissionRate = 1;
  }
  
  // If already migrated (has brokers array with data or version >= 4.0), skip main migration
  if (data.version === '4.0' && Array.isArray(data.brokers)) {
    return data;
  }
  
  const brokers = [];
  const customersToKeep = [];
  const brokerPhoneMap = new Map(); // To track phone -> brokerId mapping

  // Process all customers
  (data.customers || []).forEach(customer => {
    if (customer.type === 'broker') {
      // Pure broker - move to brokers array
      const broker = {
        id: customer.id.startsWith('broker_') ? customer.id : `broker_${customer.id.replace('cust_', '')}`,
        name: customer.name,
        phone: customer.phone,
        cnic: customer.cnic || '',
        email: customer.email || '',
        address: customer.address || '',
        company: customer.company || customer.companyName || '',
        commissionRate: parseFloat(customer.commissionRate) || 1,
        bankDetails: customer.bankDetails || '',
        notes: customer.notes || '',
        status: customer.status || 'active',
        createdAt: customer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      brokers.push(broker);
      brokerPhoneMap.set(customer.phone, broker.id);
      brokerPhoneMap.set(customer.id, broker.id); // Map old ID too
    } else if (customer.type === 'both') {
      // Both customer and broker - create entry in both arrays
      const broker = {
        id: `broker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: customer.name,
        phone: customer.phone,
        cnic: customer.cnic || '',
        email: customer.email || '',
        address: customer.address || '',
        company: customer.company || customer.companyName || '',
        commissionRate: parseFloat(customer.commissionRate) || 1,
        bankDetails: customer.bankDetails || '',
        notes: customer.notes || '',
        status: customer.status || 'active',
        linkedCustomerId: customer.id, // Link to customer record
        createdAt: customer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      brokers.push(broker);
      brokerPhoneMap.set(customer.phone, broker.id);
      brokerPhoneMap.set(customer.id, broker.id);

      // Keep as customer but change type to 'customer'
      customersToKeep.push({
        ...customer,
        type: 'customer',
        linkedBrokerId: broker.id, // Link to broker record
        updatedAt: new Date().toISOString()
      });
    } else {
      // Regular customer - keep as is
      customersToKeep.push({
        ...customer,
        type: customer.type || 'customer'
      });
    }
  });

  // Update projects to use new broker IDs
  const updatedProjects = (data.projects || []).map(project => {
    if (project.brokerId) {
      const newBrokerId = brokerPhoneMap.get(project.brokerId) || project.brokerId;
      return { ...project, brokerId: newBrokerId };
    }
    return project;
  });

  // Update interactions to include broker references
  const updatedInteractions = (data.interactions || []).map(interaction => {
    const updatedContacts = (interaction.contacts || []).map(contact => {
      if (contact.type === 'broker' && brokerPhoneMap.has(contact.id)) {
        return { ...contact, id: brokerPhoneMap.get(contact.id) };
      }
      return contact;
    });
    return { ...interaction, contacts: updatedContacts };
  });

  console.log(`✅ Migration complete: ${brokers.length} brokers extracted, ${customersToKeep.length} customers retained`);

  return {
    ...data,
    version: '4.0',
    customers: customersToKeep,
    brokers: brokers,
    projects: updatedProjects,
    interactions: updatedInteractions,
    lastUpdated: new Date().toISOString()
  };
};

// ========== LOAD DATA ==========
const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MAIN_DATA);
    if (stored) {
      let data = JSON.parse(stored);
      
      // ========== HANDLE ZUSTAND FORMAT ==========
      // Zustand persist wraps data as { state: {...}, version: 0 }
      if (data.state && typeof data.state === "object") {
        console.log("📦 Detected Zustand format, unwrapping...");
        data = data.state;
      }
      
      // Run migration if needed
      data = migrateData(data);
      
      console.log('📁 DataContext: Loaded from localStorage:', {
        customers: data.customers?.length || 0,
        brokers: data.brokers?.length || 0,
        projects: data.projects?.length || 0,
        receipts: data.receipts?.length || 0,
        inventory: data.inventory?.length || 0,
      });
      
      return {
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
          currency: 'PKR',
          currencySymbol: '₨',
          defaultCycle: 'quarterly',
          followUpDays: [1, 3, 7, 14, 30],
          defaultCommissionRate: 1,
          ...(data.settings || {})
        },
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        changeCount: data.changeCount || 0
      };
    }
    return INITIAL_DB;
  } catch (error) {
    console.error('❌ DataContext: Error loading data:', error);
    return INITIAL_DB;
  }
};

// ========== SAVE DATA ==========
const saveData = (data) => {
  try {
    const dataToSave = {
      ...data,
      version: '4.0',
      lastUpdated: new Date().toISOString()
    };
    const result = StorageManager.safeSave(STORAGE_KEYS.MAIN_DATA, dataToSave);
    if (result.success) {
      console.log('💾 DataContext: Saved to localStorage', result.size ? `(${formatBytes(result.size)})` : '');
    }
    return result.success;
  } catch (error) {
    console.error('❌ DataContext: Error saving data:', error);
    return false;
  }
};

// ========== CONTEXT ==========
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [db, setDb] = useState(INITIAL_DB);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [storageInfo, setStorageInfo] = useState(null);
  
  const changeCountRef = useRef(0);
  const autoBackupIntervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    const loadAppData = async () => {
      try {
        const loadedData = loadData();
        setDb(loadedData);
        setLastSaved(loadedData.lastUpdated || 'Never');
        changeCountRef.current = loadedData.changeCount || 0;
        setStorageInfo(StorageManager.getStorageInfo());
      } catch (error) {
        console.error('DataContext: Error loading data:', error);
        setDb(INITIAL_DB);
      } finally {
        setLoading(false);
      }
    };
    loadAppData();
    
    autoBackupIntervalRef.current = setInterval(() => {

      const currentDb = loadData(); 
      // Use current db state instead of loading from localStorage
      if (db && (db.customers?.length > 0 || db.brokers?.length > 0 || db.projects?.length > 0)) {
        StorageManager.createBackup(db, 'auto');
      }
    }, CONFIG.AUTO_BACKUP_INTERVAL);
    
    return () => {
      if (autoBackupIntervalRef.current) clearInterval(autoBackupIntervalRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Debounced save effect
  useEffect(() => {
    if (!loading && db) {
      setSaveStatus('saving');
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        const success = saveData(db);
        setSaveStatus(success ? 'saved' : 'error');
        setLastSaved(new Date().toISOString());
        setStorageInfo(StorageManager.getStorageInfo());
        
        if (changeCountRef.current > 0 && changeCountRef.current % CONFIG.BACKUP_ON_CHANGES === 0) {
          StorageManager.createBackup(db, 'auto');
        }
      }, CONFIG.DEBOUNCE_SAVE_MS);
    }
  }, [db, loading]);

  // ========== ID GENERATOR ==========
  const generateId = useCallback((prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ========== UPDATE DB WITH CHANGE TRACKING ==========
  // Update the updateDb function:
const updateDb = useCallback((updater) => {
  changeCountRef.current += 1;
  setDb((prev) => {
    const newDb = typeof updater === 'function' ? updater(prev) : updater;
    // Only update if something actually changed
    if (JSON.stringify(newDb) === JSON.stringify(prev)) {
      return prev; // No change, return same reference
    }
    return { ...newDb, changeCount: changeCountRef.current };
  });
}, []);

  // ========== CUSTOMER FUNCTIONS ==========
  const addCustomer = useCallback((customerData) => {
    const newCustomer = {
      ...customerData,
      id: customerData.id || generateId('cust'),
      type: 'customer', // Always customer now, brokers are separate
      status: customerData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateDb((prev) => ({
      ...prev,
      customers: [...(prev.customers || []), newCustomer]
    }));
    console.log('✅ Customer added:', newCustomer.name);
    return newCustomer;
  }, [generateId, updateDb]);

  const updateCustomer = useCallback((customerId, updates) => {
    updateDb((prev) => ({
      ...prev,
      customers: (prev.customers || []).map((c) =>
        c.id === customerId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    }));
  }, [updateDb]);

  const deleteCustomer = useCallback((customerId) => {
    updateDb((prev) => ({
      ...prev,
      customers: (prev.customers || []).filter((c) => c.id !== customerId)
    }));
  }, [updateDb]);

  // ========== BROKER FUNCTIONS (NEW) ==========
  const addBroker = useCallback((brokerData) => {
    // Check if phone already exists
    const existingBroker = db.brokers?.find(b => b.phone === brokerData.phone);
    if (existingBroker) {
      console.warn('⚠️ Broker with this phone already exists:', brokerData.phone);
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
    
    updateDb((prev) => ({
      ...prev,
      brokers: [...(prev.brokers || []), newBroker]
    }));
    console.log('✅ Broker added:', newBroker.name);
    return newBroker;
  }, [generateId, updateDb, db.brokers, db.settings]);

  const updateBroker = useCallback((brokerId, updates) => {
    updateDb((prev) => ({
      ...prev,
      brokers: (prev.brokers || []).map((b) =>
        b.id === brokerId ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
      )
    }));
    console.log('✅ Broker updated:', brokerId);
  }, [updateDb]);

  const deleteBroker = useCallback((brokerId) => {
    updateDb((prev) => ({
      ...prev,
      brokers: (prev.brokers || []).filter((b) => b.id !== brokerId)
    }));
    console.log('✅ Broker deleted:', brokerId);
  }, [updateDb]);

  const bulkImportBrokers = useCallback((brokersData) => {
    const results = { added: [], skipped: [], errors: [] };
    const existingPhones = new Set((db.brokers || []).map(b => b.phone));
    const newBrokers = [];

    brokersData.forEach((data, index) => {
      if (!data.name || !data.phone) {
        results.errors.push({ index, data, reason: 'Missing name or phone' });
        return;
      }

      if (existingPhones.has(data.phone)) {
        results.skipped.push({ index, data, reason: 'Phone already exists' });
        return;
      }

      const newBroker = {
        id: generateId('broker'),
        name: data.name.trim(),
        phone: data.phone.trim(),
        company: data.company?.trim() || '',
        cnic: data.cnic?.trim() || '',
        email: data.email?.trim() || '',
        address: data.address?.trim() || '',
        commissionRate: parseFloat(data.commissionRate) || db.settings?.defaultCommissionRate || 1,
        bankDetails: data.bankDetails || '',
        notes: data.notes || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newBrokers.push(newBroker);
      existingPhones.add(data.phone);
      results.added.push(newBroker);
    });

    if (newBrokers.length > 0) {
      updateDb((prev) => ({
        ...prev,
        brokers: [...(prev.brokers || []), ...newBrokers]
      }));
    }

    console.log(`✅ Bulk import: ${results.added.length} added, ${results.skipped.length} skipped, ${results.errors.length} errors`);
    return results;
  }, [generateId, updateDb, db.brokers, db.settings]);

  const getBroker = useCallback((brokerId) => {
    // Handle case where entire broker object is passed instead of ID
    let id = brokerId;
    if (brokerId && typeof brokerId === 'object') {
      console.warn('⚠️ getBroker received object instead of ID:', brokerId);
      console.trace('Stack trace for getBroker object call');
      id = brokerId.id || brokerId;
    }
    
    if (!id) {
      return null;
    }
    
    const result = (db.brokers || []).find((b) => String(b.id) === String(id));
    return result;
  }, [db.brokers]);


  const getBrokerByPhone = useCallback((phone) => {
    return (db.brokers || []).find((b) => b.phone === phone);
  }, [db.brokers]);

  const getBrokerDeals = useCallback((brokerId) => {
    return (db.projects || []).filter((p) => String(p.brokerId) === String(brokerId));
  }, [db.projects]);

  const getBrokerCustomers = useCallback((brokerId) => {
    const brokerDeals = getBrokerDeals(brokerId);
    const customerIds = [...new Set(brokerDeals.map(d => d.customerId).filter(Boolean))];
    return (db.customers || []).filter(c => customerIds.includes(c.id));
  }, [db.customers, getBrokerDeals]);

  const getBrokerInteractions = useCallback((brokerId) => {
    return (db.interactions || []).filter(i => 
      (i.contacts || []).some(c => String(c.id) === String(brokerId)) ||
      String(i.brokerId) === String(brokerId)
    );
  }, [db.interactions]);

  const getBrokerFinancials = useCallback((brokerId) => {
    const deals = getBrokerDeals(brokerId);
    const broker = getBroker(brokerId);

    let totalSales = 0, totalReceived = 0, totalReceivable = 0;
    let totalCommission = 0;
    
    deals.forEach(deal => {
      const sale = parseFloat(deal.sale) || parseFloat(deal.saleValue) || 0;
      const received = parseFloat(deal.received) || parseFloat(deal.totalReceived) || 0;
      
      totalSales += sale;
      totalReceived += received;
      
      // Use per-transaction commission rate (1% default)
      const rate = parseFloat(deal.brokerCommissionRate) || 1;
      totalCommission += (sale * rate) / 100;
    });
    
    // Get ACTUAL commission payments made to this broker (not based on customer payments)
    const brokerPayments = (db.commissionPayments || []).filter(
      p => p.recipientId === brokerId && p.recipientType === 'broker'
    );
    const commissionPaid = brokerPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    totalReceivable = totalSales - totalReceived;
    const commissionPending = totalCommission - commissionPaid;
    const collectionRate = totalSales > 0 ? (totalReceived / totalSales) * 100 : 0;
    const avgCommissionRate = totalSales > 0 ? (totalCommission / totalSales) * 100 : 1;

    return {
      totalDeals: deals.length,
      totalSales,
      totalReceived,
      totalReceivable,
      totalCommission,        // Total commission OWED (based on sales)
      commissionPaid,         // Commission actually PAID (from payments)
      commissionPending,      // Commission still PENDING (owed - paid)
      collectionRate,
      commissionRate: avgCommissionRate
    };
  }, [getBrokerDeals, getBroker, db.commissionPayments]);


  // ========== COMPANY REP FUNCTIONS (NEW) ==========
  const companyReps = db.companyReps || [];
  const commissionPayments = db.commissionPayments || [];

  const addCompanyRep = useCallback((repData) => {
    const newRep = {
      ...repData,
      id: repData.id || generateId('rep'),
      name: repData.name,
      phone: repData.phone,
      email: repData.email || '',
      department: repData.department || '',
      commissionRate: parseFloat(repData.commissionRate) || 1,
      status: repData.status || 'active',
      notes: repData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    updateDb((prev) => ({
      ...prev,
      companyReps: [...(prev.companyReps || []), newRep]
    }));
    console.log('✅ Company Rep added:', newRep.name);
    return newRep;
  }, [generateId, updateDb]);

  const updateCompanyRep = useCallback((repId, updates) => {
    updateDb((prev) => ({
      ...prev,
      companyReps: (prev.companyReps || []).map((rep) =>
        rep.id === repId ? { ...rep, ...updates, updatedAt: new Date().toISOString() } : rep
      )
    }));
    console.log('✅ Company Rep updated:', repId);
  }, [updateDb]);

  const deleteCompanyRep = useCallback((repId) => {
    updateDb((prev) => ({
      ...prev,
      companyReps: (prev.companyReps || []).filter((rep) => rep.id !== repId)
    }));
    console.log('✅ Company Rep deleted:', repId);
  }, [updateDb]);

  const getCompanyRep = useCallback((repId) => {
    return (db.companyReps || []).find((rep) => String(rep.id) === String(repId));
  }, [db.companyReps]);

  const getCompanyRepByPhone = useCallback((phone) => {
    return (db.companyReps || []).find((rep) => rep.phone === phone);
  }, [db.companyReps]);

  // ========== COMMISSION PAYMENT FUNCTIONS (NEW) ==========
  const addCommissionPayment = useCallback((paymentData) => {
    const newPayment = {
      ...paymentData,
      id: paymentData.id || generateId('cpay'),
      createdAt: new Date().toISOString()
    };
    
    updateDb((prev) => ({
      ...prev,
      commissionPayments: [...(prev.commissionPayments || []), newPayment]
    }));
    console.log('✅ Commission Payment recorded:', newPayment.amount);
    return newPayment;
  }, [generateId, updateDb]);

  const getCommissionPayments = useCallback((recipientId, recipientType) => {
    return (db.commissionPayments || []).filter(p => 
      p.recipientId === recipientId && p.recipientType === recipientType
    );
  }, [db.commissionPayments]);

  // ========== PROJECT FUNCTIONS ==========
  const addProject = useCallback((projectData) => {
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
    updateDb((prev) => ({
      ...prev,
      projects: [...(prev.projects || []), newProject]
    }));
    console.log('✅ Project added with broker:', {
      projectName: newProject.name,
      brokerId: newProject.brokerId,
      hasBroker: !!newProject.brokerId
    });
    return newProject;
  }, [generateId, updateDb]);

  const addTransaction = useCallback((transactionData) => {
    console.log('📝 addTransaction called with:', transactionData);
    const projectData = {
      ...transactionData,
      name: transactionData.name || `${transactionData.projectName} - ${transactionData.unitNumber}`,
      unit: transactionData.unitNumber || transactionData.unit,
      sale: parseFloat(transactionData.saleValue || transactionData.totalSale || transactionData.sale || 0),
      received: parseFloat(transactionData.totalReceived || transactionData.received || 0),
      receivable: parseFloat(transactionData.totalReceivable || transactionData.receivable || 0),
      cycle: transactionData.paymentCycle || transactionData.cycle || 'bi_annual',
      nextDue: transactionData.nextDueDate || transactionData.firstDueDate,
      brokerId: transactionData.brokerId || null, // Link to broker
    };
    const result = addProject(projectData);
    console.log('✅ Transaction created:', result);
    return result;
  }, [addProject]);

  const updateProject = useCallback((projectId, updates) => {
    updateDb((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) =>
        p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    }));
  }, [updateDb]);

  const deleteProject = useCallback((projectId) => {
    updateDb((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((p) => p.id !== projectId)
    }));
  }, [updateDb]);

  // ========== RECEIPT FUNCTIONS ==========
  const addReceipt = useCallback((receiptData) => {
    const newReceipt = {
      ...receiptData,
      id: receiptData.id || generateId('rcpt'),
      receiptNumber: receiptData.receiptNumber || `RCP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      amount: parseFloat(receiptData.amount) || 0,
      method: receiptData.method || 'cash',
      date: receiptData.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateDb((prev) => {
      let updatedProjects = prev.projects || [];
      if (newReceipt.projectId) {
        updatedProjects = updatedProjects.map((p) => {
          if (p.id === newReceipt.projectId) {
            const newReceived = (parseFloat(p.received) || 0) + newReceipt.amount;
            const sale = parseFloat(p.sale) || 0;
            return { ...p, received: newReceived, receivable: sale - newReceived, updatedAt: new Date().toISOString() };
          }
          return p;
        });
      }
      return {
        ...prev,
        receipts: [...(prev.receipts || []), newReceipt],
        projects: updatedProjects
      };
    });
    console.log('✅ Receipt added:', newReceipt.receiptNumber);
    return newReceipt;
  }, [generateId, updateDb]);

  const updateReceipt = useCallback((receiptId, updates) => {
    updateDb((prev) => ({
      ...prev,
      receipts: (prev.receipts || []).map((r) =>
        r.id === receiptId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      )
    }));
  }, [updateDb]);

  const deleteReceipt = useCallback((receiptId) => {
    updateDb((prev) => ({
      ...prev,
      receipts: (prev.receipts || []).filter((r) => r.id !== receiptId)
    }));
  }, [updateDb]);

  // ========== INVENTORY FUNCTIONS ==========
  const addInventoryItem = useCallback((itemData) => {
    const newItem = {
      ...itemData,
      id: itemData.id || generateId('inv'),
      status: itemData.status || 'available',
      totalValue: parseFloat(itemData.totalValue || itemData.saleValue || 0) ||
        (parseFloat(itemData.ratePerMarla || 0) * parseFloat(itemData.marlas || 0)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateDb((prev) => ({
      ...prev,
      inventory: [...(prev.inventory || []), newItem]
    }));
    console.log('✅ Inventory added:', newItem.projectName, newItem.unitShopNumber);
    return newItem;
  }, [generateId, updateDb]);

  const updateInventory = useCallback((inventoryId, updates) => {
    updateDb((prev) => ({
      ...prev,
      inventory: (prev.inventory || []).map((item) =>
        item.id === inventoryId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
    }));
    console.log('✅ Inventory updated:', inventoryId);
  }, [updateDb]);

  const deleteInventory = useCallback((inventoryId) => {
    updateDb((prev) => ({
      ...prev,
      inventory: (prev.inventory || []).filter((item) => item.id !== inventoryId)
    }));
    console.log('✅ Inventory deleted:', inventoryId);
  }, [updateDb]);

  const bulkImportInventory = useCallback((items) => {
    const newItems = items.map((item) => ({
      ...item,
      id: item.id || generateId('inv'),
      status: item.status || 'available',
      totalValue: parseFloat(item.totalValue || item.saleValue || 0) ||
        (parseFloat(item.ratePerMarla || 0) * parseFloat(item.marlas || 0)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    updateDb((prev) => ({
      ...prev,
      inventory: [...(prev.inventory || []), ...newItems]
    }));
    console.log('✅ Bulk import:', newItems.length, 'items');
    return newItems;
  }, [generateId, updateDb]);

  // ========== INTERACTION FUNCTIONS ==========
  const addInteraction = useCallback((interactionData) => {
    const newInteraction = {
      ...interactionData,
      id: interactionData.id || generateId('int'),
      status: interactionData.status || 'follow_up',
      priority: interactionData.priority || 'medium',
      date: interactionData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateDb((prev) => ({
      ...prev,
      interactions: [...(prev.interactions || []), newInteraction]
    }));
    return newInteraction;
  }, [generateId, updateDb]);

  const updateInteraction = useCallback((interactionId, updates) => {
    updateDb((prev) => ({
      ...prev,
      interactions: (prev.interactions || []).map((i) =>
        i.id === interactionId ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
      )
    }));
  }, [updateDb]);

  const deleteInteraction = useCallback((interactionId) => {
    updateDb((prev) => ({
      ...prev,
      interactions: (prev.interactions || []).filter((i) => i.id !== interactionId)
    }));
  }, [updateDb]);

  // ========== MASTER PROJECTS ==========
  const addMasterProject = useCallback((data) => {
    const newMasterProject = {
      ...data,
      id: data.id || generateId('mproj'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateDb((prev) => ({
      ...prev,
      masterProjects: [...(prev.masterProjects || []), newMasterProject]
    }));
    return newMasterProject;
  }, [generateId, updateDb]);

  // ========== BACKUP & IMPORT/EXPORT ==========
  const createManualBackup = useCallback(() => {
    return StorageManager.createBackup(db, 'manual');
  }, [db]);

  const getBackupList = useCallback(() => {
    return StorageManager.getBackupIndex();
  }, []);

  const restoreFromBackup = useCallback((backupKey) => {
    StorageManager.createBackup(db, 'pre-restore');
    
    const result = StorageManager.restoreBackup(backupKey);
    if (result.success) {
      let restoredData = migrateData(result.data); // Run migration on restored data
      setDb(restoredData);
      saveData(restoredData);
      changeCountRef.current = 0;
      setStorageInfo(StorageManager.getStorageInfo());
      return { success: true };
    }
    return result;
  }, [db]);

  const deleteBackup = useCallback((backupKey) => {
    const result = StorageManager.deleteBackup(backupKey);
    setStorageInfo(StorageManager.getStorageInfo());
    return result;
  }, []);

  const importBackup = useCallback((backupJson) => {


    console.log('📥 importBackup called with:', {
      isString: typeof backupJson === 'string',
      length: typeof backupJson === 'string' ? backupJson.length : 'not string'
    });

    try {
      // Parse the backup data
      const backupData = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson;
      
      console.log('📥 Importing backup data:', {
        version: backupData.version,
        customers: backupData.customers?.length,
        brokers: backupData.brokers?.length,
        projects: backupData.projects?.length,
        hasBackupInfo: !!backupData.backupInfo,
        hasExportInfo: !!backupData.exportInfo
      });
      
      // Handle different backup formats
      let dataToImport = backupData;
      
      // If it's a backup file with backupInfo, extract the actual data
      if (backupData.backupInfo) {
        // Remove backupInfo from data
        const { backupInfo, ...actualData } = backupData;
        dataToImport = actualData;
      }
      
      // If it's an export file with exportInfo
      if (backupData.exportInfo) {
        const { exportInfo, ...actualData } = backupData;
        dataToImport = actualData;
      }
      
      // Validate the data
      const validation = StorageManager.validateImportData(dataToImport);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }
      
      // Create backup before import
      StorageManager.createBackup(db, 'pre-import');
      
      // Migrate the data if needed
      let migratedData = migrateData({
        version: dataToImport.version || '3.2',
        customers: dataToImport.customers || [],
        brokers: dataToImport.brokers || [],
        companyReps: dataToImport.companyReps || [],
        commissionPayments: dataToImport.commissionPayments || [],
        projects: dataToImport.projects || [],
        receipts: dataToImport.receipts || [],
        interactions: dataToImport.interactions || [],
        inventory: dataToImport.inventory || [],
        masterProjects: dataToImport.masterProjects || [],
        settings: { ...INITIAL_DB.settings, ...(dataToImport.settings || {}) },
        lastUpdated: new Date().toISOString(),
        changeCount: 0
      });
      
      // Update the database
      setDb(migratedData);
      saveData(migratedData);
      changeCountRef.current = 0;
      setStorageInfo(StorageManager.getStorageInfo());
      
      console.log('✅ Backup imported successfully:', {
        customers: migratedData.customers?.length || 0,
        brokers: migratedData.brokers?.length || 0,
        projects: migratedData.projects?.length || 0,
        receipts: migratedData.receipts?.length || 0
      });
      
      return { 
        success: true, 
        data: migratedData,
        warnings: validation.warnings,
        stats: {
          customers: migratedData.customers?.length || 0,
          brokers: migratedData.brokers?.length || 0,
          projects: migratedData.projects?.length || 0,
          receipts: migratedData.receipts?.length || 0,
          inventory: migratedData.inventory?.length || 0,
          interactions: migratedData.interactions?.length || 0
        }
      };
    } catch (error) {
      console.error('❌ Import error:', error);
      return { 
        success: false, 
        error: error.message,
        details: 'Failed to parse or process the backup file'
      };
    }
  }, [db]);

  const exportData = useCallback(() => {
    console.log('📤 Exporting data:', {
      customers: db.customers?.length,
      brokers: db.brokers?.length,
      projects: db.projects?.length,
      version: db.version
    });
    return JSON.stringify({ ...db, exportDate: new Date().toISOString() }, null, 2);
  }, [db]);
  
  // In the exportToFile function:
  const exportToFile = useCallback((filename = null) => {
    console.log('📤 exportToFile called with db:', {
      hasDb: !!db,
      customers: db?.customers?.length,
      brokers: db?.brokers?.length
    });
    return StorageManager.exportToFile(db, filename);
  }, [db]);

  const refreshData = useCallback(() => {
    setLoading(true);
    const loadedData = loadData();
    setDb(loadedData);
    setLoading(false);
    setStorageInfo(StorageManager.getStorageInfo());
    return loadedData;
  }, []);

  const clearAllData = useCallback(() => {
    if (window.confirm('Are you sure you want to clear ALL data? This action cannot be undone unless you have a backup.')) {
      StorageManager.createBackup(db, 'pre-clear');
      
      setDb(INITIAL_DB);
      localStorage.removeItem(STORAGE_KEYS.MAIN_DATA);
      changeCountRef.current = 0;
      setStorageInfo(StorageManager.getStorageInfo());
      return true;
    }
    return false;
  }, [db]);

  const cleanupOldBackups = useCallback((keepCount) => {
    const count = StorageManager.cleanupOldBackups(keepCount);
    setStorageInfo(StorageManager.getStorageInfo());
    return count;
  }, []);

  // ========== COMPUTED VALUES ==========
  const customers = db?.customers || [];
  const brokers = db?.brokers || []; // Now independent array
  const projects = db?.projects || [];
  const transactions = projects;
  const receipts = db?.receipts || [];
  const interactions = db?.interactions || [];
  const inventory = db?.inventory || [];
  const masterProjects = db?.masterProjects || [];
  const settings = db?.settings || INITIAL_DB.settings;

  // ========== GETTER FUNCTIONS ==========
  const getCustomerProjects = useCallback((customerId) => {
    return projects.filter((p) => String(p.customerId) === String(customerId));
  }, [projects]);

  const getCustomerTransactions = useCallback((customerId) => {
    return projects.filter((p) => String(p.customerId) === String(customerId));
  }, [projects]);

  const getCustomerReceipts = useCallback((customerId) => {
    return receipts.filter((r) => String(r.customerId) === String(customerId));
  }, [receipts]);

  const getProjectReceipts = useCallback((projectId) => {
    return receipts.filter((r) => String(r.projectId) === String(projectId));
  }, [receipts]);

  const getCustomer = useCallback((customerId) => {
    return customers.find((c) => String(c.id) === String(customerId));
  }, [customers]);

  const getProject = useCallback((projectId) => {
    return projects.find((p) => String(p.id) === String(projectId));
  }, [projects]);

  const getTransaction = useCallback((projectId) => {
    return projects.find((p) => String(p.id) === String(projectId));
  }, [projects]);

  const getInteractionsForContact = useCallback((contactId) => {
    return interactions.filter((i) => 
      String(i.customerId) === String(contactId) ||
      (i.contacts || []).some(c => String(c.id) === String(contactId))
    );
  }, [interactions]);

  const getCustomerInteractions = useCallback((customerId) => {
    return interactions.filter((i) => 
      String(i.customerId) === String(customerId) ||
      (i.contacts || []).some(c => String(c.id) === String(customerId))
    );
  }, [interactions]);

  const getProjectInteractions = useCallback((projectId) => {
    return interactions.filter((i) => String(i.projectId) === String(projectId));
  }, [interactions]);

  const getCustomerInventory = useCallback((customerId) => {
    return inventory.filter((i) => String(i.customerId) === String(customerId));
  }, [inventory]);

  const getProjectInventory = useCallback((projectName) => {
    return inventory.filter((i) => i.projectName === projectName || i.project === projectName);
  }, [inventory]);

  const calculateOverallFinancials = useCallback(() => {
    const totalSale = projects.reduce((sum, p) => sum + (parseFloat(p.sale) || 0), 0);
    const totalReceived = projects.reduce((sum, p) => sum + (parseFloat(p.received) || 0), 0);
    const totalReceivable = totalSale - totalReceived;
    const totalReceipts = receipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    return {
      totalSale,
      totalReceived,
      totalReceivable,
      totalReceipts,
      projectCount: projects.length,
      customerCount: customers.length,
      brokerCount: brokers.length,
      receiptCount: receipts.length,
      inventoryStats: {
        total: inventory.length,
        available: inventory.filter((i) => i.status === 'available').length,
        sold: inventory.filter((i) => i.status === 'sold').length,
        reserved: inventory.filter((i) => i.status === 'reserved').length,
        blocked: inventory.filter((i) => i.status === 'blocked').length,
      }
    };
  }, [projects, receipts, customers, brokers, inventory]);

  const getOverdueInstallments = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = [];
    projects.forEach((project) => {
      if (project.installments && Array.isArray(project.installments)) {
        project.installments.forEach((installment) => {
          if (!installment.paid && installment.dueDate) {
            const dueDate = new Date(installment.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
              const customer = customers.find((c) => c.id === project.customerId);
              overdue.push({
                ...installment,
                projectId: project.id,
                projectName: project.name,
                projectUnit: project.unit,
                customerId: project.customerId,
                customerName: customer?.name || 'Unknown'
              });
            }
          }
        });
      }
    });
    return overdue;
  }, [projects, customers]);

  // ========== CONTEXT VALUE ==========
  const value = {
    // State
    db,
    loading,
    lastSaved,
    saveStatus,
    storageInfo,
    
    // Data arrays
    customers,
    brokers, // Now independent
    companyReps, // NEW: Company representatives
    commissionPayments, // NEW: Commission payments
    projects,
    transactions,
    receipts,
    interactions,
    inventory,
    masterProjects,
    settings,
    
    // Computed
    calculateOverallFinancials,
    getOverdueInstallments,
    
    // Customer Getters
    getCustomerProjects,
    getCustomerTransactions,
    getCustomerReceipts,
    getCustomer,
    getInteractionsForContact,
    getCustomerInteractions,
    getCustomerInventory,
    
    // Project Getters
    getProjectReceipts,
    getProject,
    getTransaction,
    getProjectInteractions,
    getProjectInventory,
    
    // Broker Getters (NEW)
    getBroker,
    getBrokerByPhone,
    getBrokerDeals,
    getBrokerCustomers,
    getBrokerInteractions,
    getBrokerFinancials,
    
    // Customer CRUD
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Broker CRUD (NEW)
    addBroker,
    updateBroker,
    deleteBroker,
    bulkImportBrokers,
    
    // Company Rep CRUD (NEW)
    addCompanyRep,
    updateCompanyRep,
    deleteCompanyRep,
    getCompanyRep,
    getCompanyRepByPhone,
    
    // Commission Payment CRUD (NEW)
    addCommissionPayment,
    getCommissionPayments,
    
    // Project/Transaction CRUD
    addProject,
    updateProject,
    deleteProject,
    addTransaction,
    updateTransaction: updateProject,
    deleteTransaction: deleteProject,
    
    // Receipt CRUD
    addReceipt,
    updateReceipt,
    deleteReceipt,
    
    // Interaction CRUD
    addInteraction,
    updateInteraction,
    deleteInteraction,
    
    // Inventory CRUD
    addInventoryItem,
    updateInventory,
    deleteInventory,
    bulkImportInventory,
    
    // Master Projects
    addMasterProject,
    
    // Backup & Data Management
    createManualBackup,
    getBackupList,
    restoreFromBackup,
    deleteBackup,
    cleanupOldBackups,
    refreshData,
    importBackup,
    exportData,
    exportToFile,
    clearAllData,
    generateId,
    
    // Storage utilities
    StorageManager
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>📊 Loading CRM...</div>
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

export { INITIAL_DB, StorageManager, formatBytes };
export default DataContext;