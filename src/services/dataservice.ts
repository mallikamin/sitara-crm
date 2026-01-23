/**
 * CRM Data Persistence Service v4.0
 * 
 * Handles localStorage persistence, backup/restore, smart data import,
 * bulk broker/transaction uploads, and commission payment tracking
 */

import { 
  CRMData, Customer, Project, Receipt, Interaction, InventoryItem, MasterProject, Settings,
  Broker, CommissionPayment, ExcelBrokerItem, ExcelTransactionItem
} from '../types/crm'
import * as XLSX from 'xlsx'

const STORAGE_KEY = 'sitara_crm_data';
const BACKUP_PREFIX = 'sitara_crm_backup_';
const AUTO_BACKUP_KEY = 'sitara_crm_auto_backup';
const VERSION = '4.0';  // UPDATED for bulk import + company rep

// Default settings - COMMISSION CHANGED FROM 2.5% TO 1%
const defaultSettings: Settings = {
  currency: 'PKR',
  defaultCycle: 'quarterly',
  followUpDays: [1, 3, 7, 14, 30],
  commissionRate: 1,  // CHANGED from 2.5
  defaultBrokerCommission: 1,
  defaultCompanyRepCommission: 1,
}

// Default empty data structure
const getDefaultData = (): CRMData => ({
  version: VERSION,
  customers: [],
  projects: [],
  brokers: [],  // ADDED
  interactions: [],
  receipts: [],
  inventory: [],
  masterProjects: [],
  commissionPayments: [],  // ADDED
  settings: defaultSettings,
  lastUpdated: null,
})

/**
 * Field definitions for each entity type
 * Used to filter and validate imported data
 */
const ENTITY_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  customers: {
    required: ['id', 'name', 'type', 'status', 'createdAt'],
    optional: ['cnic', 'phone', 'email', 'company', 'address', 'updatedAt', 'linkedBrokerId'],
  },
  projects: {
    required: ['id', 'customerId', 'name', 'unit', 'sale', 'received', 'status', 'createdAt'],
    optional: ['brokerId', 'brokerCommissionRate', 'companyRepId', 'companyRepCommissionRate', 'marlas', 'rate', 'cycle', 'notes', 'installments', 'updatedAt', 'balance', 'overdue'],
  },
  receipts: {
    required: ['id', 'customerId', 'projectId', 'amount', 'date', 'method', 'createdAt'],
    optional: ['installmentId', 'reference', 'notes', 'receiptNumber', 'customerName', 'projectName', 'updatedAt'],
  },
  interactions: {
    required: ['id', 'contactType', 'type', 'status', 'priority', 'date', 'createdAt'],
    optional: ['customerId', 'brokerId', 'notes', 'nextFollowUp', 'contacts', 'updatedAt'],
  },
  inventory: {
    required: ['id', 'projectName', 'status', 'createdAt'],
    optional: ['block', 'unitShopNumber', 'unit', 'unitType', 'marlas', 'ratePerMarla', 'totalValue', 'saleValue', 'plotFeatures', 'plotFeature', 'transactionId', 'updatedAt'],
  },
  masterProjects: {
    required: ['id', 'name', 'createdAt'],
    optional: ['description', 'location', 'totalUnits', 'availableUnits', 'soldUnits', 'reservedUnits', 'blockedUnits', 'totalSaleValue', 'totalReceived', 'totalReceivable', 'totalOverdue', 'totalBrokerCommission', 'totalBrokerCommissionPaid', 'totalCompanyRepCommission', 'totalCompanyRepCommissionPaid', 'updatedAt'],
  },
  brokers: {
    required: ['id', 'name', 'phone', 'cnic', 'status', 'createdAt'],
    optional: ['email', 'address', 'company', 'commissionRate', 'bankDetails', 'notes', 'linkedCustomerId', 'updatedAt'],
  },
  commissionPayments: {
    required: ['id', 'projectId', 'recipientId', 'recipientType', 'recipientName', 'amount', 'paidAmount', 'remainingAmount', 'status', 'createdAt'],
    optional: ['paymentDate', 'paymentMethod', 'paymentReference', 'notes', 'updatedAt'],
  },
};

/**
 * Filter and validate entity data, keeping only known fields
 */
function filterEntityFields<T extends Record<string, any>>(
  entity: T,
  entityType: keyof typeof ENTITY_FIELDS
): T | null {
  const fieldDef = ENTITY_FIELDS[entityType];
  if (!fieldDef) return entity;

  // Check required fields
  const hasAllRequired = fieldDef.required.every(field => entity[field] !== undefined);
  if (!hasAllRequired) {
    console.warn(`Entity missing required fields:`, entityType, entity);
    return null;
  }

  // Build filtered entity with only known fields
  const allFields = [...fieldDef.required, ...fieldDef.optional];
  const filtered: Record<string, any> = {};

  allFields.forEach(field => {
    if (entity[field] !== undefined) {
      filtered[field] = entity[field];
    }
  });

  // Preserve nested objects (installments, contacts)
  if (entityType === 'projects' && entity.installments) {
    filtered.installments = entity.installments;
  }
  if (entityType === 'interactions' && entity.contacts) {
    filtered.contacts = entity.contacts;
  }

  return filtered as T;
}

/**
 * Enrich receipts with denormalized data
 */
function enrichReceipts(receipts: Receipt[], customers: Customer[], projects: Project[]): Receipt[] {
  return receipts.map((receipt, index) => {
    const customer = customers.find(c => c.id === receipt.customerId);
    const project = projects.find(p => p.id === receipt.projectId);
    
    return {
      ...receipt,
      customerName: receipt.customerName || customer?.name || '',
      projectName: receipt.projectName || (project ? `${project.name} - ${project.unit}` : ''),
      receiptNumber: receipt.receiptNumber || generateReceiptNumber(receipt.createdAt || receipt.date, index),
    };
  });
}

/**
 * Generate receipt number from date
 */
function generateReceiptNumber(dateStr: string, index: number): string {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `RCP-${year}${month}-${(index + 1).toString().padStart(4, '0')}`;
  } catch {
    return `RCP-${Date.now()}-${index + 1}`;
  }
}

/**
 * Migrate data from old backup format
 */
function migrateFromLegacyBackup(backupData: any): CRMData {
  console.log('Migrating from legacy backup format...');
  
  const migratedData = getDefaultData();
  
  // Migrate customers
  if (Array.isArray(backupData.customers)) {
    migratedData.customers = backupData.customers.map((customer: any) => ({
      id: customer.id || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customer.name || '',
      cnic: customer.cnic || '',
      phone: customer.phone || '',
      email: customer.email || '',
      company: customer.company || '',
      address: customer.address || '',
      type: customer.type || 'customer',
      status: customer.status || 'active',
      linkedBrokerId: customer.linkedBrokerId,
      createdAt: customer.createdAt || new Date().toISOString(),
      updatedAt: customer.updatedAt || customer.createdAt || new Date().toISOString(),
    }));
  }
  
  // Migrate brokers - ENSURE 1% commission
  if (Array.isArray(backupData.brokers)) {
    migratedData.brokers = backupData.brokers.map((broker: any) => ({
      id: broker.id || `broker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: broker.name || '',
      phone: broker.phone || '',
      cnic: broker.cnic || '',
      email: broker.email,
      address: broker.address,
      company: broker.company,
      commissionRate: broker.commissionRate === 2.5 ? 1 : (broker.commissionRate || 1),  // Convert 2.5% to 1%
      bankDetails: broker.bankDetails,
      notes: broker.notes,
      status: broker.status || 'active',
      linkedCustomerId: broker.linkedCustomerId,
      createdAt: broker.createdAt || new Date().toISOString(),
      updatedAt: broker.updatedAt || broker.createdAt || new Date().toISOString(),
    }));
  }
  
  // Migrate projects - ADD commission fields
  if (Array.isArray(backupData.projects)) {
    migratedData.projects = backupData.projects.map((project: any) => ({
      id: project.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: project.customerId || '',
      brokerId: project.brokerId,
      brokerCommissionRate: project.brokerCommissionRate || 1,  // NEW
      companyRepId: project.companyRepId,  // NEW
      companyRepCommissionRate: project.companyRepCommissionRate || 1,  // NEW
      name: project.name || 'Sitara Square',
      unit: project.unit || '',
      marlas: project.marlas || 0,
      rate: project.rate || 0,
      sale: project.sale || 0,
      received: project.received || 0,
      status: project.status || 'active',
      cycle: project.cycle || 'bi_annual',
      notes: project.notes || '',
      installments: project.installments || [],
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
    }));
  }
  
  // Migrate receipts
  if (Array.isArray(backupData.receipts)) {
    migratedData.receipts = backupData.receipts.map((receipt: any) => ({
      id: receipt.id || `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: receipt.customerId || '',
      projectId: receipt.projectId || '',
      installmentId: receipt.installmentId || null,
      amount: receipt.amount || 0,
      date: receipt.date || new Date().toISOString(),
      method: receipt.method || 'cash',
      reference: receipt.reference || '',
      notes: receipt.notes || '',
      createdAt: receipt.createdAt || new Date().toISOString(),
      updatedAt: receipt.updatedAt || receipt.createdAt || new Date().toISOString(),
    }));
  }
  
  // Migrate interactions
  if (Array.isArray(backupData.interactions)) {
    migratedData.interactions = backupData.interactions.map((interaction: any) => ({
      id: interaction.id || `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactType: interaction.contactType || 'customer',
      customerId: interaction.customerId || null,
      brokerId: interaction.brokerId || null,
      type: interaction.type || 'call',
      status: interaction.status || 'follow_up',
      priority: interaction.priority || 'medium',
      date: interaction.date || new Date().toISOString(),
      notes: interaction.notes || '',
      nextFollowUp: interaction.nextFollowUp || null,
      contacts: interaction.contacts,
      createdAt: interaction.createdAt || new Date().toISOString(),
      updatedAt: interaction.updatedAt || interaction.createdAt || new Date().toISOString(),
    }));
  }
  
  // Migrate inventory
  if (Array.isArray(backupData.inventory)) {
    migratedData.inventory = backupData.inventory;
  }
  
  // Migrate master projects
  if (Array.isArray(backupData.masterProjects)) {
    migratedData.masterProjects = backupData.masterProjects;
  }
  
  // Initialize commission payments for existing projects
  migratedData.commissionPayments = [];
  migratedData.projects.forEach(project => {
    if (project.brokerId && project.brokerCommissionRate) {
      const brokerCommissionTotal = (project.sale * project.brokerCommissionRate) / 100
      const broker = migratedData.brokers.find(b => b.id === project.brokerId)
      migratedData.commissionPayments.push({
        id: `cpay_migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId: project.id,
        recipientId: project.brokerId,
        recipientType: 'broker',
        recipientName: broker?.name || 'Unknown Broker',
        amount: brokerCommissionTotal,
        paidAmount: 0,
        remainingAmount: brokerCommissionTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  })
  
  // Settings with 1% commission
  if (backupData.settings) {
    migratedData.settings = {
      ...defaultSettings,
      ...backupData.settings,
      commissionRate: 1,
      defaultBrokerCommission: 1,
      defaultCompanyRepCommission: 1,
    };
  }
  
  // Enrich receipts
  migratedData.receipts = enrichReceipts(migratedData.receipts, migratedData.customers, migratedData.projects);
  
  console.log('Migration complete:', {
    customers: migratedData.customers.length,
    brokers: migratedData.brokers.length,
    projects: migratedData.projects.length,
    receipts: migratedData.receipts.length,
    interactions: migratedData.interactions.length,
    commissionPayments: migratedData.commissionPayments.length,
  });
  
  return migratedData;
}

/**
 * Load data from localStorage with legacy migration support
 */
export function loadData(): CRMData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('No stored data found, returning defaults');
      return getDefaultData();
    }

    const data = JSON.parse(stored) as any;
    
    // Check if needs migration
    if (data && data.version && data.version !== VERSION) {
      console.log(`Migrating from ${data.version} to ${VERSION}`);
      return migrateFromLegacyBackup(data);
    }
    
    // Already has structure
    if (data && data.version && Array.isArray(data.customers) && Array.isArray(data.projects)) {
      const migratedData = {
        ...getDefaultData(),
        ...data,
        customers: data.customers || [],
        projects: data.projects || [],
        brokers: data.brokers || [],
        receipts: data.receipts || [],
        interactions: data.interactions || [],
        inventory: data.inventory || [],
        masterProjects: data.masterProjects || [],
        commissionPayments: data.commissionPayments || [],
        settings: { ...defaultSettings, ...data.settings },
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
      
      migratedData.receipts = enrichReceipts(migratedData.receipts, migratedData.customers, migratedData.projects);
      
      console.log(`Loaded CRM data: ${migratedData.customers?.length || 0} customers, ${migratedData.projects?.length || 0} projects`);
      return migratedData;
    }
    
    // Legacy format without version
    if (data && !data.version) {
      console.log('Detected legacy format, migrating...');
      return migrateFromLegacyBackup(data);
    }
    
    return {
      ...getDefaultData(),
      ...data,
      customers: data.customers || [],
      projects: data.projects || [],
      brokers: data.brokers || [],
      receipts: data.receipts || [],
      interactions: data.interactions || [],
      inventory: data.inventory || [],
      masterProjects: data.masterProjects || [],
      commissionPayments: data.commissionPayments || [],
      settings: { ...defaultSettings, ...data.settings },
    };
    
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    return getDefaultData();
  }
}

/**
 * Save data to localStorage with auto-backup
 */
export function saveData(data: CRMData): boolean {
  try {
    const dataToSave: CRMData = {
      ...data,
      version: VERSION,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({
      ...dataToSave,
      backupDate: new Date().toISOString(),
    }));

    console.log(`Saved CRM data: ${data.customers?.length || 0} customers, ${data.projects?.length || 0} projects`);
    return true;
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    return false;
  }
}

/**
 * Direct import of backup file
 */
export function importBackupFile(backupJson: string): boolean {
  try {
    console.log('Importing backup file...');
    const backupData = JSON.parse(backupJson);
    const migratedData = migrateFromLegacyBackup(backupData);
    const saved = saveData(migratedData);
    
    if (saved) {
      console.log('Backup imported successfully!');
      console.log(`- Customers: ${migratedData.customers.length}`);
      console.log(`- Brokers: ${migratedData.brokers.length}`);
      console.log(`- Projects: ${migratedData.projects.length}`);
      console.log(`- Receipts: ${migratedData.receipts.length}`);
      console.log(`- Interactions: ${migratedData.interactions.length}`);
    }
    
    return saved;
  } catch (error) {
    console.error('Error importing backup:', error);
    return false;
  }
}

/**
 * Create a named backup
 */
export function createBackup(name?: string): string {
  const data = loadData();
  const backupName = name || `backup_${new Date().toISOString().split('T')[0]}`;
  const backupKey = `${BACKUP_PREFIX}${backupName}`;
  
  localStorage.setItem(backupKey, JSON.stringify({
    ...data,
    backupDate: new Date().toISOString(),
    backupName,
  }));

  return backupName;
}

/**
 * List all backups
 */
export function listBackups(): { key: string; name: string; date: string }[] {
  const backups: { key: string; name: string; date: string }[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BACKUP_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        backups.push({
          key,
          name: data.backupName || key.replace(BACKUP_PREFIX, ''),
          date: data.backupDate || 'Unknown',
        });
      } catch {
        // Skip invalid backups
      }
    }
  }

  return backups.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Restore from a backup
 */
export function restoreBackup(backupKey: string): boolean {
  try {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      console.error('Backup not found:', backupKey);
      return false;
    }

    const data = JSON.parse(backupData) as CRMData;
    return saveData(data);
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

/**
 * Export data as JSON file
 */
export function exportData(): string {
  const data = loadData();
  const exportData = {
    ...data,
    exportDate: new Date().toISOString(),
    exportVersion: VERSION,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Smart import with field filtering
 */
export interface ImportOptions {
  mode: 'replace' | 'merge';
  skipDuplicates?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    customers: number;
    projects: number;
    brokers: number;
    receipts: number;
    interactions: number;
    inventory: number;
    masterProjects: number;
    commissionPayments: number;
  };
  skipped: {
    customers: number;
    projects: number;
    brokers: number;
    receipts: number;
    interactions: number;
    inventory: number;
    masterProjects: number;
    commissionPayments: number;
  };
  errors: string[];
}

export function importData(jsonString: string, options: ImportOptions = { mode: 'replace' }): ImportResult {
  const result: ImportResult = {
    success: false,
    imported: { customers: 0, projects: 0, brokers: 0, receipts: 0, interactions: 0, inventory: 0, masterProjects: 0, commissionPayments: 0 },
    skipped: { customers: 0, projects: 0, brokers: 0, receipts: 0, interactions: 0, inventory: 0, masterProjects: 0, commissionPayments: 0 },
    errors: [],
  };

  try {
    const importedData = JSON.parse(jsonString);
    console.log('Importing data version:', importedData.version);

    // Legacy format migration
    if (importedData.version && Array.isArray(importedData.customers) && Array.isArray(importedData.projects)) {
      const migratedData = migrateFromLegacyBackup(importedData);
      const saved = saveData(migratedData);
      
      if (saved) {
        result.success = true;
        result.imported.customers = migratedData.customers.length;
        result.imported.brokers = migratedData.brokers.length;
        result.imported.projects = migratedData.projects.length;
        result.imported.receipts = migratedData.receipts.length;
        result.imported.interactions = migratedData.interactions.length;
        result.imported.commissionPayments = migratedData.commissionPayments.length;
      }
      
      return result;
    }

    // Get existing data for merge mode
    const existingData = options.mode === 'merge' ? loadData() : getDefaultData();
    const existingIds = {
      customers: new Set(existingData.customers.map(c => c.id)),
      projects: new Set(existingData.projects.map(p => p.id)),
      brokers: new Set(existingData.brokers.map(b => b.id)),
      receipts: new Set(existingData.receipts.map(r => r.id)),
      interactions: new Set(existingData.interactions.map(i => i.id)),
      inventory: new Set(existingData.inventory.map(i => i.id)),
      masterProjects: new Set(existingData.masterProjects.map(m => m.id)),
      commissionPayments: new Set(existingData.commissionPayments.map(cp => cp.id)),
    };

    // Process all entities with filtering
    const processEntity = <T extends { id: string }>(
      items: any[],
      entityType: keyof typeof ENTITY_FIELDS,
      existing: T[],
      existingIdSet: Set<string>
    ): { processed: T[], imported: number, skipped: number } => {
      const processed: T[] = options.mode === 'merge' ? [...existing] : [];
      let imported = 0, skipped = 0;
      
      items.forEach((item: any) => {
        const filtered = filterEntityFields(item, entityType);
        if (filtered) {
          if (options.skipDuplicates && existingIdSet.has(filtered.id)) {
            skipped++;
          } else {
            const existingIndex = processed.findIndex(e => e.id === filtered.id);
            if (existingIndex >= 0) {
              processed[existingIndex] = filtered as T;
            } else {
              processed.push(filtered as T);
            }
            imported++;
          }
        } else {
          skipped++;
        }
      });
      
      return { processed, imported, skipped };
    };

    const customersResult = processEntity(importedData.customers || [], 'customers', existingData.customers, existingIds.customers);
    const brokersResult = processEntity(importedData.brokers || [], 'brokers', existingData.brokers, existingIds.brokers);
    const projectsResult = processEntity(importedData.projects || [], 'projects', existingData.projects, existingIds.projects);
    const receiptsResult = processEntity(importedData.receipts || [], 'receipts', existingData.receipts, existingIds.receipts);
    const interactionsResult = processEntity(importedData.interactions || [], 'interactions', existingData.interactions, existingIds.interactions);
    const inventoryResult = processEntity(importedData.inventory || [], 'inventory', existingData.inventory, existingIds.inventory);
    const masterProjectsResult = processEntity(importedData.masterProjects || [], 'masterProjects', existingData.masterProjects, existingIds.masterProjects);
    const commissionPaymentsResult = processEntity(importedData.commissionPayments || [], 'commissionPayments', existingData.commissionPayments, existingIds.commissionPayments);

    result.imported.customers = customersResult.imported;
    result.imported.brokers = brokersResult.imported;
    result.imported.projects = projectsResult.imported;
    result.imported.receipts = receiptsResult.imported;
    result.imported.interactions = interactionsResult.imported;
    result.imported.inventory = inventoryResult.imported;
    result.imported.masterProjects = masterProjectsResult.imported;
    result.imported.commissionPayments = commissionPaymentsResult.imported;
    
    result.skipped.customers = customersResult.skipped;
    result.skipped.brokers = brokersResult.skipped;
    result.skipped.projects = projectsResult.skipped;
    result.skipped.receipts = receiptsResult.skipped;
    result.skipped.interactions = interactionsResult.skipped;
    result.skipped.inventory = inventoryResult.skipped;
    result.skipped.masterProjects = masterProjectsResult.skipped;
    result.skipped.commissionPayments = commissionPaymentsResult.skipped;

    // Enrich receipts
    const enrichedReceipts = enrichReceipts(receiptsResult.processed, customersResult.processed, projectsResult.processed);

    // Build final data
    const finalData: CRMData = {
      version: VERSION,
      customers: customersResult.processed,
      projects: projectsResult.processed,
      brokers: brokersResult.processed,
      receipts: enrichedReceipts,
      interactions: interactionsResult.processed,
      inventory: inventoryResult.processed,
      masterProjects: masterProjectsResult.processed,
      commissionPayments: commissionPaymentsResult.processed,
      settings: { ...defaultSettings, ...importedData.settings },
      lastUpdated: new Date().toISOString(),
    };

    const saved = saveData(finalData);
    if (!saved) {
      result.errors.push('Failed to save imported data to localStorage');
      return result;
    }

    result.success = true;
    console.log('Import successful:', result);
    return result;

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Import error:', error);
    return result;
  }
}

/**
 * Clear all data with confirmation backup
 */
export function clearAllData(): boolean {
  try {
    createBackup('pre_clear_backup');
    localStorage.removeItem(STORAGE_KEY);
    console.log('All data cleared (backup created)');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}

/**
 * Get storage usage stats
 */
export function getStorageStats(): { used: number; available: number; percentage: number } {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += (localStorage.getItem(key) || '').length * 2;
    }
  }
  
  const available = 5 * 1024 * 1024;
  const percentage = (used / available) * 100;
  
  return { used, available, percentage };
}

/**
 * Test function
 */
export function testDataLoading() {
  console.log('Testing data loading...');
  const data = loadData();
  console.log('Loaded data:', data);
  console.log('Stats:', getStorageStats());
}

// ============================================================================
// NEW: BULK IMPORT FUNCTIONS FOR BROKERS AND TRANSACTIONS
// ============================================================================

const parseBrokerExcel = (file: File): Promise<ExcelBrokerItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        const brokers: ExcelBrokerItem[] = jsonData.map((row: any) => ({
          'Name': row['Name'] || row['name'] || '',
          'Phone': row['Phone'] || row['phone'] || '',
          'CNIC': row['CNIC'] || row['cnic'] || '',
          'Email': row['Email'] || row['email'],
          'Address': row['Address'] || row['address'],
          'Company': row['Company'] || row['company'],
          'Commission Rate %': parseFloat(row['Commission Rate %'] || row['commission'] || '1'),
          'Bank Details': row['Bank Details'] || row['bank'],
          'Status': (row['Status'] || row['status'] || 'active').toLowerCase() as 'active' | 'inactive',
          'Notes': row['Notes'] || row['notes'],
        }))
        resolve(brokers)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

export const importBulkBrokers = async (file: File, existingBrokers: Broker[]): Promise<{
  success: boolean; imported: Broker[]; skipped: number
}> => {
  try {
    const brokersData = await parseBrokerExcel(file)
    const imported: Broker[] = []
    let skipped = 0
    const now = new Date().toISOString()
    
    brokersData.forEach(broker => {
      const duplicate = existingBrokers.find(b => b.cnic === broker.CNIC)
      if (duplicate) { skipped++; return }
      
      imported.push({
        id: `broker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: broker.Name,
        phone: broker.Phone,
        cnic: broker.CNIC,
        email: broker.Email,
        address: broker.Address,
        company: broker.Company,
        commissionRate: broker['Commission Rate %'] || 1,  // 1% default
        bankDetails: broker['Bank Details'],
        notes: broker.Notes,
        status: broker.Status || 'active',
        createdAt: now,
        updatedAt: now,
      })
    })
    
    return { success: true, imported, skipped }
  } catch (error) {
    return { success: false, imported: [], skipped: 0 }
  }
}

export const generateBrokerTemplate = (): Blob => {
  const template = [{
    'Name': 'John Doe', 'Phone': '0321-1234567', 'CNIC': '35201-1234567-1', 'Email': 'john@example.com',
    'Address': '123 Street, City', 'Company': 'ABC Associates', 'Commission Rate %': 1,
    'Bank Details': 'HBL - Account: 12345678', 'Status': 'active', 'Notes': 'Sample broker',
  }]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Brokers')
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

const parseTransactionExcel = (file: File): Promise<ExcelTransactionItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        const transactions: ExcelTransactionItem[] = jsonData.map((row: any) => ({
          'Customer Name': row['Customer Name'] || '',
          'Customer Phone': row['Customer Phone'] || '',
          'Customer CNIC': row['Customer CNIC'] || '',
          'Project Name': row['Project Name'] || '',
          'Unit': row['Unit'] || '',
          'Marlas': parseFloat(row['Marlas'] || '0'),
          'Rate per Marla': parseFloat(row['Rate per Marla'] || '0'),
          'Sale Value': parseFloat(row['Sale Value'] || '0'),
          'Received Amount': parseFloat(row['Received Amount'] || '0'),
          'Broker Name': row['Broker Name'],
          'Broker Commission %': parseFloat(row['Broker Commission %'] || '1'),
          'Company Rep Name': row['Company Rep Name'],
          'Company Rep Commission %': parseFloat(row['Company Rep Commission %'] || '1'),
          'Payment Cycle': row['Payment Cycle'] || 'quarterly',
          'Number of Installments': parseInt(row['Number of Installments'] || '4'),
          'First Due Date': row['First Due Date'] || new Date().toISOString().split('T')[0],
          'Status': (row['Status'] || 'active').toLowerCase() as 'active' | 'completed' | 'cancelled',
          'Notes': row['Notes'],
        }))
        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

export const importBulkTransactions = async (
  file: File, existingCustomers: Customer[], existingBrokers: Broker[], existingProjects: Project[]
): Promise<{ success: boolean; customersCreated: Customer[]; projectsCreated: Project[] }> => {
  try {
    const transactionsData = await parseTransactionExcel(file)
    const customersCreated: Customer[] = []
    const projectsCreated: Project[] = []
    const now = new Date().toISOString()
    const customerMap = new Map<string, Customer>()
    const brokerMap = new Map<string, Broker>()
    
    existingCustomers.forEach(c => customerMap.set(c.cnic, c))
    existingBrokers.forEach(b => brokerMap.set(b.name.toLowerCase(), b))
    
    transactionsData.forEach(txn => {
      let customer = customerMap.get(txn['Customer CNIC'])
      if (!customer) {
        customer = {
          id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: txn['Customer Name'], phone: txn['Customer Phone'], cnic: txn['Customer CNIC'],
          type: 'customer', status: 'active', createdAt: now, updatedAt: now,
        }
        customerMap.set(customer.cnic, customer)
        customersCreated.push(customer)
      }
      
      let brokerId: string | undefined
      let brokerCommissionRate = 1
      if (txn['Broker Name']) {
        const broker = brokerMap.get(txn['Broker Name'].toLowerCase())
        if (broker) {
          brokerId = broker.id
          brokerCommissionRate = txn['Broker Commission %'] || broker.commissionRate || 1
        }
      }
      
      let companyRepId: string | undefined
      let companyRepCommissionRate = 1
      if (txn['Company Rep Name']) {
        const companyRep = brokerMap.get(txn['Company Rep Name'].toLowerCase())
        if (companyRep) {
          companyRepId = companyRep.id
          companyRepCommissionRate = txn['Company Rep Commission %'] || 1
        }
      }
      
      const installments = []
      const installmentAmount = (txn['Sale Value'] - txn['Received Amount']) / txn['Number of Installments']
      const firstDueDate = new Date(txn['First Due Date'])
      
      for (let i = 0; i < txn['Number of Installments']; i++) {
        const dueDate = new Date(firstDueDate)
        switch (txn['Payment Cycle']) {
          case 'monthly': dueDate.setMonth(dueDate.getMonth() + i); break
          case 'quarterly': dueDate.setMonth(dueDate.getMonth() + (i * 3)); break
          case 'bi_annual': dueDate.setMonth(dueDate.getMonth() + (i * 6)); break
          case 'annual': dueDate.setFullYear(dueDate.getFullYear() + i); break
        }
        installments.push({
          id: `inst_${i + 1}`, number: i + 1, amount: installmentAmount,
          dueDate: dueDate.toISOString().split('T')[0], paid: false, partialPaid: 0,
        })
      }
      
      projectsCreated.push({
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId: customer.id, brokerId, brokerCommissionRate, companyRepId, companyRepCommissionRate,
        name: txn['Project Name'], unit: txn['Unit'], marlas: txn['Marlas'], rate: txn['Rate per Marla'],
        sale: txn['Sale Value'], received: txn['Received Amount'], status: txn['Status'],
        cycle: txn['Payment Cycle'] as any, notes: txn['Notes'], installments, createdAt: now, updatedAt: now,
      })
    })
    
    return { success: true, customersCreated, projectsCreated }
  } catch (error) {
    return { success: false, customersCreated: [], projectsCreated: [] }
  }
}

export const generateTransactionTemplate = (): Blob => {
  const template = [{
    'Customer Name': 'Ahmed Khan', 'Customer Phone': '0321-1234567', 'Customer CNIC': '35201-1234567-1',
    'Project Name': 'RUJ', 'Unit': 'A-101', 'Marlas': 10, 'Rate per Marla': 950000, 'Sale Value': 9500000,
    'Received Amount': 2000000, 'Broker Name': 'John Doe', 'Broker Commission %': 1,
    'Company Rep Name': '', 'Company Rep Commission %': 1, 'Payment Cycle': 'quarterly',
    'Number of Installments': 12, 'First Due Date': '2025-02-01', 'Status': 'active', 'Notes': 'Sample',
  }]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export const exportCommissionPayments = (payments: CommissionPayment[]): Blob => {
  const data = payments.map(p => ({
    'Payment ID': p.id, 'Project ID': p.projectId, 'Recipient': p.recipientName,
    'Type': p.recipientType === 'broker' ? 'Broker' : 'Company Rep',
    'Total Amount': p.amount, 'Paid Amount': p.paidAmount, 'Remaining': p.remainingAmount,
    'Status': p.status, 'Payment Date': p.paymentDate || 'N/A', 'Payment Method': p.paymentMethod || 'N/A',
    'Reference': p.paymentReference || 'N/A', 'Notes': p.notes || '', 'Created': p.createdAt,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commission Payments')
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export const exportProjectsWithCommission = (
  projects: Project[], customers: Customer[], brokers: Broker[], commissionPayments: CommissionPayment[]
): Blob => {
  const data = projects.map(p => {
    const customer = customers.find(c => c.id === p.customerId)
    const broker = brokers.find(b => b.id === p.brokerId)
    const companyRep = brokers.find(b => b.id === p.companyRepId)
    const brokerPayments = commissionPayments.filter(cp => cp.projectId === p.id && cp.recipientType === 'broker').reduce((s, cp) => s + cp.paidAmount, 0)
    const companyRepPayments = commissionPayments.filter(cp => cp.projectId === p.id && cp.recipientType === 'companyRep').reduce((s, cp) => s + cp.paidAmount, 0)
    const brokerCommissionTotal = (p.sale * (p.brokerCommissionRate || 0)) / 100
    const companyRepCommissionTotal = (p.sale * (p.companyRepCommissionRate || 0)) / 100
    return {
      'Project Name': p.name, 'Unit': p.unit, 'Customer': customer?.name || 'N/A', 'Customer CNIC': customer?.cnic || 'N/A',
      'Marlas': p.marlas, 'Rate per Marla': p.rate, 'Sale Value': p.sale, 'Received': p.received, 'Balance': p.sale - p.received,
      'Broker': broker?.name || 'N/A', 'Broker Commission %': p.brokerCommissionRate || 0, 'Broker Commission Owed': brokerCommissionTotal,
      'Broker Commission Paid': brokerPayments, 'Broker Commission Pending': brokerCommissionTotal - brokerPayments,
      'Company Rep': companyRep?.name || 'N/A', 'Company Rep Commission %': p.companyRepCommissionRate || 0,
      'Company Rep Commission Owed': companyRepCommissionTotal, 'Company Rep Commission Paid': companyRepPayments,
      'Company Rep Commission Pending': companyRepCommissionTotal - companyRepPayments,
      'Status': p.status, 'Payment Cycle': p.cycle, 'Created': p.createdAt,
    }
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Legacy function stub
export function loadYourBackup() {
  console.log('Use importBackupFile() instead');
}

export default {
  loadData,
  saveData,
  importBackupFile,
  createBackup,
  listBackups,
  restoreBackup,
  exportData,
  importData,
  clearAllData,
  getStorageStats,
  testDataLoading,
  loadYourBackup,
  // NEW: Bulk import/export functions
  importBulkBrokers,
  importBulkTransactions,
  generateBrokerTemplate,
  generateTransactionTemplate,
  exportCommissionPayments,
  exportProjectsWithCommission,
};