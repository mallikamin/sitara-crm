import React, { useEffect } from 'react';

export const TestDataLoading = () => {
  useEffect(() => {
    console.log('🔍 TestDataLoading: Checking data...');
    
    // Test 1: Check localStorage
    const stored = localStorage.getItem('sitara_crm_data');
    console.log('1. localStorage has data?', stored ? 'YES' : 'NO');
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('2. Parsed data:', {
          version: data.version || 'unknown',
          customers: data.customers?.length || 0,
          projects: data.projects?.length || 0,
          receipts: data.receipts?.length || 0,
          interactions: data.interactions?.length || 0
        });
        
        if (data.customers && data.customers.length > 0) {
          console.log('3. First 3 customers:', data.customers.slice(0, 3).map(c => ({
            name: c.name,
            phone: c.phone,
            type: c.type
          })));
        }
        
        if (data.projects && data.projects.length > 0) {
          console.log('4. First 3 projects:', data.projects.slice(0, 3).map(p => ({
            name: p.name,
            unit: p.unit,
            sale: p.sale,
            received: p.received
          })));
        }
      } catch (error) {
        console.error('Error parsing data:', error);
      }
    }
    
    // Test 2: Try to load from dataservice.ts
    try {
      const dataservice = require('../../services/dataservice');
      console.log('5. dataservice.ts available?', dataservice ? 'YES' : 'NO');
      
      if (dataservice?.loadYourBackupData) {
        console.log('6. dataservice.ts has loadYourBackupData function');
        const backupData = dataservice.loadYourBackupData();
        if (backupData) {
          console.log('7. Backup data in dataservice.ts:', {
            customers: backupData.customers?.length || 0,
            projects: backupData.projects?.length || 0
          });
        }
      }
    } catch (error) {
      console.log('8. dataservice.ts not available:', error.message);
    }
  }, []);

  const handleLoadFromDataservice = () => {
    try {
      const dataservice = require('../../services/dataservice');
      if (dataservice?.loadYourBackupData) {
        const backupData = dataservice.loadYourBackupData();
        if (backupData) {
          localStorage.setItem('sitara_crm_data', JSON.stringify(backupData));
          alert(`✅ Loaded from dataservice.ts!\n\nCustomers: ${backupData.customers?.length || 0}\nProjects: ${backupData.projects?.length || 0}\n\nReloading...`);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          alert('❌ No backup data found in dataservice.ts');
        }
      } else {
        alert('❌ loadYourBackupData function not found in dataservice.ts');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const handleLoadJson = () => {
    const json = prompt('Paste your backup JSON:');
    if (json) {
      try {
        const backupData = JSON.parse(json);
        localStorage.setItem('sitara_crm_data', JSON.stringify(backupData));
        alert(`✅ JSON loaded!\n\nCustomers: ${backupData.customers?.length || 0}\nProjects: ${backupData.projects?.length || 0}\n\nReloading...`);
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        alert('❌ Invalid JSON: ' + error.message);
      }
    }
  };

  const handleClearData = () => {
    if (confirm('Clear all data from localStorage?')) {
      localStorage.removeItem('sitara_crm_data');
      alert('✅ Data cleared. Reloading...');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const handleCheckData = () => {
    const stored = localStorage.getItem('sitara_crm_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        alert(`📊 Current Data:\n\nCustomers: ${data.customers?.length || 0}\nProjects: ${data.projects?.length || 0}\nReceipts: ${data.receipts?.length || 0}\nVersion: ${data.version || 'unknown'}`);
      } catch (error) {
        alert('❌ Error reading data: ' + error.message);
      }
    } else {
      alert('📭 No data in localStorage');
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #667eea',
      borderRadius: '10px',
      margin: '20px',
      background: '#f8f9fa'
    }}>
      <h3 style={{ color: '#667eea', marginBottom: '20px' }}>📊 Data Management Test Panel</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={handleLoadFromDataservice}
          style={{ 
            padding: '10px 15px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📁 Load from dataservice.ts
        </button>
        
        <button 
          onClick={handleLoadJson}
          style={{ 
            padding: '10px 15px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📄 Load JSON Backup
        </button>
        
        <button 
          onClick={handleCheckData}
          style={{ 
            padding: '10px 15px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔍 Check Current Data
        </button>
        
        <button 
          onClick={handleClearData}
          style={{ 
            padding: '10px 15px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear All Data
        </button>
      </div>
      
      <div style={{ 
        padding: '15px', 
        background: 'white', 
        borderRadius: '5px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ marginTop: 0 }}>📋 Instructions:</h4>
        <ol style={{ marginBottom: 0 }}>
          <li>Click "Load from dataservice.ts" to load backup from your code</li>
          <li>Click "Load JSON Backup" to paste your backup file content</li>
          <li>Check console (F12) for detailed logs</li>
          <li>After loading, refresh page to see data in the app</li>
        </ol>
      </div>
    </div>
  );
};