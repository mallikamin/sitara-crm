import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContextAPI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function BackupManager({ onClose }) {
  const {
    customers,
    brokers,
    companyReps,
    projects,
    receipts,
    inventory,
    interactions,
    commissionPayments,
    refreshAllData
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [apiStatus, setApiStatus] = useState({ checked: false, connected: false });
  const [lastExport, setLastExport] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const fileInputRef = useRef(null);

  // Check API connection on mount
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/health`);
      const data = await response.json();
      setApiStatus({ 
        checked: true, 
        connected: data.status === 'ok',
        database: data.database
      });
    } catch (error) {
      setApiStatus({ checked: true, connected: false, error: error.message });
    }
  };

  const showMessage = (text, type = 'success', duration = 5000) => {
    setMessage({ text, type });
    if (duration > 0) {
      setTimeout(() => setMessage(null), duration);
    }
  };

  // Current data stats from context
  const currentStats = {
    customers: customers?.length || 0,
    brokers: brokers?.length || 0,
    companyReps: companyReps?.length || 0,
    projects: projects?.length || 0,
    receipts: receipts?.length || 0,
    inventory: inventory?.length || 0,
    interactions: interactions?.length || 0,
    commissionPayments: commissionPayments?.length || 0,
  };

  const totalRecords = Object.values(currentStats).reduce((a, b) => a + b, 0);

  // ==================== EXPORT FUNCTIONS ====================
  
  const handleExport = async () => {
    setIsProcessing(true);
    showMessage('Exporting data from database...', 'info', 0);
    
    try {
      const response = await fetch(`${API_URL}/backup/export`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      const backup = result.data;
      
      // Add metadata
      backup.exportedAt = new Date().toISOString();
      backup.exportedFrom = 'Sitara CRM';
      backup.version = '4.0';
      
      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `sitara-crm-backup-${date}-${time}.json`;
      
      // Download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Calculate stats
      const exportStats = {
        customers: backup.customers?.length || 0,
        brokers: backup.brokers?.length || 0,
        companyReps: backup.companyReps?.length || 0,
        projects: backup.projects?.length || 0,
        receipts: backup.receipts?.length || 0,
        interactions: backup.interactions?.length || 0,
        inventory: backup.inventory?.length || 0,
        commissionPayments: backup.commissionPayments?.length || 0,
      };
      
      setLastExport({
        filename,
        timestamp: new Date().toISOString(),
        stats: exportStats
      });
      
      showMessage(`✅ Exported ${Object.values(exportStats).reduce((a,b) => a+b, 0)} records to ${filename}`, 'success');
      
    } catch (error) {
      console.error('Export error:', error);
      showMessage(`❌ Export failed: ${error.message}`, 'error');
    }
    
    setIsProcessing(false);
  };

  // ==================== IMPORT FUNCTIONS ====================

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max for large datasets)
    if (file.size > 50 * 1024 * 1024) {
      showMessage('File is too large. Maximum size is 50MB.', 'error');
      event.target.value = '';
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      showMessage('Please select a JSON file.', 'error');
      event.target.value = '';
      return;
    }

    setIsProcessing(true);
    showMessage('Reading backup file...', 'info', 0);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        let backup;
        
        try {
          backup = JSON.parse(content);
        } catch (parseError) {
          throw new Error('Invalid JSON file. Please select a valid backup file.');
        }

        // Validate backup structure
        if (!backup.customers && !backup.brokers && !backup.projects) {
          throw new Error('Invalid backup format. Missing required data fields.');
        }

        // Show confirmation with stats
        const importPreview = {
          customers: backup.customers?.length || 0,
          brokers: backup.brokers?.length || 0,
          companyReps: backup.companyReps?.length || 0,
          projects: backup.projects?.length || 0,
          receipts: backup.receipts?.length || 0,
          interactions: backup.interactions?.length || 0,
          inventory: backup.inventory?.length || 0,
          commissionPayments: backup.commissionPayments?.length || 0,
        };

        const totalToImport = Object.values(importPreview).reduce((a, b) => a + b, 0);
        
        const confirmMessage = `Import ${totalToImport} records?\n\n` +
          `Customers: ${importPreview.customers}\n` +
          `Brokers: ${importPreview.brokers}\n` +
          `Company Reps: ${importPreview.companyReps}\n` +
          `Projects: ${importPreview.projects}\n` +
          `Receipts: ${importPreview.receipts}\n` +
          `Interactions: ${importPreview.interactions}\n` +
          `Inventory: ${importPreview.inventory}\n` +
          `Commission Payments: ${importPreview.commissionPayments}\n\n` +
          `Note: Existing records with same IDs will be updated.`;

        if (!window.confirm(confirmMessage)) {
          showMessage('Import cancelled', 'info');
          setIsProcessing(false);
          event.target.value = '';
          return;
        }

        showMessage('Importing data to database...', 'info', 0);

        // Send to backend
        const response = await fetch(`${API_URL}/backup/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backup)
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Import failed');
        }

        // Store import stats
        setImportStats(result.stats);

        // Build success message
        const stats = result.stats || {};
        let successMsg = '✅ Import completed!\n';
        
        if (stats.customers) successMsg += `Customers: ${stats.customers.imported} imported, ${stats.customers.skipped} skipped, ${stats.customers.errors} errors\n`;
        if (stats.brokers) successMsg += `Brokers: ${stats.brokers.imported} imported, ${stats.brokers.skipped} skipped\n`;
        if (stats.companyReps) successMsg += `Company Reps: ${stats.companyReps.imported} imported\n`;
        if (stats.projects) successMsg += `Projects: ${stats.projects.imported} imported, ${stats.projects.skipped} skipped\n`;
        if (stats.receipts) successMsg += `Receipts: ${stats.receipts.imported} imported, ${stats.receipts.skipped} skipped\n`;
        if (stats.interactions) successMsg += `Interactions: ${stats.interactions.imported} imported\n`;
        if (stats.inventory) successMsg += `Inventory: ${stats.inventory.imported} imported\n`;

        showMessage(successMsg, 'success', 10000);

        // Refresh app data
        if (typeof refreshAllData === 'function') {
          await refreshAllData();
        } else {
          // Fallback: reload page after delay
          setTimeout(() => window.location.reload(), 2000);
        }

      } catch (error) {
        console.error('Import error:', error);
        showMessage(`❌ Import failed: ${error.message}`, 'error');
      }
      
      setIsProcessing(false);
    };

    reader.onerror = () => {
      showMessage('Failed to read file', 'error');
      setIsProcessing(false);
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  // ==================== CLEAR DATA FUNCTION ====================

  const handleClearAll = async () => {
    const confirmText = 'DELETE ALL DATA';
    const userInput = window.prompt(
      `⚠️ WARNING: This will permanently delete ALL data from the database!\n\n` +
      `Current data:\n` +
      `- ${currentStats.customers} Customers\n` +
      `- ${currentStats.brokers} Brokers\n` +
      `- ${currentStats.projects} Projects\n` +
      `- ${currentStats.receipts} Receipts\n` +
      `- ${currentStats.interactions} Interactions\n` +
      `- ${currentStats.inventory} Inventory items\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      showMessage('Clear cancelled - confirmation text did not match', 'info');
      return;
    }

    // Second confirmation
    if (!window.confirm('FINAL WARNING: Are you absolutely sure? All data will be permanently deleted.')) {
      return;
    }

    setIsProcessing(true);
    showMessage('Clearing all data...', 'info', 0);

    try {
      const response = await fetch(`${API_URL}/backup/clear`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Clear failed');
      }

      showMessage('✅ All data cleared successfully', 'success');

      // Refresh app data
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      } else {
        setTimeout(() => window.location.reload(), 1500);
      }

    } catch (error) {
      console.error('Clear error:', error);
      showMessage(`❌ Clear failed: ${error.message}`, 'error');
    }

    setIsProcessing(false);
  };

  // ==================== VERIFY DATA INTEGRITY ====================

  const handleVerifyData = async () => {
    setIsProcessing(true);
    showMessage('Verifying data integrity...', 'info', 0);

    try {
      // Fetch counts from API
      const endpoints = [
        'customers', 'brokers', 'company-reps', 'projects', 
        'receipts', 'interactions', 'inventory', 'commission-payments'
      ];

      const counts = {};
      const issues = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_URL}/${endpoint}`);
          const result = await response.json();
          const key = endpoint.replace('-', '');
          counts[key] = result.data?.length || 0;
        } catch (err) {
          issues.push(`Failed to fetch ${endpoint}: ${err.message}`);
        }
      }

      // Compare with context
      const contextCounts = {
        customers: customers?.length || 0,
        brokers: brokers?.length || 0,
        companyreps: companyReps?.length || 0,
        projects: projects?.length || 0,
        receipts: receipts?.length || 0,
        interactions: interactions?.length || 0,
        inventory: inventory?.length || 0,
        commissionpayments: commissionPayments?.length || 0,
      };

      let mismatches = [];
      for (const [key, dbCount] of Object.entries(counts)) {
        const ctxCount = contextCounts[key] || 0;
        if (dbCount !== ctxCount) {
          mismatches.push(`${key}: DB=${dbCount}, UI=${ctxCount}`);
        }
      }

      if (issues.length > 0) {
        showMessage(`⚠️ Verification issues:\n${issues.join('\n')}`, 'error', 10000);
      } else if (mismatches.length > 0) {
        showMessage(
          `⚠️ Data mismatch detected:\n${mismatches.join('\n')}\n\nTry refreshing the page.`, 
          'error', 
          10000
        );
      } else {
        showMessage(`✅ Data integrity verified! All ${Object.values(counts).reduce((a,b)=>a+b,0)} records match.`, 'success');
      }

    } catch (error) {
      showMessage(`❌ Verification failed: ${error.message}`, 'error');
    }

    setIsProcessing(false);
  };

  // ==================== FORMAT HELPERS ====================

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== RENDER ====================

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>💾 Backup & Data Management</h2>
            <p style={styles.subtitle}>
              Database: {' '}
              <span style={{ 
                color: apiStatus.connected ? '#10b981' : '#ef4444',
                fontWeight: 600
              }}>
                {apiStatus.checked 
                  ? (apiStatus.connected ? '✓ Connected' : '✗ Disconnected') 
                  : 'Checking...'}
              </span>
              {' '} • Total Records: <strong>{totalRecords.toLocaleString()}</strong>
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#dcfce7' : 
                            message.type === 'error' ? '#fee2e2' : '#dbeafe',
            color: message.type === 'success' ? '#166534' : 
                   message.type === 'error' ? '#991b1b' : '#1e40af',
            whiteSpace: 'pre-line'
          }}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'export', icon: '📤', label: 'Export' },
            { id: 'import', icon: '📥', label: 'Import' },
            { id: 'danger', icon: '⚠️', label: 'Danger Zone' }
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={styles.tabContent}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📊 Current Database Records</h3>
                <div style={styles.statsGrid}>
                  {[
                    { label: 'Customers', value: currentStats.customers, icon: '👥' },
                    { label: 'Brokers', value: currentStats.brokers, icon: '🤝' },
                    { label: 'Company Reps', value: currentStats.companyReps, icon: '👔' },
                    { label: 'Projects', value: currentStats.projects, icon: '📋' },
                    { label: 'Receipts', value: currentStats.receipts, icon: '🧾' },
                    { label: 'Interactions', value: currentStats.interactions, icon: '💬' },
                    { label: 'Inventory', value: currentStats.inventory, icon: '📦' },
                    { label: 'Commissions', value: currentStats.commissionPayments, icon: '💰' },
                  ].map(stat => (
                    <div key={stat.label} style={styles.statItem}>
                      <span style={styles.statIcon}>{stat.icon}</span>
                      <span style={styles.statValue}>{stat.value}</span>
                      <span style={styles.statLabel}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>🔍 Data Verification</h3>
                <p style={styles.sectionDesc}>
                  Verify that the data in your browser matches the database.
                </p>
                <button 
                  style={styles.actionBtn}
                  onClick={handleVerifyData}
                  disabled={isProcessing || !apiStatus.connected}
                >
                  🔍 Verify Data Integrity
                </button>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>⚡ Quick Actions</h3>
                <div style={styles.actionButtons}>
                  <button 
                    style={styles.actionBtn}
                    onClick={handleExport}
                    disabled={isProcessing || !apiStatus.connected}
                  >
                    📤 Export Backup
                  </button>
                  <button 
                    style={styles.actionBtnSecondary}
                    onClick={handleImportClick}
                    disabled={isProcessing || !apiStatus.connected}
                  >
                    📥 Import Backup
                  </button>
                  <button 
                    style={styles.actionBtnSecondary}
                    onClick={checkApiConnection}
                    disabled={isProcessing}
                  >
                    🔄 Refresh Status
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div style={styles.tabContent}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📤 Export Database Backup</h3>
                <p style={styles.sectionDesc}>
                  Download a complete backup of all CRM data as a JSON file. 
                  This file can be used to restore data or transfer to another system.
                </p>

                <div style={styles.exportInfo}>
                  <h4>Data to be exported:</h4>
                  <ul style={styles.exportList}>
                    <li>✓ {currentStats.customers} Customers</li>
                    <li>✓ {currentStats.brokers} Brokers</li>
                    <li>✓ {currentStats.companyReps} Company Representatives</li>
                    <li>✓ {currentStats.projects} Projects/Transactions</li>
                    <li>✓ {currentStats.receipts} Receipts</li>
                    <li>✓ {currentStats.interactions} Interactions</li>
                    <li>✓ {currentStats.inventory} Inventory Items</li>
                    <li>✓ {currentStats.commissionPayments} Commission Payments</li>
                    <li>✓ System Settings</li>
                  </ul>
                </div>

                <button 
                  style={{ ...styles.actionBtn, marginTop: '16px' }}
                  onClick={handleExport}
                  disabled={isProcessing || !apiStatus.connected}
                >
                  {isProcessing ? '⏳ Exporting...' : '📥 Download Backup File'}
                </button>

                {lastExport && (
                  <div style={styles.lastExport}>
                    <p><strong>Last Export:</strong></p>
                    <p>📁 {lastExport.filename}</p>
                    <p>🕐 {formatDate(lastExport.timestamp)}</p>
                    <p>📊 {Object.values(lastExport.stats).reduce((a,b)=>a+b,0)} records</p>
                  </div>
                )}
              </div>

              <div style={styles.tipsBox}>
                <h4 style={styles.tipsTitle}>💡 Export Best Practices</h4>
                <ul style={styles.tipsList}>
                  <li>Export backups regularly (daily recommended)</li>
                  <li>Store backups in multiple locations</li>
                  <li>Test restore process periodically</li>
                  <li>Keep at least 7 days of backups</li>
                </ul>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div style={styles.tabContent}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📥 Import Backup Data</h3>
                <p style={styles.sectionDesc}>
                  Restore data from a previously exported JSON backup file. 
                  Existing records with matching IDs will be updated (upsert).
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <button 
                  style={{ ...styles.actionBtn, marginTop: '16px' }}
                  onClick={handleImportClick}
                  disabled={isProcessing || !apiStatus.connected}
                >
                  {isProcessing ? '⏳ Importing...' : '📂 Select Backup File'}
                </button>
              </div>

              {importStats && (
                <div style={styles.importResults}>
                  <h4>Last Import Results:</h4>
                  <table style={styles.statsTable}>
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Imported</th>
                        <th>Skipped</th>
                        <th>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(importStats).map(([key, stats]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td style={{ color: '#10b981' }}>{stats.imported || 0}</td>
                          <td style={{ color: '#f59e0b' }}>{stats.skipped || 0}</td>
                          <td style={{ color: '#ef4444' }}>{stats.errors || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={styles.warningBox}>
                <h4 style={styles.warningTitle}>⚠️ Important Notes</h4>
                <ul style={styles.warningList}>
                  <li>Only import files exported from Sitara CRM</li>
                  <li>Records with matching IDs will be <strong>overwritten</strong></li>
                  <li>Orphaned records (referencing non-existent parents) will be skipped</li>
                  <li>Large imports may take several minutes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div style={styles.tabContent}>
              <div style={styles.dangerSection}>
                <h3 style={styles.dangerTitle}>⚠️ Danger Zone</h3>
                <p style={styles.dangerDesc}>
                  The following actions are destructive and cannot be undone. 
                  Please ensure you have a backup before proceeding.
                </p>

                <div style={styles.dangerAction}>
                  <div>
                    <h4 style={styles.dangerActionTitle}>🗑️ Clear All Data</h4>
                    <p style={styles.dangerActionDesc}>
                      Permanently delete ALL data from the database. This includes all customers, 
                      brokers, projects, receipts, and other records. This action cannot be reversed.
                    </p>
                  </div>
                  <button 
                    style={styles.dangerBtn}
                    onClick={handleClearAll}
                    disabled={isProcessing || !apiStatus.connected}
                  >
                    🗑️ Clear All Data
                  </button>
                </div>

                <div style={styles.dangerWarning}>
                  <p><strong>Before clearing data:</strong></p>
                  <ol style={styles.dangerSteps}>
                    <li>Go to the Export tab and download a backup</li>
                    <li>Verify the backup file contains all your data</li>
                    <li>Store the backup in a safe location</li>
                    <li>Then return here to clear data</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div style={styles.processingOverlay}>
            <div style={styles.spinner}>⏳</div>
            <p style={styles.processingText}>Processing... Please wait</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== STYLES ====================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b',
  },
  message: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 16px',
    overflowX: 'auto',
  },
  tab: {
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#6366f1',
    borderBottomColor: '#6366f1',
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
  tabContent: {
    padding: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px',
  },
  sectionDesc: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  statItem: {
    textAlign: 'center',
    padding: '16px 8px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statIcon: {
    fontSize: '20px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '12px 24px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnSecondary: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  exportInfo: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    marginTop: '16px',
  },
  exportList: {
    margin: '8px 0 0 20px',
    lineHeight: '1.8',
    color: '#475569',
  },
  lastExport: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#dcfce7',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#166534',
  },
  tipsBox: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '10px',
    border: '1px solid #fef3c7',
    marginTop: '24px',
  },
  tipsTitle: {
    margin: '0 0 8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.6',
  },
  importResults: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  statsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    marginTop: '8px',
  },
  warningBox: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '10px',
    border: '1px solid #fde68a',
    marginTop: '24px',
  },
  warningTitle: {
    margin: '0 0 8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  warningList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.6',
  },
  dangerSection: {
    padding: '24px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  dangerTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#991b1b',
  },
  dangerDesc: {
    fontSize: '14px',
    color: '#991b1b',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  dangerAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '16px',
  },
  dangerActionTitle: {
    margin: '0 0 4px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#991b1b',
  },
  dangerActionDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#7f1d1d',
    maxWidth: '400px',
  },
  dangerBtn: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  dangerWarning: {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#7f1d1d',
  },
  dangerSteps: {
    margin: '8px 0 0 20px',
    lineHeight: '1.8',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  spinner: {
    fontSize: '48px',
    animation: 'spin 1s linear infinite',
  },
  processingText: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#64748b',
  },
};