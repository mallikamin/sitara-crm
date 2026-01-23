import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';

// ========== BROKER STATUS CONFIG ==========
const STATUS_CONFIG = {
  active: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  inactive: { label: 'Inactive', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' }
};

// ========== FORMAT HELPERS ==========
const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  if (Math.abs(num) >= 10000000) return '₨' + (num / 10000000).toFixed(2) + ' Cr';
  if (Math.abs(num) >= 100000) return '₨' + (num / 100000).toFixed(2) + ' Lac';
  return '₨' + num.toLocaleString('en-PK');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Brokers({ onSelectBroker, onAddBroker }) {
  const { 
    brokers, 
    projects, 
    deleteBroker, 
    bulkImportBrokers,
    getBrokerFinancials 
  } = useData();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [bulkUploadData, setBulkUploadData] = useState('');
  const [bulkUploadResult, setBulkUploadResult] = useState(null);

  // Calculate broker metrics
  const brokersWithMetrics = useMemo(() => {
    return brokers.map(broker => {
      const financials = getBrokerFinancials(broker.id);
      return { ...broker, ...financials };
    });
  }, [brokers, getBrokerFinancials]);

  // Filtered and sorted brokers
  const filteredBrokers = useMemo(() => {
    let result = [...brokersWithMetrics];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.name?.toLowerCase().includes(term) ||
        b.phone?.includes(term) ||
        b.company?.toLowerCase().includes(term) ||
        b.email?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(b => b.status === filterStatus);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return (a.name || '').localeCompare(b.name || '');
        case 'name_desc': return (b.name || '').localeCompare(a.name || '');
        case 'deals_desc': return (b.totalDeals || 0) - (a.totalDeals || 0);
        case 'deals_asc': return (a.totalDeals || 0) - (b.totalDeals || 0);
        case 'sales_desc': return (b.totalSales || 0) - (a.totalSales || 0);
        case 'sales_asc': return (a.totalSales || 0) - (b.totalSales || 0);
        case 'commission_desc': return (b.totalCommission || 0) - (a.totalCommission || 0);
        case 'recent': return new Date(b.createdAt) - new Date(a.createdAt);
        default: return 0;
      }
    });

    return result;
  }, [brokersWithMetrics, searchTerm, filterStatus, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const active = brokers.filter(b => b.status === 'active').length;
    const totalDeals = brokersWithMetrics.reduce((sum, b) => sum + (b.totalDeals || 0), 0);
    const totalCommission = brokersWithMetrics.reduce((sum, b) => sum + (b.totalCommission || 0), 0);
    const pendingCommission = brokersWithMetrics.reduce((sum, b) => sum + (b.commissionPending || 0), 0);
    
    return { total: brokers.length, active, totalDeals, totalCommission, pendingCommission };
  }, [brokers, brokersWithMetrics]);

  // Handle delete
  const handleDelete = (brokerId) => {
    deleteBroker(brokerId);
    setShowDeleteConfirm(null);
  };

  // Handle bulk upload
  const handleBulkUpload = () => {
    try {
      const lines = bulkUploadData.trim().split('\n').filter(line => line.trim());
      const brokersToImport = [];

      lines.forEach((line, index) => {
        // Skip header if present
        if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('phone'))) {
          return;
        }

        // Parse CSV/Tab separated
        const parts = line.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        
        if (parts.length >= 2) {
          brokersToImport.push({
            name: parts[0],
            phone: parts[1],
            company: parts[2] || ''
          });
        }
      });

      if (brokersToImport.length === 0) {
        setBulkUploadResult({ error: 'No valid data found. Please check format.' });
        return;
      }

      const result = bulkImportBrokers(brokersToImport);
      setBulkUploadResult(result);
      
      if (result.added.length > 0) {
        setBulkUploadData('');
      }
    } catch (error) {
      setBulkUploadResult({ error: error.message });
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = 'Name,Phone,Company\nJohn Broker,03001234567,ABC Realtors\nJane Agent,03219876543,XYZ Properties';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'broker_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Brokers</h1>
            <p style={styles.subtitle}>Manage your broker network and track commissions</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.bulkButton} onClick={() => setShowBulkUpload(true)}>
              <span>📤</span> Bulk Upload
            </button>
            <button style={styles.addButton} onClick={onAddBroker}>
              <span style={styles.addIcon}>+</span> Add Broker
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🤵</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total Brokers</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statInfo}>
            <span style={{...styles.statValue, color: '#10b981'}}>{stats.active}</span>
            <span style={styles.statLabel}>Active</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.totalDeals}</span>
            <span style={styles.statLabel}>Total Deals</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statInfo}>
            <span style={{...styles.statValue, color: '#6366f1'}}>{formatCurrency(stats.totalCommission)}</span>
            <span style={styles.statLabel}>Total Commission</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statInfo}>
            <span style={{...styles.statValue, color: '#f59e0b'}}>{formatCurrency(stats.pendingCommission)}</span>
            <span style={styles.statLabel}>Pending Commission</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.controls}>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, phone, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button style={styles.clearSearch} onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={styles.select}
        >
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="deals_desc">Most Deals</option>
          <option value="sales_desc">Highest Sales</option>
          <option value="commission_desc">Highest Commission</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      {/* Results Info */}
      <div style={styles.resultsInfo}>
        Showing {filteredBrokers.length} of {brokers.length} brokers
      </div>

      {/* Brokers Grid */}
      {filteredBrokers.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🤵</div>
          <h3 style={styles.emptyTitle}>
            {brokers.length === 0 ? 'No brokers yet' : 'No matching brokers'}
          </h3>
          <p style={styles.emptyText}>
            {brokers.length === 0
              ? 'Add your first broker to start tracking referrals and commissions.'
              : 'Try adjusting your search or filters.'}
          </p>
          {brokers.length === 0 && (
            <div style={styles.emptyActions}>
              <button style={styles.emptyButton} onClick={onAddBroker}>
                Add First Broker
              </button>
              <button style={styles.emptyButtonSecondary} onClick={() => setShowBulkUpload(true)}>
                Bulk Upload
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.brokersGrid}>
          {filteredBrokers.map((broker, index) => (
            <div
              key={broker.id}
              style={{...styles.brokerCard, animationDelay: `${index * 0.05}s`}}
              onClick={() => onSelectBroker(broker.id)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.avatarSection}>
                  <div style={styles.avatar}>
                    {broker.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={styles.nameSection}>
                    <h3 style={styles.brokerName}>{broker.name}</h3>
                    {broker.company && (
                      <span style={styles.companyName}>{broker.company}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: STATUS_CONFIG[broker.status]?.bg,
                  color: STATUS_CONFIG[broker.status]?.color
                }}>
                  {STATUS_CONFIG[broker.status]?.label || broker.status}
                </span>
              </div>

              <div style={styles.contactInfo}>
                <div style={styles.contactItem}>
                  <span>📞</span>
                  <span>{broker.phone || '-'}</span>
                </div>
                {broker.email && (
                  <div style={styles.contactItem}>
                    <span>📧</span>
                    <span>{broker.email}</span>
                  </div>
                )}
              </div>

              <div style={styles.metricsGrid}>
                <div style={styles.metricItem}>
                  <span style={styles.metricValue}>{broker.totalDeals || 0}</span>
                  <span style={styles.metricLabel}>Deals</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricValue}>{formatCurrency(broker.totalSales || 0)}</span>
                  <span style={styles.metricLabel}>Sales</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={{...styles.metricValue, color: '#10b981'}}>{formatCurrency(broker.commissionPaid || 0)}</span>
                  <span style={styles.metricLabel}>Paid</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={{...styles.metricValue, color: '#f59e0b'}}>{formatCurrency(broker.commissionPending || 0)}</span>
                  <span style={styles.metricLabel}>Pending</span>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <span style={styles.commissionRate}>{broker.commissionRate || 1}% Commission</span>
                <span style={styles.dateAdded}>Added {formatDate(broker.createdAt)}</span>
              </div>

              <div style={styles.cardActions}>
                <button
                  style={styles.viewBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBroker(broker.id);
                  }}
                >
                  View Details
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(broker.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div style={styles.modalOverlay} onClick={() => { setShowBulkUpload(false); setBulkUploadResult(null); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => { setShowBulkUpload(false); setBulkUploadResult(null); }}>×</button>
            
            <h2 style={styles.modalTitle}>📤 Bulk Upload Brokers</h2>
            <p style={styles.modalSubtitle}>Import multiple brokers at once using CSV format</p>

            <div style={styles.templateSection}>
              <p style={styles.templateText}>
                <strong>Format:</strong> Name, Phone, Company (optional)
              </p>
              <button style={styles.templateBtn} onClick={downloadTemplate}>
                📥 Download Template
              </button>
            </div>

            <textarea
              value={bulkUploadData}
              onChange={(e) => setBulkUploadData(e.target.value)}
              placeholder="Paste your data here...&#10;&#10;Example:&#10;John Broker,03001234567,ABC Realtors&#10;Jane Agent,03219876543,XYZ Properties"
              style={styles.uploadTextarea}
            />

            {bulkUploadResult && (
              <div style={{
                ...styles.resultBox,
                backgroundColor: bulkUploadResult.error ? '#fef2f2' : '#f0fdf4',
                borderColor: bulkUploadResult.error ? '#fecaca' : '#bbf7d0'
              }}>
                {bulkUploadResult.error ? (
                  <p style={{ color: '#dc2626', margin: 0 }}>❌ {bulkUploadResult.error}</p>
                ) : (
                  <>
                    <p style={{ color: '#16a34a', margin: '0 0 8px 0', fontWeight: '600' }}>
                      ✅ {bulkUploadResult.added?.length || 0} brokers imported successfully
                    </p>
                    {bulkUploadResult.skipped?.length > 0 && (
                      <p style={{ color: '#ca8a04', margin: '0 0 4px 0', fontSize: '13px' }}>
                        ⚠️ {bulkUploadResult.skipped.length} skipped (duplicate phone numbers)
                      </p>
                    )}
                    {bulkUploadResult.errors?.length > 0 && (
                      <p style={{ color: '#dc2626', margin: 0, fontSize: '13px' }}>
                        ❌ {bulkUploadResult.errors.length} errors (missing name or phone)
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => { setShowBulkUpload(false); setBulkUploadResult(null); }}
              >
                Cancel
              </button>
              <button
                style={styles.uploadBtn}
                onClick={handleBulkUpload}
                disabled={!bulkUploadData.trim()}
              >
                Import Brokers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(null)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmIcon}>⚠️</div>
            <h3 style={styles.confirmTitle}>Delete Broker?</h3>
            <p style={styles.confirmText}>
              This will remove the broker from your system. Existing deals will retain the broker reference but won't be linked to an active profile.
            </p>
            <div style={styles.confirmButtons}>
              <button style={styles.cancelBtn} onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
              <button style={styles.confirmDeleteBtn} onClick={() => handleDelete(showDeleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== STYLES ==========
const styles = {
  container: {
    padding: '0',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    padding: '32px 24px',
    marginBottom: '24px',
    borderRadius: '0 0 24px 24px',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.8)',
    margin: '0',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  bulkButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#1e3a5f',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  addIcon: {
    fontSize: '20px',
    fontWeight: '700',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto 24px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  statIcon: {
    fontSize: '28px',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  controls: {
    display: 'flex',
    gap: '12px',
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto 16px',
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: '1',
    minWidth: '280px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '16px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '14px 40px 14px 44px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#fff',
  },
  clearSearch: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  select: {
    padding: '14px 16px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '150px',
  },
  resultsInfo: {
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto 16px',
    fontSize: '14px',
    color: '#64748b',
  },
  brokersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
    padding: '0 24px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  brokerCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    animation: 'fadeIn 0.3s ease forwards',
    opacity: '0',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  brokerName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0',
  },
  companyName: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f1f5f9',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  metricItem: {
    textAlign: 'center',
  },
  metricValue: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  commissionRate: {
    padding: '4px 8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    fontWeight: '500',
  },
  dateAdded: {},
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  viewBtn: {
    flex: '1',
    padding: '10px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteBtn: {
    padding: '10px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    maxWidth: '400px',
    margin: '0 auto',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  emptyActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  emptyButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyButtonSecondary: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '32px',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  templateSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  templateText: {
    margin: '0',
    fontSize: '14px',
    color: '#475569',
  },
  templateBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  uploadTextarea: {
    width: '100%',
    minHeight: '200px',
    padding: '16px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'monospace',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  resultBox: {
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid',
    marginBottom: '16px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  uploadBtn: {
    padding: '12px 24px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '32px',
    textAlign: 'center',
    maxWidth: '400px',
  },
  confirmIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  confirmTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  confirmText: {
    fontSize: '15px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
  },
  confirmDeleteBtn: {
    flex: '1',
    padding: '12px 20px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Add keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .brokerCard:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    border-color: #3b82f6;
  }
`;
if (!document.querySelector('#broker-styles')) {
  styleSheet.id = 'broker-styles';
  document.head.appendChild(styleSheet);
}