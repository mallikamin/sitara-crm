import { useCallback } from 'react';
import { STORAGE_CONFIG, INITIAL_DB } from '../constants';

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
      const compressed = compressData(data);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_CONFIG.MAIN_KEY, compressed.data);
      
      // Create backup
      const backups = JSON.parse(localStorage.getItem(STORAGE_CONFIG.BACKUP_KEY) || '[]');
      backups.unshift({
        timestamp: new Date().toISOString(),
        data: compressed.data,
        summary: {
          customers: data.customers.length,
          projects: data.projects.length,
          inventory: data.inventory.length
        }
      });
      
      // Keep only 5 backups
      if (backups.length > 5) {
        backups.pop();
      }
      
      localStorage.setItem(STORAGE_CONFIG.BACKUP_KEY, JSON.stringify(backups));
      
      return { success: true };
    } catch (error) {
      console.error('Save failed:', error);
      return { success: false, error: error.message };
    }
  }, [compressData]);

  const loadData = useCallback(async () => {
    try {
      // Try to load from main storage
      const compressedData = localStorage.getItem(STORAGE_CONFIG.MAIN_KEY);
      
      if (compressedData) {
        const data = decompressData(compressedData);
        
        // Initialize missing arrays
        const initializedData = {
          ...INITIAL_DB,
          ...data,
          customers: data.customers || [],
          projects: data.projects || [],
          interactions: data.interactions || [],
          receipts: data.receipts || [],
          inventory: data.inventory || [],
          masterProjects: data.masterProjects || [],
          lastUpdated: new Date().toISOString()
        };
        
        return initializedData;
      }
      
      // Return initial database if no saved data
      return INITIAL_DB;
    } catch (error) {
      console.error('Load failed:', error);
      return INITIAL_DB;
    }
  }, [decompressData]);

  return { saveData, loadData };
};