/**
 * Migration utility to migrate from localStorage to PostgreSQL
 * This can be run from the browser console or as a component
 */

import { apiService } from '../services/api';

export async function migrateLocalStorageToDatabase(): Promise<{
  success: boolean;
  message: string;
  stats?: any;
}> {
  try {
    console.log('🔄 Starting migration from localStorage to PostgreSQL...');

    // Get data from localStorage
    const storageKey = 'sitara_crm_data';
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      return {
        success: false,
        message: 'No data found in localStorage. Nothing to migrate.',
      };
    }

    let localStorageData;
    try {
      localStorageData = JSON.parse(stored);
      
      // Handle Zustand format
      if (localStorageData.state && typeof localStorageData.state === 'object') {
        localStorageData = localStorageData.state;
      }
      
      console.log('📊 Data to migrate:', {
        customers: localStorageData.customers?.length || 0,
        brokers: localStorageData.brokers?.length || 0,
        projects: localStorageData.projects?.length || 0,
        receipts: localStorageData.receipts?.length || 0,
        interactions: localStorageData.interactions?.length || 0,
        inventory: localStorageData.inventory?.length || 0,
        commissionPayments: localStorageData.commissionPayments?.length || 0,
      });
      
      // Debug: Log actual data structure
      console.log('🔍 Data structure keys:', Object.keys(localStorageData));
      if (localStorageData.customers && localStorageData.customers.length > 0) {
        console.log('📋 Sample customer:', localStorageData.customers[0]);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to parse localStorage data: ' + (error instanceof Error ? error.message : 'Unknown error'),
      };
    }

    const stats = {
      customers: 0,
      brokers: 0,
      projects: 0,
      receipts: 0,
      interactions: 0,
      inventory: 0,
      commissionPayments: 0,
    };

    // Migrate customers
    if (localStorageData.customers && Array.isArray(localStorageData.customers) && localStorageData.customers.length > 0) {
      console.log(`📦 Migrating ${localStorageData.customers.length} customers...`);
      try {
        // Test API connection first
        const healthCheck = await apiService.healthCheck();
        if (!healthCheck.success) {
          throw new Error('API health check failed. Please ensure the backend is running.');
        }
        
        const result = await apiService.bulkCreateCustomers(localStorageData.customers);
        if (result.success) {
          // Backend returns { success: true, data: results, count: results.length }
          stats.customers = result.data?.count || (Array.isArray(result.data) ? result.data.length : localStorageData.customers.length);
          console.log(`✅ Migrated ${stats.customers} customers`);
        } else {
          console.error('Failed to migrate customers:', result.error);
          throw new Error(`Failed to migrate customers: ${result.error}`);
        }
      } catch (error) {
        console.error('Error migrating customers:', error);
        throw error;
      }
    }

    // Migrate brokers
    if (localStorageData.brokers && Array.isArray(localStorageData.brokers) && localStorageData.brokers.length > 0) {
      console.log(`📦 Migrating ${localStorageData.brokers.length} brokers...`);
      const result = await apiService.bulkCreateBrokers(localStorageData.brokers);
      if (result.success) {
        stats.brokers = result.data?.count || (Array.isArray(result.data) ? result.data.length : localStorageData.brokers.length);
        console.log(`✅ Migrated ${stats.brokers} brokers`);
      } else {
        console.error('Failed to migrate brokers:', result.error);
        throw new Error(`Failed to migrate brokers: ${result.error}`);
      }
    }

    // Migrate projects
    if (localStorageData.projects && Array.isArray(localStorageData.projects) && localStorageData.projects.length > 0) {
      console.log(`📦 Migrating ${localStorageData.projects.length} projects...`);
      const result = await apiService.bulkCreateProjects(localStorageData.projects);
      if (result.success) {
        stats.projects = result.data?.count || (Array.isArray(result.data) ? result.data.length : localStorageData.projects.length);
        console.log(`✅ Migrated ${stats.projects} projects`);
      } else {
        console.error('Failed to migrate projects:', result.error);
        throw new Error(`Failed to migrate projects: ${result.error}`);
      }
    }

    // Migrate receipts
    if (localStorageData.receipts && Array.isArray(localStorageData.receipts) && localStorageData.receipts.length > 0) {
      console.log(`📦 Migrating ${localStorageData.receipts.length} receipts...`);
      const result = await apiService.bulkCreateReceipts(localStorageData.receipts);
      if (result.success) {
        stats.receipts = result.data?.count || (Array.isArray(result.data) ? result.data.length : localStorageData.receipts.length);
        console.log(`✅ Migrated ${stats.receipts} receipts`);
      } else {
        console.error('Failed to migrate receipts:', result.error);
        throw new Error(`Failed to migrate receipts: ${result.error}`);
      }
    }

    // Migrate interactions
    if (localStorageData.interactions && Array.isArray(localStorageData.interactions) && localStorageData.interactions.length > 0) {
      console.log(`📦 Migrating ${localStorageData.interactions.length} interactions...`);
      const result = await apiService.bulkCreateInteractions(localStorageData.interactions);
      if (result.success) {
        stats.interactions = result.data?.count || (Array.isArray(result.data) ? result.data.length : localStorageData.interactions.length);
        console.log(`✅ Migrated ${stats.interactions} interactions`);
      } else {
        console.error('Failed to migrate interactions:', result.error);
        throw new Error(`Failed to migrate interactions: ${result.error}`);
      }
    }

    // Migrate inventory
    if (localStorageData.inventory && Array.isArray(localStorageData.inventory) && localStorageData.inventory.length > 0) {
      console.log(`📦 Migrating ${localStorageData.inventory.length} inventory items...`);
      const result = await apiService.bulkCreateInventoryItems(localStorageData.inventory);
      if (result.success) {
        stats.inventory = result.data?.count || (Array.isArray(result.data) ? result.data.length : localStorageData.inventory.length);
        console.log(`✅ Migrated ${stats.inventory} inventory items`);
      } else {
        console.error('Failed to migrate inventory:', result.error);
        throw new Error(`Failed to migrate inventory: ${result.error}`);
      }
    }

    // Migrate commission payments
    if (localStorageData.commissionPayments && Array.isArray(localStorageData.commissionPayments) && localStorageData.commissionPayments.length > 0) {
      console.log(`📦 Migrating ${localStorageData.commissionPayments.length} commission payments...`);
      // Note: We need to add bulk create for commission payments
      for (const payment of localStorageData.commissionPayments) {
        await apiService.createCommissionPayment(payment);
      }
      stats.commissionPayments = localStorageData.commissionPayments.length;
      console.log(`✅ Migrated ${stats.commissionPayments} commission payments`);
    }

    // Migrate settings
    if (localStorageData.settings) {
      console.log('📦 Migrating settings...');
      await apiService.updateSettings(localStorageData.settings);
      console.log('✅ Settings migrated');
    }

    console.log('🎉 Migration completed successfully!', stats);

    return {
      success: true,
      message: 'Migration completed successfully',
      stats,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during migration',
    };
  }
}

/**
 * Check if API is available
 */
export async function checkApiAvailability(): Promise<boolean> {
  try {
    const result = await apiService.healthCheck();
    return result.success === true;
  } catch {
    return false;
  }
}

/**
 * Export localStorage data to JSON file
 */
export function exportLocalStorageData(): string {
  const storageKey = 'sitara_crm_data';
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    throw new Error('No data found in localStorage');
  }

  let data;
  try {
    data = JSON.parse(stored);
    if (data.state && typeof data.state === 'object') {
      data = data.state;
    }
  } catch (error) {
    throw new Error('Failed to parse localStorage data');
  }

  return JSON.stringify(data, null, 2);
}

