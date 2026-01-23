import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';

export default function BackupManager({ onClose }) {
  const {
    storageInfo,
    lastSaved,
    saveStatus,
    createManualBackup,
    getBackupList,
    restoreFromBackup,
    deleteBackup,
    cleanupOldBackups,
    importBackup,
    exportToFile,
    clearAllData,
    customers,
    projects,
    receipts,
    inventory,
    interactions
  } = useData();

  const [backups, setBackups] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    refreshBackupList();
  }, []);

  const refreshBackupList = () => {
    setBackups(getBackupList());
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateBackup = async () => {
    setIsProcessing(true);
    try {
      const result = createManualBackup();
      if (result.success) {
        showMessage('Backup created successfully!', 'success');
        refreshBackupList();
      } else {
        showMessage('Failed to create backup: ' + result.error, 'error');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    }
    setIsProcessing(false);
  };

  const handleExport = () => {
    setIsProcessing(true);
    try {
      const result = exportToFile();
      if (result.success) {
        showMessage('Exported to ' + result.filename, 'success');
      }
    } catch (error) {
      showMessage('Export failed: ' + error.message, 'error');
    }
    setIsProcessing(false);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showMessage('File is too large. Maximum size is 10MB.', 'error');
      event.target.value = '';
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = importBackup(e.target.result);
        console.log('Import result:', result);
        
        if (result.success) {
          const stats = result.stats || {};
          let msg = `Import successful! Loaded: ${stats.customers || 0} customers, ${stats.projects || 0} transactions, ${stats.receipts || 0} receipts`;
          
          if (stats.brokers > 0) {
            msg += `, ${stats.brokers} brokers`;
          }
          
          if (result.warnings?.length > 0) {
            msg += `. Warnings: ${result.warnings.join(', ')}`;
          }
          
          showMessage(msg, 'success');
          refreshBackupList();
          
          // Refresh the entire app data
          setTimeout(() => {
            window.location.reload(); // Or use a state update to refresh data
          }, 1000);
        } else {
          let errorMsg = 'Import failed: ';
          if (result.errors) {
            errorMsg += result.errors.join(', ');
          } else if (result.error) {
            errorMsg += result.error;
          } else {
            errorMsg += 'Unknown error';
          }
          showMessage(errorMsg, 'error');
        }
      } catch (error) {
        showMessage('Import error: ' + error.message, 'error');
        console.error('Import catch error:', error);
      }
      setIsProcessing(false);
    };
    
    reader.onerror = (error) => {
      showMessage('Failed to read file: ' + error.target.error.message, 'error');
      setIsProcessing(false);
    };
    
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const handleRestore = (backupKey, timestamp) => {
    if (!window.confirm('Are you sure you want to restore from backup created at ' + new Date(timestamp).toLocaleString() + '? Current data will be backed up first.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = restoreFromBackup(backupKey);
      if (result.success) {
        showMessage('Restore successful! Data has been restored from backup.', 'success');
        refreshBackupList();
      } else {
        showMessage('Restore failed: ' + result.error, 'error');
      }
    } catch (error) {
      showMessage('Restore error: ' + error.message, 'error');
    }
    setIsProcessing(false);
  };

  const handleDeleteBackup = (backupKey) => {
    if (!window.confirm('Delete this backup? This cannot be undone.')) return;
    
    const result = deleteBackup(backupKey);
    if (result.success) {
      showMessage('Backup deleted', 'success');
      refreshBackupList();
    } else {
      showMessage('Failed to delete: ' + result.error, 'error');
    }
  };

  const handleCleanup = () => {
    if (!window.confirm('This will delete all but the 5 most recent backups. Continue?')) return;
    
    const count = cleanupOldBackups(5);
    showMessage('Cleaned up ' + count + ' old backups', 'success');
    refreshBackupList();
  };

  const handleClearAll = () => {
    const result = clearAllData();
    if (result) {
      showMessage('All data cleared. A backup was created before clearing.', 'success');
      refreshBackupList();
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBackupTypeStyle = (type) => {
    switch (type) {
      case 'manual': return { bg: '#dbeafe', text: '#1e40af' };
      case 'auto': return { bg: '#dcfce7', text: '#166534' };
      case 'pre-import': return { bg: '#fef3c7', text: '#92400e' };
      case 'pre-restore': return { bg: '#fce7f3', text: '#9d174d' };
      case 'pre-clear': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const currentStats = {
    customers: customers?.length || 0,
    projects: projects?.length || 0,
    receipts: receipts?.length || 0,
    inventory: inventory?.length || 0,
    interactions: interactions?.length || 0
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>💾 Backup & Data Management</h2>
            <p style={styles.subtitle}>
              Last saved: {lastSaved ? formatDate(lastSaved) : 'Never'} • 
              Status: <span style={{ color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'saving' ? '#f59e0b' : '#ef4444' }}>
                {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⏳ Saving...' : '⚠️ Error'}
              </span>
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b'
          }}>
            {message.type === 'success' ? '✓' : '⚠️'} {message.text}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          {['overview', 'backups', 'import-export', 'settings', 'debug'].map(tab => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '📊'} 
              {tab === 'backups' && '📁'} 
              {tab === 'import-export' && '📤'} 
              {tab === 'settings' && '⚙️'} 
              {tab === 'debug' && '🐛'} 
              {' '}{tab === 'import-export' ? 'Import/Export' : tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
</div>

        {/* Content */}
        <div style={styles.content}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={styles.tabContent}>
              {/* Storage Info */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📦 Storage Usage</h3>
                {storageInfo ? (
                  <div style={styles.storageCard}>
                    <div style={styles.storageBar}>
                      <div 
                        style={{
                          ...styles.storageBarFill,
                          width: Math.min(parseFloat(storageInfo.percentUsed), 100) + '%',
                          backgroundColor: parseFloat(storageInfo.percentUsed) > 80 ? '#ef4444' : 
                                          parseFloat(storageInfo.percentUsed) > 50 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    <p style={styles.storageText}>
                      {storageInfo.usedFormatted} used of ~{storageInfo.estimatedMaxFormatted} ({storageInfo.percentUsed}%)
                    </p>
                    <p style={styles.storageSubtext}>
                      CRM Data: {storageInfo.crmDataSizeFormatted}
                    </p>
                  </div>
                ) : (
                  <p>Loading storage info...</p>
                )}
              </div>

              {/* Current Data Stats */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📊 Current Data</h3>
                <div style={styles.statsGrid}>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{currentStats.customers}</span>
                    <span style={styles.statLabel}>Customers</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{currentStats.projects}</span>
                    <span style={styles.statLabel}>Transactions</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{currentStats.receipts}</span>
                    <span style={styles.statLabel}>Receipts</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{currentStats.inventory}</span>
                    <span style={styles.statLabel}>Inventory</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{currentStats.interactions}</span>
                    <span style={styles.statLabel}>Interactions</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>⚡ Quick Actions</h3>
                <div style={styles.actionButtons}>
                  <button 
                    style={styles.actionBtn}
                    onClick={handleCreateBackup}
                    disabled={isProcessing}
                  >
                    💾 Create Backup Now
                  </button>
                  <button 
                    style={styles.actionBtnSecondary}
                    onClick={handleExport}
                    disabled={isProcessing}
                  >
                    📤 Export to File
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <div style={styles.tabContent}>
              <div style={styles.backupHeader}>
                <h3 style={styles.sectionTitle}>📁 Saved Backups ({backups.length})</h3>
                <div style={styles.backupActions}>
                  <button 
                    style={styles.smallBtn}
                    onClick={handleCreateBackup}
                    disabled={isProcessing}
                  >
                    + New Backup
                  </button>
                  <button 
                    style={styles.smallBtnDanger}
                    onClick={handleCleanup}
                    disabled={isProcessing || backups.length <= 5}
                  >
                    🧹 Cleanup Old
                  </button>
                </div>
              </div>

              {backups.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📁</span>
                  <p>No backups yet</p>
                  <p style={styles.emptySubtext}>Backups are created automatically every 5 minutes and after significant changes.</p>
                </div>
              ) : (
                <div style={styles.backupList}>
                  {backups.map((backup) => {
                    const typeStyle = getBackupTypeStyle(backup.type);
                    return (
                      <div key={backup.key} style={styles.backupItem}>
                        <div style={styles.backupInfo}>
                          <div style={styles.backupMeta}>
                            <span style={{
                              ...styles.backupType,
                              backgroundColor: typeStyle.bg,
                              color: typeStyle.text
                            }}>
                              {backup.type}
                            </span>
                            <span style={styles.backupDate}>{formatDate(backup.timestamp)}</span>
                            <span style={styles.backupSize}>{backup.sizeFormatted}</span>
                          </div>
                          <div style={styles.backupCounts}>
                            {backup.recordCounts && (
                              <>
                                <span>👥 {backup.recordCounts.customers}</span>
                                <span>📋 {backup.recordCounts.projects}</span>
                                <span>🧾 {backup.recordCounts.receipts}</span>
                                <span>📦 {backup.recordCounts.inventory}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={styles.backupBtns}>
                          <button
                            style={styles.restoreBtn}
                            onClick={() => handleRestore(backup.key, backup.timestamp)}
                            disabled={isProcessing}
                          >
                            ↩️ Restore
                          </button>
                          <button
                            style={styles.deleteBtn}
                            onClick={() => handleDeleteBackup(backup.key)}
                            disabled={isProcessing}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import-export' && (
            <div style={styles.tabContent}>
              {/* Export Section */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📤 Export Data</h3>
                <p style={styles.sectionDesc}>
                  Download your complete CRM data as a JSON file. Use this for external backups or to transfer data.
                </p>
                <button 
                  style={styles.actionBtn}
                  onClick={handleExport}
                  disabled={isProcessing}
                >
                  📥 Download Backup File
                </button>
              </div>

              {/* Import Section */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📥 Import Data</h3>
                <p style={styles.sectionDesc}>
                  Restore from a previously exported JSON backup file. Your current data will be backed up automatically before import.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
                <button 
                  style={styles.actionBtnSecondary}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  📂 Select File to Import
                </button>
              </div>

              {/* Import Tips */}
              <div style={styles.tipsBox}>
                <h4 style={styles.tipsTitle}>💡 Import Tips</h4>
                <ul style={styles.tipsList}>
                  <li>Only import files exported from Sitara CRM</li>
                  <li>A backup of current data is created before import</li>
                  <li>Duplicate IDs will be detected and warned</li>
                  <li>You can restore previous state from Backups tab if needed</li>
                </ul>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div style={styles.tabContent}>
              {/* Auto-backup Info */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>⏰ Auto-Backup</h3>
                <div style={styles.settingItem}>
                  <span>Auto-backup interval</span>
                  <span style={styles.settingValue}>Every 5 minutes</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Max backups retained</span>
                  <span style={styles.settingValue}>10 backups</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Backup on changes</span>
                  <span style={styles.settingValue}>Every 50 changes</span>
                </div>
              </div>
              {activeTab === 'debug' && (
  <div style={styles.tabContent}>
    <h3 style={styles.sectionTitle}>🐛 Debug Information</h3>
    
    {/* Get all available functions */}
    <div style={{ 
      fontSize: '12px', 
      fontFamily: 'monospace', 
      backgroundColor: '#f1f5f9', 
      padding: '12px', 
      borderRadius: '6px',
      marginBottom: '16px'
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Available functions from context:</p>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '4px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {Object.keys({
          storageInfo,
          lastSaved,
          saveStatus,
          createManualBackup,
          getBackupList,
          restoreFromBackup,
          deleteBackup,
          cleanupOldBackups,
          importBackup,
          exportData,
          exportToFile,
          clearAllData,
          customers,
          projects,
          receipts,
          inventory,
          interactions
        }).map(key => (
          <div key={key} style={{
            padding: '4px 8px',
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
            fontSize: '11px'
          }}>
            {key}: {typeof eval(key) === 'function' ? 'function' : typeof eval(key)}
          </div>
        ))}
      </div>
    </div>


 {/* Backup Information */}
 <div style={{ 
      fontSize: '12px', 
      fontFamily: 'monospace', 
      backgroundColor: '#f1f5f9', 
      padding: '12px', 
      borderRadius: '6px',
      marginBottom: '16px'
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Backup Information:</p>
      <p>Backup count: {backups.length}</p>
      <p>Last backup: {backups[0] ? formatDate(backups[0].timestamp) : 'None'}</p>
      <p>Current data stats: {JSON.stringify(currentStats)}</p>
      <p>Save status: {saveStatus}</p>
      <p>Last saved: {lastSaved ? formatDate(lastSaved) : 'Never'}</p>
    </div>
 {/* Storage Information */}
 {storageInfo && (
      <div style={{ 
        fontSize: '12px', 
        fontFamily: 'monospace', 
        backgroundColor: '#f1f5f9', 
        padding: '12px', 
        borderRadius: '6px',
        marginBottom: '16px'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Storage Information:</p>
        <p>Used: {storageInfo.usedFormatted} ({storageInfo.percentUsed}%)</p>
        <p>CRM Data: {storageInfo.crmDataSizeFormatted}</p>
        <p>Items in localStorage: {storageInfo.itemCount}</p>
      </div>
    )}

    {/* Test Buttons */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <button 
        style={{ 
          padding: '8px 16px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        onClick={() => {
          console.log('Backup Manager Debug:', {
            contextFunctions: {
              storageInfo,
              lastSaved,
              saveStatus,
              createManualBackup: typeof createManualBackup,
              getBackupList: typeof getBackupList,
              restoreFromBackup: typeof restoreFromBackup,
              deleteBackup: typeof deleteBackup,
              cleanupOldBackups: typeof cleanupOldBackups,
              importBackup: typeof importBackup,
              exportData: typeof exportData,
              exportToFile: typeof exportToFile,
              clearAllData: typeof clearAllData
            },
            backups: backups,
            currentStats: currentStats,
            storageInfo: storageInfo
          });
          showMessage('Debug info logged to console', 'success');
        }}
      >
        Log Debug Info to Console
      </button>

      <button 
        style={{ 
          padding: '8px 16px',
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        onClick={() => {
          // Test if createManualBackup works
          if (typeof createManualBackup === 'function') {
            const result = createManualBackup();
            console.log('Manual backup result:', result);
            if (result && result.success) {
              showMessage('Test backup created successfully!', 'success');
              refreshBackupList();
            } else {
              showMessage('Test backup failed: ' + (result?.error || 'Unknown error'), 'error');
            }
          } else {
            showMessage('createManualBackup function not available', 'error');
          }
        }}
      >
        Test Create Backup
      </button>

      <button 
        style={{ 
          padding: '8px 16px',
          backgroundColor: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        onClick={() => {
          // Test if exportToFile works
          if (typeof exportToFile === 'function') {
            try {
              const result = exportToFile();
              console.log('Export result:', result);
              if (result && result.success) {
                showMessage('Test export successful!', 'success');
              } else {
                showMessage('Test export failed: ' + (result?.error || 'Unknown error'), 'error');
              }
            } catch (error) {
              showMessage('Export error: ' + error.message, 'error');
            }
          } else {
            showMessage('exportToFile function not available', 'error');
          }
        }}
      >
        Test Export
      </button>
    </div>

    {/* Test Import */}
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Test Import:</h4>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
      <button 
        style={{ 
          padding: '8px 16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        Test Import Backup File
      </button>
    </div>

    {/* Local Storage Info */}
    <div style={{ 
      fontSize: '12px', 
      fontFamily: 'monospace', 
      backgroundColor: '#f1f5f9', 
      padding: '12px', 
      borderRadius: '6px'
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>LocalStorage Keys:</p>
      <div style={{ 
        maxHeight: '150px',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #e2e8f0'
      }}>
        {(() => {
          try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
              keys.push(localStorage.key(i));
            }
            return keys.map((key, index) => (
              <div key={index} style={{ 
                padding: '4px 0',
                borderBottom: index < keys.length - 1 ? '1px solid #f1f5f9' : 'none'
              }}>
                {key}: {localStorage.getItem(key)?.length || 0} chars
              </div>
            ));
          } catch (error) {
            return <div>Error reading localStorage: {error.message}</div>;
          }
        })()}
      </div>
    </div>
  </div>
)}















              {/* Danger Zone */}
              <div style={styles.dangerSection}>
                <h3 style={styles.dangerTitle}>⚠️ Danger Zone</h3>
                <p style={styles.dangerDesc}>
                  Clear all data from the CRM. A backup will be created before clearing. This action cannot be undone without restoring from a backup.
                </p>
                <button 
                  style={styles.dangerBtn}
                  onClick={handleClearAll}
                  disabled={isProcessing}
                >
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div style={styles.processingOverlay}>
            <div style={styles.processingSpinner}>⏳</div>
            <p>Processing...</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
  },
  storageCard: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  storageBar: {
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  storageText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    margin: 0,
  },
  storageSubtext: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0',
  },

  debugContainer: {
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  debugItem: {
    marginBottom: '4px',
    padding: '4px 8px',
    backgroundColor: '#f8fafc',
    borderRadius: '4px',
  },


  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
  },
  statItem: {
    textAlign: 'center',
    padding: '16px 8px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
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
  backupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  backupActions: {
    display: 'flex',
    gap: '8px',
  },
  smallBtn: {
    padding: '8px 12px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  smallBtnDanger: {
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  backupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  backupItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  backupInfo: {
    flex: 1,
  },
  backupMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  backupType: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  backupDate: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  backupSize: {
    fontSize: '13px',
    color: '#64748b',
  },
  backupCounts: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#64748b',
  },
  backupBtns: {
    display: 'flex',
    gap: '8px',
  },
  restoreBtn: {
    padding: '6px 12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tipsBox: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '10px',
    border: '1px solid #fef3c7',
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
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '14px',
    color: '#475569',
  },
  settingValue: {
    fontWeight: '600',
    color: '#1e293b',
  },
  dangerSection: {
    padding: '20px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  dangerTitle: {
    margin: '0 0 8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#991b1b',
  },
  dangerDesc: {
    fontSize: '14px',
    color: '#991b1b',
    marginBottom: '16px',
  },
  dangerBtn: {
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  processingSpinner: {
    fontSize: '48px',
    animation: 'spin 1s linear infinite',
  },
};