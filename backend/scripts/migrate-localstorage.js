/**
 * Migration script to migrate data from localStorage to PostgreSQL
 * Run this script from the browser console or as a Node.js script
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function migrateFromLocalStorage() {
  try {
    console.log('🔄 Starting migration from localStorage to PostgreSQL...');
    
    // Get data from localStorage (this would be run in browser)
    // For Node.js, we'll read from a JSON file
    const fs = await import('fs');
    const path = await import('path');
    
    // Check if backup file exists
    const backupPath = path.join(process.cwd(), 'localStorage-backup.json');
    let localStorageData;
    
    if (fs.existsSync(backupPath)) {
      console.log('📁 Reading from backup file...');
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      localStorageData = JSON.parse(backupContent);
    } else {
      console.log('❌ No backup file found. Please export your localStorage data first.');
      console.log('   You can do this by running in browser console:');
      console.log('   localStorage.getItem("sitara_crm_data")');
      return;
    }

    // Migrate customers
    if (localStorageData.customers && localStorageData.customers.length > 0) {
      console.log(`📦 Migrating ${localStorageData.customers.length} customers...`);
      const response = await fetch(`${API_URL}/customers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: localStorageData.customers })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} customers`);
    }

    // Migrate brokers
    if (localStorageData.brokers && localStorageData.brokers.length > 0) {
      console.log(`📦 Migrating ${localStorageData.brokers.length} brokers...`);
      const response = await fetch(`${API_URL}/brokers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokers: localStorageData.brokers })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} brokers`);
    }

    // Migrate projects
    if (localStorageData.projects && localStorageData.projects.length > 0) {
      console.log(`📦 Migrating ${localStorageData.projects.length} projects...`);
      const response = await fetch(`${API_URL}/projects/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: localStorageData.projects })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} projects`);
    }

    // Migrate receipts
    if (localStorageData.receipts && localStorageData.receipts.length > 0) {
      console.log(`📦 Migrating ${localStorageData.receipts.length} receipts...`);
      const response = await fetch(`${API_URL}/receipts/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipts: localStorageData.receipts })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} receipts`);
    }

    // Migrate interactions
    if (localStorageData.interactions && localStorageData.interactions.length > 0) {
      console.log(`📦 Migrating ${localStorageData.interactions.length} interactions...`);
      const response = await fetch(`${API_URL}/interactions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactions: localStorageData.interactions })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} interactions`);
    }

    // Migrate inventory
    if (localStorageData.inventory && localStorageData.inventory.length > 0) {
      console.log(`📦 Migrating ${localStorageData.inventory.length} inventory items...`);
      const response = await fetch(`${API_URL}/inventory/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: localStorageData.inventory })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} inventory items`);
    }

    // Migrate commission payments
    if (localStorageData.commissionPayments && localStorageData.commissionPayments.length > 0) {
      console.log(`📦 Migrating ${localStorageData.commissionPayments.length} commission payments...`);
      const response = await fetch(`${API_URL}/commission-payments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionPayments: localStorageData.commissionPayments })
      });
      const result = await response.json();
      console.log(`✅ Migrated ${result.count || 0} commission payments`);
    }

    // Migrate settings
    if (localStorageData.settings) {
      console.log('📦 Migrating settings...');
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localStorageData.settings)
      });
      const result = await response.json();
      console.log('✅ Settings migrated');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateFromLocalStorage();

