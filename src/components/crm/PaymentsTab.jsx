import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';

// ========== FORMATTING HELPERS ==========
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

export default function PaymentsTab() {
  const { 
    projects = [], 
    brokers = [], 
    companyReps = [],
    commissionPayments = [],
    addCommissionPayment,
    getCompanyRep,
    getBroker
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState('commissions'); // 'commissions' | 'creditors'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'broker' | 'companyRep'
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate commission summaries for all brokers and company reps
  const commissionSummaries = useMemo(() => {
    const summaries = {
      brokers: {},
      companyReps: {},
      totals: {
        totalOwed: 0,
        totalPaid: 0,
        totalPending: 0,
        brokerOwed: 0,
        brokerPaid: 0,
        companyRepOwed: 0,
        companyRepPaid: 0,
      }
    };

    // Calculate from projects
    projects.forEach(p => {
      const sale = parseFloat(p.sale || p.saleValue) || 0;
      
      // Broker commission
      if (p.brokerId) {
        const rate = parseFloat(p.brokerCommissionRate) || 1;
        const commission = (sale * rate) / 100;
        
        if (!summaries.brokers[p.brokerId]) {
          const broker = brokers.find(b => b.id === p.brokerId);
          summaries.brokers[p.brokerId] = {
            id: p.brokerId,
            name: broker?.name || p.brokerName || 'Unknown Broker',
            phone: broker?.phone || '',
            type: 'broker',
            totalDeals: 0,
            totalSales: 0,
            totalOwed: 0,
            totalPaid: 0,
            transactions: []
          };
        }
        summaries.brokers[p.brokerId].totalDeals++;
        summaries.brokers[p.brokerId].totalSales += sale;
        summaries.brokers[p.brokerId].totalOwed += commission;
        summaries.brokers[p.brokerId].transactions.push({
          id: p.id,
          name: p.name || p.projectName,
          sale,
          commission,
          rate
        });
        summaries.totals.brokerOwed += commission;
      }

      // Company Rep commission
      if (p.companyRepId) {
        const rate = parseFloat(p.companyRepCommissionRate) || 1;
        const commission = (sale * rate) / 100;
        
        if (!summaries.companyReps[p.companyRepId]) {
          const rep = companyReps.find(r => r.id === p.companyRepId);
          summaries.companyReps[p.companyRepId] = {
            id: p.companyRepId,
            name: rep?.name || p.companyRepName || 'Unknown Rep',
            phone: rep?.phone || '',
            type: 'companyRep',
            totalDeals: 0,
            totalSales: 0,
            totalOwed: 0,
            totalPaid: 0,
            transactions: []
          };
        }
        summaries.companyReps[p.companyRepId].totalDeals++;
        summaries.companyReps[p.companyRepId].totalSales += sale;
        summaries.companyReps[p.companyRepId].totalOwed += commission;
        summaries.companyReps[p.companyRepId].transactions.push({
          id: p.id,
          name: p.name || p.projectName,
          sale,
          commission,
          rate
        });
        summaries.totals.companyRepOwed += commission;
      }
    });

    // Add payments
    commissionPayments.forEach(payment => {
      if (payment.recipientType === 'broker' && summaries.brokers[payment.recipientId]) {
        summaries.brokers[payment.recipientId].totalPaid += payment.amount;
        summaries.totals.brokerPaid += payment.amount;
      }
      if (payment.recipientType === 'companyRep' && summaries.companyReps[payment.recipientId]) {
        summaries.companyReps[payment.recipientId].totalPaid += payment.amount;
        summaries.totals.companyRepPaid += payment.amount;
      }
    });

    // Calculate totals
    summaries.totals.totalOwed = summaries.totals.brokerOwed + summaries.totals.companyRepOwed;
    summaries.totals.totalPaid = summaries.totals.brokerPaid + summaries.totals.companyRepPaid;
    summaries.totals.totalPending = summaries.totals.totalOwed - summaries.totals.totalPaid;

    return summaries;
  }, [projects, brokers, companyReps, commissionPayments]);

  // Combined list for display
  const allRecipients = useMemo(() => {
    const list = [
      ...Object.values(commissionSummaries.brokers),
      ...Object.values(commissionSummaries.companyReps)
    ];

    return list
      .filter(r => {
        if (filterType !== 'all' && r.type !== filterType) return false;
        if (searchTerm && !r.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (b.totalOwed - b.totalPaid) - (a.totalOwed - a.totalPaid));
  }, [commissionSummaries, filterType, searchTerm]);

  const handleRecordPayment = (recipient) => {
    setSelectedRecipient(recipient);
    setShowPaymentModal(true);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>💰 Payments</h1>
          <p style={styles.subtitle}>Manage commission payments and creditors</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={styles.subTabs}>
        <button
          style={{
            ...styles.subTab,
            ...(activeSubTab === 'commissions' ? styles.subTabActive : {})
          }}
          onClick={() => setActiveSubTab('commissions')}
        >
          🤝 Commission Payments
        </button>
        <button
          style={{
            ...styles.subTab,
            ...(activeSubTab === 'creditors' ? styles.subTabActive : {})
          }}
          onClick={() => setActiveSubTab('creditors')}
        >
          📋 Creditors (Coming Soon)
        </button>
      </div>

      {activeSubTab === 'commissions' && (
        <>
          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>💰</div>
              <div style={styles.statContent}>
                <div style={styles.statValue}>{formatCurrency(commissionSummaries.totals.totalOwed)}</div>
                <div style={styles.statLabel}>Total Commission Owed</div>
              </div>
            </div>
            <div style={{...styles.statCard, borderColor: '#10b981'}}>
              <div style={{...styles.statIcon, backgroundColor: '#d1fae5'}}>✅</div>
              <div style={styles.statContent}>
                <div style={{...styles.statValue, color: '#059669'}}>{formatCurrency(commissionSummaries.totals.totalPaid)}</div>
                <div style={styles.statLabel}>Total Paid</div>
              </div>
            </div>
            <div style={{...styles.statCard, borderColor: '#f59e0b'}}>
              <div style={{...styles.statIcon, backgroundColor: '#fef3c7'}}>⏳</div>
              <div style={styles.statContent}>
                <div style={{...styles.statValue, color: '#d97706'}}>{formatCurrency(commissionSummaries.totals.totalPending)}</div>
                <div style={styles.statLabel}>Pending Payment</div>
              </div>
            </div>
            <div style={{...styles.statCard, borderColor: '#8b5cf6'}}>
              <div style={{...styles.statIcon, backgroundColor: '#ede9fe'}}>🤵</div>
              <div style={styles.statContent}>
                <div style={{...styles.statValue, color: '#7c3aed'}}>
                  {formatCurrency(commissionSummaries.totals.brokerOwed - commissionSummaries.totals.brokerPaid)}
                </div>
                <div style={styles.statLabel}>Broker Pending</div>
              </div>
            </div>
            <div style={{...styles.statCard, borderColor: '#06b6d4'}}>
              <div style={{...styles.statIcon, backgroundColor: '#cffafe'}}>👔</div>
              <div style={styles.statContent}>
                <div style={{...styles.statValue, color: '#0891b2'}}>
                  {formatCurrency(commissionSummaries.totals.companyRepOwed - commissionSummaries.totals.companyRepPaid)}
                </div>
                <div style={styles.statLabel}>Company Rep Pending</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filters}>
            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.filterButtons}>
              <button
                style={{...styles.filterBtn, ...(filterType === 'all' ? styles.filterBtnActive : {})}}
                onClick={() => setFilterType('all')}
              >
                All
              </button>
              <button
                style={{...styles.filterBtn, ...(filterType === 'broker' ? styles.filterBtnActive : {})}}
                onClick={() => setFilterType('broker')}
              >
                🤵 Brokers
              </button>
              <button
                style={{...styles.filterBtn, ...(filterType === 'companyRep' ? styles.filterBtnActive : {})}}
                onClick={() => setFilterType('companyRep')}
              >
                👔 Company Reps
              </button>
            </div>
          </div>

          {/* Recipients List */}
          <div style={styles.recipientsList}>
            {allRecipients.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💰</div>
                <h3 style={styles.emptyTitle}>No Commission Data</h3>
                <p style={styles.emptyText}>Commission data will appear here when transactions have brokers or company reps assigned.</p>
              </div>
            ) : (
              allRecipients.map(recipient => {
                const pending = recipient.totalOwed - recipient.totalPaid;
                const paidPercentage = recipient.totalOwed > 0 
                  ? Math.round((recipient.totalPaid / recipient.totalOwed) * 100) 
                  : 0;

                return (
                  <div key={`${recipient.type}-${recipient.id}`} style={styles.recipientCard}>
                    <div style={styles.recipientHeader}>
                      <div style={styles.recipientInfo}>
                        <span style={{
                          ...styles.recipientBadge,
                          backgroundColor: recipient.type === 'broker' ? '#f3e8ff' : '#d1fae5',
                          color: recipient.type === 'broker' ? '#7c3aed' : '#059669'
                        }}>
                          {recipient.type === 'broker' ? '🤵 Broker' : '👔 Company Rep'}
                        </span>
                        <h3 style={styles.recipientName}>{recipient.name}</h3>
                        {recipient.phone && <span style={styles.recipientPhone}>{recipient.phone}</span>}
                      </div>
                      <button
                        style={styles.payBtn}
                        onClick={() => handleRecordPayment(recipient)}
                        disabled={pending <= 0}
                      >
                        💳 Record Payment
                      </button>
                    </div>

                    <div style={styles.recipientStats}>
                      <div style={styles.recipientStat}>
                        <div style={styles.recipientStatLabel}>Deals</div>
                        <div style={styles.recipientStatValue}>{recipient.totalDeals}</div>
                      </div>
                      <div style={styles.recipientStat}>
                        <div style={styles.recipientStatLabel}>Total Sales</div>
                        <div style={styles.recipientStatValue}>{formatCurrency(recipient.totalSales)}</div>
                      </div>
                      <div style={styles.recipientStat}>
                        <div style={styles.recipientStatLabel}>Commission Owed</div>
                        <div style={{...styles.recipientStatValue, color: '#6366f1'}}>{formatCurrency(recipient.totalOwed)}</div>
                      </div>
                      <div style={styles.recipientStat}>
                        <div style={styles.recipientStatLabel}>Paid</div>
                        <div style={{...styles.recipientStatValue, color: '#059669'}}>{formatCurrency(recipient.totalPaid)}</div>
                      </div>
                      <div style={styles.recipientStat}>
                        <div style={styles.recipientStatLabel}>Pending</div>
                        <div style={{...styles.recipientStatValue, color: pending > 0 ? '#d97706' : '#059669'}}>
                          {formatCurrency(pending)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={styles.progressContainer}>
                      <div style={styles.progressLabel}>
                        <span>Payment Progress</span>
                        <span>{paidPercentage}%</span>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${paidPercentage}%`,
                          backgroundColor: paidPercentage === 100 ? '#10b981' : '#6366f1'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeSubTab === 'creditors' && (
        <div style={styles.comingSoon}>
          <div style={styles.comingSoonIcon}>🏗️</div>
          <h2 style={styles.comingSoonTitle}>Creditors Module Coming Soon</h2>
          <p style={styles.comingSoonText}>
            This section will allow you to manage creditor accounts, track payables, and record payments to vendors and suppliers.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedRecipient && (
        <RecordPaymentModal
          recipient={selectedRecipient}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedRecipient(null);
          }}
          onSave={(paymentData) => {
            addCommissionPayment?.(paymentData);
            setShowPaymentModal(false);
            setSelectedRecipient(null);
          }}
        />
      )}
    </div>
  );
}

// ========== RECORD PAYMENT MODAL ==========
function RecordPaymentModal({ recipient, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const pending = recipient.totalOwed - recipient.totalPaid;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (paymentAmount > pending) {
      setError(`Amount cannot exceed pending balance (${formatCurrency(pending)})`);
      return;
    }

    onSave({
      id: `cp_${Date.now()}`,
      recipientId: recipient.id,
      recipientType: recipient.type,
      recipientName: recipient.name,
      amount: paymentAmount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <button style={modalStyles.closeBtn} onClick={onClose}>×</button>
        
        <div style={modalStyles.header}>
          <div style={{
            ...modalStyles.headerIcon,
            background: recipient.type === 'broker' 
              ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)'
              : 'linear-gradient(135deg, #059669 0%, #34d399 100%)'
          }}>
            {recipient.type === 'broker' ? '🤵' : '👔'}
          </div>
          <div>
            <h2 style={modalStyles.title}>Record Payment</h2>
            <p style={modalStyles.subtitle}>{recipient.name}</p>
          </div>
        </div>

        {/* Balance Summary */}
        <div style={modalStyles.balanceSummary}>
          <div style={modalStyles.balanceItem}>
            <span style={modalStyles.balanceLabel}>Total Owed</span>
            <span style={modalStyles.balanceValue}>{formatCurrency(recipient.totalOwed)}</span>
          </div>
          <div style={modalStyles.balanceItem}>
            <span style={modalStyles.balanceLabel}>Already Paid</span>
            <span style={{...modalStyles.balanceValue, color: '#059669'}}>{formatCurrency(recipient.totalPaid)}</span>
          </div>
          <div style={{...modalStyles.balanceItem, backgroundColor: '#fef3c7'}}>
            <span style={modalStyles.balanceLabel}>Pending</span>
            <span style={{...modalStyles.balanceValue, color: '#d97706', fontWeight: '700'}}>{formatCurrency(pending)}</span>
          </div>
        </div>

        {error && (
          <div style={modalStyles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={modalStyles.formGrid}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Payment Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                placeholder="Enter amount"
                style={modalStyles.input}
                autoFocus
              />
              <button 
                type="button"
                style={modalStyles.quickFillBtn}
                onClick={() => setAmount(pending.toString())}
              >
                Pay Full: {formatCurrency(pending)}
              </button>
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={modalStyles.input}
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={modalStyles.input}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Reference Number</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID, cheque no., etc."
                style={modalStyles.input}
              />
            </div>

            <div style={{...modalStyles.formGroup, gridColumn: '1 / -1'}}>
              <label style={modalStyles.label}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                style={{...modalStyles.input, minHeight: '80px', resize: 'vertical'}}
              />
            </div>
          </div>

          <div style={modalStyles.actions}>
            <button type="button" style={modalStyles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={modalStyles.submitBtn}>
              💳 Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== STYLES ==========
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  subTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '0',
  },
  subTab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    marginBottom: '-2px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  subTabActive: {
    color: '#6366f1',
    borderBottomColor: '#6366f1',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '2px solid #e2e8f0',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  statContent: {},
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: '1',
    minWidth: '250px',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterBtn: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterBtnActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    color: '#fff',
  },
  recipientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  recipientCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  recipientHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  recipientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recipientBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    width: 'fit-content',
  },
  recipientName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  recipientPhone: {
    fontSize: '14px',
    color: '#64748b',
  },
  payBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  recipientStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  recipientStat: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  recipientStatLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
  },
  recipientStatValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
  },
  progressContainer: {
    marginTop: '8px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '6px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
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
    margin: 0,
  },
  comingSoon: {
    textAlign: 'center',
    padding: '80px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
  },
  comingSoonIcon: {
    fontSize: '72px',
    marginBottom: '24px',
  },
  comingSoonTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  comingSoonText: {
    fontSize: '16px',
    color: '#64748b',
    maxWidth: '500px',
    margin: '0 auto',
  },
};

const modalStyles = {
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
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '32px',
    position: 'relative',
  },
  closeBtn: {
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
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  balanceSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  balanceItem: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    textAlign: 'center',
  },
  balanceLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
  },
  balanceValue: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '16px',
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
    width: '100%',
    boxSizing: 'border-box',
  },
  quickFillBtn: {
    marginTop: '4px',
    padding: '6px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#059669',
    cursor: 'pointer',
    textAlign: 'left',
  },
  actions: {
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
  submitBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};