import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';

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

const DEAL_STATUS_COLORS = {
  active: { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#dbeafe', color: '#1e40af' },
  cancelled: { bg: '#fef2f2', color: '#991b1b' },
  pending: { bg: '#fef3c7', color: '#92400e' }
};

const INTERACTION_TYPES = {
  call: { icon: '📞', label: 'Call', color: '#10b981' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: '#25d366' },
  sms: { icon: '📱', label: 'SMS', color: '#6366f1' },
  email: { icon: '📧', label: 'Email', color: '#f59e0b' },
  meeting: { icon: '🤝', label: 'Meeting', color: '#8b5cf6' },
  site_visit: { icon: '🏗️', label: 'Site Visit', color: '#ec4899' },
  other: { icon: '📝', label: 'Other', color: '#64748b' }
};

export default function BrokerDetail({ brokerId, onBack, onEditBroker }) {
  const {
    getBroker,
    getBrokerDeals,
    getBrokerCustomers,
    getBrokerInteractions,
    getBrokerFinancials,
    customers,
    updateBroker
  } = useData();

  const [activeTab, setActiveTab] = useState('deals');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Get broker data
  const broker = useMemo(() => getBroker(brokerId), [brokerId, getBroker]);
  const deals = useMemo(() => getBrokerDeals(brokerId), [brokerId, getBrokerDeals]);
  const brokerCustomers = useMemo(() => getBrokerCustomers(brokerId), [brokerId, getBrokerCustomers]);
  const interactions = useMemo(() => getBrokerInteractions(brokerId), [brokerId, getBrokerInteractions]);
  const financials = useMemo(() => getBrokerFinancials(brokerId), [brokerId, getBrokerFinancials]);

  // Calculate deal metrics per project
  const dealsByProject = useMemo(() => {
    const grouped = {};
    deals.forEach(deal => {
      const projectName = deal.name || deal.projectName || 'Unknown Project';
      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }
      grouped[projectName].push(deal);
    });
    return grouped;
  }, [deals]);

  // Handle edit
  const handleEdit = () => {
    setEditForm({
      name: broker?.name || '',
      phone: broker?.phone || '',
      company: broker?.company || '',
      email: broker?.email || '',
      address: broker?.address || '',
      cnic: broker?.cnic || '',
      commissionRate: broker?.commissionRate || 1,
      bankDetails: broker?.bankDetails || '',
      notes: broker?.notes || '',
      status: broker?.status || 'active'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    updateBroker(brokerId, editForm);
    setShowEditModal(false);
  };

  if (!broker) {
    return (
      <div style={styles.container}>
        <div style={styles.notFound}>
          <div style={styles.notFoundIcon}>🤵</div>
          <h2>Broker Not Found</h2>
          <p>The broker you're looking for doesn't exist or has been deleted.</p>
          <button style={styles.backBtn} onClick={onBack}>← Back to Brokers</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ← Back to Brokers
        </button>
        
        <div style={styles.headerContent}>
          <div style={styles.profileSection}>
            <div style={styles.avatar}>
              {broker.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={styles.profileInfo}>
              <h1 style={styles.brokerName}>{broker.name}</h1>
              <div style={styles.profileMeta}>
                {broker.company && <span style={styles.company}>{broker.company}</span>}
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: broker.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)',
                  color: broker.status === 'active' ? '#059669' : '#6b7280'
                }}>
                  {broker.status === 'active' ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          </div>
          
          <button style={styles.editButton} onClick={handleEdit}>
            ✏️ Edit Profile
          </button>
        </div>

        {/* Contact Info */}
        <div style={styles.contactBar}>
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
          {broker.cnic && (
            <div style={styles.contactItem}>
              <span>🪪</span>
              <span>{broker.cnic}</span>
            </div>
          )}
          <div style={styles.contactItem}>
            <span>💵</span>
            <span>{broker.commissionRate || 1}% Commission</span>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div style={styles.financialCards}>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>📋</div>
          <div style={styles.finContent}>
            <span style={styles.finValue}>{financials.totalDeals}</span>
            <span style={styles.finLabel}>Total Deals</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>💰</div>
          <div style={styles.finContent}>
            <span style={styles.finValue}>{formatCurrency(financials.totalSales)}</span>
            <span style={styles.finLabel}>Total Sales</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>✅</div>
          <div style={styles.finContent}>
            <span style={{...styles.finValue, color: '#10b981'}}>{formatCurrency(financials.totalReceived)}</span>
            <span style={styles.finLabel}>Collected</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>⏳</div>
          <div style={styles.finContent}>
            <span style={{...styles.finValue, color: '#f59e0b'}}>{formatCurrency(financials.totalReceivable)}</span>
            <span style={styles.finLabel}>Receivable</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>🏆</div>
          <div style={styles.finContent}>
            <span style={{...styles.finValue, color: '#6366f1'}}>{formatCurrency(financials.totalCommission)}</span>
            <span style={styles.finLabel}>Commission Owed</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>💸</div>
          <div style={styles.finContent}>
            <span style={{...styles.finValue, color: '#10b981'}}>{formatCurrency(financials.commissionPaid || 0)}</span>
            <span style={styles.finLabel}>Paid</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>📊</div>
          <div style={styles.finContent}>
            <span style={{...styles.finValue, color: '#f59e0b'}}>{formatCurrency(financials.commissionPending)}</span>
            <span style={styles.finLabel}>Pending</span>
          </div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finIcon}>📈</div>
          <div style={styles.finContent}>
            <span style={styles.finValue}>{financials.collectionRate.toFixed(1)}%</span>
            <span style={styles.finLabel}>Collection Rate</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          <button
            style={{...styles.tab, ...(activeTab === 'deals' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('deals')}
          >
            📋 Deals ({deals.length})
          </button>
          <button
            style={{...styles.tab, ...(activeTab === 'customers' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('customers')}
          >
            👥 Customers ({brokerCustomers.length})
          </button>
          <button
            style={{...styles.tab, ...(activeTab === 'interactions' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('interactions')}
          >
            💬 Interactions ({interactions.length})
          </button>
          <button
            style={{...styles.tab, ...(activeTab === 'info' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('info')}
          >
            ℹ️ Info
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {/* Deals Tab */}
        {activeTab === 'deals' && (
          <div style={styles.dealsSection}>
            {deals.length === 0 ? (
              <div style={styles.emptyTab}>
                <span style={styles.emptyIcon}>📋</span>
                <p>No deals found for this broker</p>
              </div>
            ) : (
              <div style={styles.dealsList}>
                {deals.map((deal, index) => {
                  const customer = customers.find(c => String(c.id) === String(deal.customerId));
                  const sale = parseFloat(deal.sale) || 0;
                  const received = parseFloat(deal.received) || 0;
                  const receivable = sale - received;
                  const progress = sale > 0 ? (received / sale) * 100 : 0;
                  const status = deal.status || 'active';
                  
                  return (
                    <div key={deal.id} style={styles.dealCard}>
                      <div style={styles.dealHeader}>
                        <div>
                          <h3 style={styles.dealTitle}>{deal.name || deal.projectName || 'Unknown'}</h3>
                          <span style={styles.dealUnit}>{deal.unit || '-'}</span>
                        </div>
                        <span style={{
                          ...styles.dealStatus,
                          backgroundColor: DEAL_STATUS_COLORS[status]?.bg || '#f3f4f6',
                          color: DEAL_STATUS_COLORS[status]?.color || '#6b7280'
                        }}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                      
                      <div style={styles.dealCustomer}>
                        <span>👤</span>
                        <span>{customer?.name || 'Unknown Customer'}</span>
                      </div>
                      
                      <div style={styles.dealFinancials}>
                        <div style={styles.dealFinItem}>
                          <span style={styles.dealFinLabel}>Sale</span>
                          <span style={styles.dealFinValue}>{formatCurrency(sale)}</span>
                        </div>
                        <div style={styles.dealFinItem}>
                          <span style={styles.dealFinLabel}>Received</span>
                          <span style={{...styles.dealFinValue, color: '#10b981'}}>{formatCurrency(received)}</span>
                        </div>
                        <div style={styles.dealFinItem}>
                          <span style={styles.dealFinLabel}>Due</span>
                          <span style={{...styles.dealFinValue, color: '#f59e0b'}}>{formatCurrency(receivable)}</span>
                        </div>
                        <div style={styles.dealFinItem}>
                          <span style={styles.dealFinLabel}>Commission</span>
                          <span style={{...styles.dealFinValue, color: '#6366f1'}}>
                            {formatCurrency((sale * (broker.commissionRate || 1)) / 100)}
                          </span>
                        </div>
                      </div>
                      
                      <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                          <div style={{...styles.progressFill, width: `${progress}%`}}></div>
                        </div>
                        <span style={styles.progressText}>{progress.toFixed(0)}% collected</span>
                      </div>
                      
                      <div style={styles.dealDate}>
                        Added: {formatDate(deal.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div style={styles.customersSection}>
            {brokerCustomers.length === 0 ? (
              <div style={styles.emptyTab}>
                <span style={styles.emptyIcon}>👥</span>
                <p>No customers referred by this broker yet</p>
              </div>
            ) : (
              <div style={styles.customersList}>
                {brokerCustomers.map(customer => {
                  const customerDeals = deals.filter(d => String(d.customerId) === String(customer.id));
                  const totalValue = customerDeals.reduce((sum, d) => sum + (parseFloat(d.sale) || 0), 0);
                  
                  return (
                    <div key={customer.id} style={styles.customerCard}>
                      <div style={styles.customerAvatar}>
                        {customer.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={styles.customerInfo}>
                        <h4 style={styles.customerName}>{customer.name}</h4>
                        <span style={styles.customerPhone}>{customer.phone || '-'}</span>
                      </div>
                      <div style={styles.customerStats}>
                        <span style={styles.customerDeals}>{customerDeals.length} deals</span>
                        <span style={styles.customerValue}>{formatCurrency(totalValue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Interactions Tab */}
        {activeTab === 'interactions' && (
          <div style={styles.interactionsSection}>
            {interactions.length === 0 ? (
              <div style={styles.emptyTab}>
                <span style={styles.emptyIcon}>💬</span>
                <p>No interactions recorded with this broker</p>
              </div>
            ) : (
              <div style={styles.interactionsList}>
                {interactions
                  .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                  .map(interaction => {
                    const typeConfig = INTERACTION_TYPES[interaction.type] || INTERACTION_TYPES.other;
                    
                    return (
                      <div key={interaction.id} style={styles.interactionCard}>
                        <div style={{
                          ...styles.interactionIcon,
                          backgroundColor: typeConfig.color + '20',
                          color: typeConfig.color
                        }}>
                          {typeConfig.icon}
                        </div>
                        <div style={styles.interactionContent}>
                          <div style={styles.interactionHeader}>
                            <span style={styles.interactionType}>{typeConfig.label}</span>
                            <span style={styles.interactionDate}>
                              {formatDate(interaction.date || interaction.createdAt)}
                              {interaction.time && ` at ${interaction.time}`}
                            </span>
                          </div>
                          {interaction.subject && (
                            <h4 style={styles.interactionSubject}>{interaction.subject}</h4>
                          )}
                          {interaction.notes && (
                            <p style={styles.interactionNotes}>{interaction.notes}</p>
                          )}
                          {interaction.outcome && (
                            <p style={styles.interactionOutcome}>
                              <strong>Outcome:</strong> {interaction.outcome}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div style={styles.infoSection}>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <h3 style={styles.infoTitle}>Contact Information</h3>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Phone</span>
                  <span style={styles.infoValue}>{broker.phone || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Email</span>
                  <span style={styles.infoValue}>{broker.email || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>CNIC</span>
                  <span style={styles.infoValue}>{broker.cnic || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Address</span>
                  <span style={styles.infoValue}>{broker.address || '-'}</span>
                </div>
              </div>
              
              <div style={styles.infoCard}>
                <h3 style={styles.infoTitle}>Business Details</h3>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Company</span>
                  <span style={styles.infoValue}>{broker.company || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Commission Rate</span>
                  <span style={styles.infoValue}>{broker.commissionRate || 1}%</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Bank Details</span>
                  <span style={styles.infoValue}>{broker.bankDetails || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Status</span>
                  <span style={{
                    ...styles.infoValue,
                    color: broker.status === 'active' ? '#10b981' : '#6b7280'
                  }}>
                    {broker.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div style={{...styles.infoCard, gridColumn: '1 / -1'}}>
                <h3 style={styles.infoTitle}>Notes</h3>
                <p style={styles.notesText}>{broker.notes || 'No notes added'}</p>
              </div>
              
              <div style={styles.infoCard}>
                <h3 style={styles.infoTitle}>Record Info</h3>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>ID</span>
                  <span style={{...styles.infoValue, fontFamily: 'monospace', fontSize: '12px'}}>{broker.id}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Created</span>
                  <span style={styles.infoValue}>{formatDate(broker.createdAt)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Last Updated</span>
                  <span style={styles.infoValue}>{formatDate(broker.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowEditModal(false)}>×</button>
            <h2 style={styles.modalTitle}>Edit Broker</h2>
            
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone *</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Company</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={e => setEditForm({...editForm, company: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>CNIC</label>
                <input
                  type="text"
                  value={editForm.cnic}
                  onChange={e => setEditForm({...editForm, cnic: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editForm.commissionRate}
                  onChange={e => setEditForm({...editForm, commissionRate: parseFloat(e.target.value) || 1})}
                  style={styles.input}
                />
              </div>
              
              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm({...editForm, address: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>Bank Details</label>
                <input
                  type="text"
                  value={editForm.bankDetails}
                  onChange={e => setEditForm({...editForm, bankDetails: e.target.value})}
                  style={styles.input}
                  placeholder="Account name, number, bank..."
                />
              </div>
              
              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({...editForm, status: e.target.value})}
                  style={styles.input}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowEditModal(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSaveEdit}>Save Changes</button>
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
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    padding: '20px 24px 24px',
    borderRadius: '0 0 24px 24px',
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '700',
  },
  profileInfo: {},
  brokerName: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  profileMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  company: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '15px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#1e3a5f',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  contactBar: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
  },
  financialCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  finCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  finIcon: {
    fontSize: '24px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
  },
  finContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  finValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
  },
  finLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  tabsContainer: {
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '0',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    marginBottom: '-2px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    color: '#1e3a5f',
    borderBottomColor: '#1e3a5f',
  },
  tabContent: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  emptyTab: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  dealsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '16px',
  },
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  dealHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  dealTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  dealUnit: {
    fontSize: '13px',
    color: '#64748b',
  },
  dealStatus: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  dealCustomer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#475569',
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  dealFinancials: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  dealFinItem: {
    textAlign: 'center',
  },
  dealFinLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '2px',
  },
  dealFinValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  progressContainer: {
    marginBottom: '12px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '11px',
    color: '#64748b',
  },
  dealDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  customersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  customerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  customerAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
  },
  customerInfo: {
    flex: '1',
  },
  customerName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 2px 0',
  },
  customerPhone: {
    fontSize: '13px',
    color: '#64748b',
  },
  customerStats: {
    textAlign: 'right',
  },
  customerDeals: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
  },
  customerValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  interactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  interactionCard: {
    display: 'flex',
    gap: '16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  interactionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: '0',
  },
  interactionContent: {
    flex: '1',
  },
  interactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  interactionType: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  interactionDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  interactionSubject: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  interactionNotes: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 6px 0',
    lineHeight: '1.5',
  },
  interactionOutcome: {
    fontSize: '13px',
    color: '#475569',
    margin: '0',
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px',
  },
  infoSection: {
    maxWidth: '900px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  notesText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '0',
  },
  notFound: {
    textAlign: 'center',
    padding: '80px 24px',
  },
  notFoundIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  backBtn: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
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
    maxWidth: '600px',
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
    margin: '0 0 24px 0',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    padding: '12px 14px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #f1f5f9',
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
  saveBtn: {
    padding: '12px 24px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};