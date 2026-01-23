import { useCallback } from 'react';
import { STORAGE_CONFIG, INITIAL_DB } from '../constants';

// Local data functions
const loadFromService = () => {
  try {
    const stored = localStorage.getItem(STORAGE_CONFIG.MAIN_KEY || 'sitara_crm_data');
    if (stored) {
      const data = JSON.parse(stored);
      console.log('📁 useStorage: Loaded from localStorage:', {
        customers: data.customers?.length || 0,
        projects: data.projects?.length || 0
      });
      
      // Ensure all arrays exist
      return {
        ...INITIAL_DB,
        ...data,
        customers: data.customers || [],
        projects: data.projects || [],
        receipts: data.receipts || [],
        interactions: data.interactions || [],
        inventory: data.inventory || [],
        masterProjects: data.masterProjects || [],
        settings: { ...INITIAL_DB.settings, ...data.settings }
      };
    }
    
    // Check if dataservice.ts has backup
    try {
      const dataservice = require('../services/dataservice');
      if (dataservice?.loadYourBackupData) {
        console.log('📁 useStorage: Loading from dataservice.ts backup');
        return dataservice.loadYourBackupData();
      }
    } catch (e) {
      // dataservice.ts not available, continue
    }
    
    return INITIAL_DB;
    
  } catch (error) {
    console.error('❌ useStorage: Error loading data:', error);
    return INITIAL_DB;
  }
};

const saveToService = (data) => {
  try {
    const dataToSave = {
      ...data,
      version: '3.1',
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_CONFIG.MAIN_KEY || 'sitara_crm_data', JSON.stringify(dataToSave));
    console.log('💾 useStorage: Saved data to localStorage');
    return true;
  } catch (error) {
    console.error('❌ useStorage: Error saving data:', error);
    return false;
  }
};

const importBackupFile = (backupJson) => {
  try {
    console.log('📤 useStorage: Importing backup...');
    const backupData = JSON.parse(backupJson);
    
    const migratedData = {
      version: '3.1',
      customers: backupData.customers || [],
      projects: backupData.projects || [],
      receipts: backupData.receipts || [],
      interactions: backupData.interactions || [],
      inventory: backupData.inventory || [],
      masterProjects: backupData.masterProjects || [],
      settings: {
        currency: 'PKR',
        defaultCycle: 'quarterly',
        followUpDays: [1, 3, 7, 14, 30],
        commissionRate: 2.5,
        ...(backupData.settings || {})
      },
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('sitara_crm_data', JSON.stringify(migratedData));
    
    console.log('✅ useStorage: Backup imported successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   Customers: ${migratedData.customers.length}`);
    console.log(`   Projects: ${migratedData.projects.length}`);
    console.log(`   Receipts: ${migratedData.receipts.length}`);
    
    return migratedData;
    
  } catch (error) {
    console.error('❌ useStorage: Error importing backup:', error);
    return null;
  }
};

export const useStorage = () => {
  const compressData = useCallback((data) => {
    try {
      const dataStr = JSON.stringify(data);
      
      if (dataStr.length > STORAGE_CONFIG.COMPRESS_THRESHOLD) {
        const compressed = {
          v: '2.0',
          t: Date.now(),
          d: data,
          s: {
            c: data.customers?.length || 0,
            p: data.projects?.length || 0,
            i: data.inventory?.length || 0,
            r: data.receipts?.length || 0,
            m: data.masterProjects?.length || 0
          }
        };
        
        return {
          compressed: true,
          data: JSON.stringify(compressed).replace(/\s+/g, ''),
          originalSize: dataStr.length,
          compressedSize: null
        };
      }
      
      return {
        compressed: false,
        data: dataStr,
        originalSize: dataStr.length,
        compressedSize: dataStr.length
      };
    } catch (error) {
      return {
        compressed: false,
        data: JSON.stringify(data),
        originalSize: 0,
        compressedSize: 0,
        error: error.message
      };
    }
  }, []);

  const decompressData = useCallback((compressedData) => {
    try {
      if (typeof compressedData === 'string') {
        const parsed = JSON.parse(compressedData);
        
        if (parsed.compressed && parsed.v === '2.0') {
          return parsed.d;
        }
        
        return parsed;
      }
      
      return compressedData;
    } catch (error) {
      return null;
    }
  }, []);

  const saveData = useCallback(async (data) => {
    try {
      const success = saveToService(data);
      
      if (success) {
        // Create backup
        const compressed = compressData(data);
        const backups = JSON.parse(localStorage.getItem(STORAGE_CONFIG.BACKUP_KEY) || '[]');
        
        backups.unshift({
          timestamp: new Date().toISOString(),
          data: compressed.data,
          summary: {
            customers: data.customers.length,
            projects: data.projects.length,
            inventory: data.inventory?.length || 0,
            receipts: data.receipts.length
          },
          compressed: compressed.compressed
        });
        
        if (backups.length > 5) {
          backups.pop();
        }
        
        localStorage.setItem(STORAGE_CONFIG.BACKUP_KEY, JSON.stringify(backups));
      }
      
      return { success };
    } catch (error) {
      console.error('❌ useStorage: Save failed:', error);
      return { success: false, error: error.message };
    }
  }, [compressData]);

  const loadData = useCallback(async () => {
    try {
      const data = loadFromService();
      
      const initializedData = {
        ...INITIAL_DB,
        ...data,
        customers: data.customers || [],
        projects: data.projects || [],
        interactions: data.interactions || [],
        receipts: data.receipts || [],
        inventory: data.inventory || [],
        masterProjects: data.masterProjects || [],
        settings: { ...INITIAL_DB.settings, ...data.settings },
        lastUpdated: data.lastUpdated || new Date().toISOString()
      };
      
      console.log('📊 useStorage loaded:', {
        customers: initializedData.customers.length,
        projects: initializedData.projects.length,
        receipts: initializedData.receipts.length
      });
      
      return initializedData;
    } catch (error) {
      console.error('❌ useStorage: Load failed:', error);
      return INITIAL_DB;
    }
  }, []);

  const loadBackup = useCallback(async (backupJson) => {
    try {
      const result = importBackupFile(backupJson);
      if (result) {
        return { success: true, data: result };
      }
      return { success: false, error: 'Import failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const listBackups = useCallback(() => {
    try {
      const backups = JSON.parse(localStorage.getItem(STORAGE_CONFIG.BACKUP_KEY) || '[]');
      return backups.map(b => ({
        timestamp: b.timestamp,
        summary: b.summary,
        compressed: b.compressed || false
      }));
    } catch (error) {
      return [];
    }
  }, []);

  const restoreBackup = useCallback((index) => {
    try {
      const backups = JSON.parse(localStorage.getItem(STORAGE_CONFIG.BACKUP_KEY) || '[]');
      if (index >= 0 && index < backups.length) {
        const backup = backups[index];
        const data = decompressData(backup.data);
        
        if (data) {
          const success = saveToService(data);
          return { success };
        }
      }
      return { success: false, error: 'Backup not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [decompressData]);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_CONFIG.MAIN_KEY || 'sitara_crm_data');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const getStorageStats = useCallback(() => {
    try {
      const data = loadFromService();
      const mainData = localStorage.getItem(STORAGE_CONFIG.MAIN_KEY || 'sitara_crm_data');
      const backupData = localStorage.getItem(STORAGE_CONFIG.BACKUP_KEY);
      
      return {
        customers: data.customers.length,
        projects: data.projects.length,
        receipts: data.receipts.length,
        inventory: data.inventory?.length || 0,
        interactions: data.interactions?.length || 0,
        masterProjects: data.masterProjects?.length || 0,
        lastUpdated: data.lastUpdated,
        mainSize: mainData ? mainData.length * 2 : 0,
        backupSize: backupData ? backupData.length * 2 : 0,
        totalSize: (mainData ? mainData.length * 2 : 0) + (backupData ? backupData.length * 2 : 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }, []);

  return {
    saveData,
    loadData,
    loadBackup,
    listBackups,
    restoreBackup,
    clearStorage,
    getStorageStats
  };
};

export default useStorage;