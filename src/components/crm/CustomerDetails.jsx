import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';

// Utility functions
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `₨${num.toLocaleString('en-PK')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'transactions', label: 'Transactions', icon: '💰' },
  { id: 'projects', label: 'Projects', icon: '🏗️' },
  { id: 'receipts', label: 'Receipts', icon: '🧾' },
  { id: 'interactions', label: 'Interactions', icon: '📞' }
];

const INTERACTION_TYPES = {
  call: { icon: '📞', label: 'Phone Call', color: '#10b981' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: '#25d366' },
  sms: { icon: '📱', label: 'SMS', color: '#6366f1' },
  email: { icon: '📧', label: 'Email', color: '#f59e0b' },
  meeting: { icon: '🤝', label: 'Meeting', color: '#8b5cf6' },
  site_visit: { icon: '🏗️', label: 'Site Visit', color: '#ec4899' },
  other: { icon: '📝', label: 'Other', color: '#64748b' }
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#eab308' },
  low: { label: 'Low', color: '#22c55e' }
};

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: '#10b981' },
  follow_up: { label: 'Follow Up', color: '#f59e0b' },
  pending: { label: 'Pending', color: '#6366f1' },
  cancelled: { label: 'Cancelled', color: '#ef4444' }
};

export default function CustomerDetails({ customer, onClose }) {
  // Get data directly from context
  const { projects, receipts, interactions } = useData();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Get transactions for this customer
  // IMPORTANT: projects ARE transactions - they're stored flat at the root level
  const customerTransactions = useMemo(() => {
    if (!customer?.id) return [];
    return (projects || []).filter(p => 
      String(p.customerId) === String(customer.id)
    ).map(p => ({
      ...p,
      // Normalize field names for display
      totalSale: p.sale || p.saleValue || p.totalSale || 0,
      totalReceived: p.received || p.totalReceived || 0,
      totalReceivable: p.receivable || p.totalReceivable || 
        ((p.sale || p.saleValue || 0) - (p.received || p.totalReceived || 0)),
      plotNumber: p.unit || p.unitNumber || p.plotNumber || 'N/A',
      size: p.marlas ? `${p.marlas} Marlas` : (p.size || ''),
      saleDate: p.createdAt || p.saleDate,
    }));
  }, [customer?.id, projects]);

  // Get receipts for this customer
  const customerReceipts = useMemo(() => {
    if (!customer?.id) return [];
    return (receipts || []).filter(r => 
      String(r.customerId) === String(customer.id)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customer?.id, receipts]);

  // Get interactions for this customer
  const customerInteractions = useMemo(() => {
    if (!customer?.id) return [];
    return (interactions || []).filter(i => 
      String(i.customerId) === String(customer.id) ||
      (i.contacts || []).some(c => String(c.id) === String(customer.id))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customer?.id, interactions]);

  // Get unique projects for this customer
  const customerProjects = useMemo(() => {
    // Group transactions by project name
    const projectMap = new Map();
    customerTransactions.forEach(txn => {
      const key = txn.projectName || txn.name || 'Unknown Project';
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          name: key,
          transactions: [],
          totalValue: 0,
          totalReceived: 0,
          location: txn.location || txn.block || ''
        });
      }
      const proj = projectMap.get(key);
      proj.transactions.push(txn);
      proj.totalValue += parseFloat(txn.totalSale) || 0;
      proj.totalReceived += parseFloat(txn.totalReceived) || 0;
    });
    return Array.from(projectMap.values());
  }, [customerTransactions]);

  // Helper function to get cycle months
  const getCycleMonths = (cycle) => {
    switch (cycle) {
      case 'monthly': return 1;
      case 'quarterly': return 3;
      case 'bi_annual': 
      case 'biannual':
      case 'semi_annual': return 6;
      case 'annual':
      case 'yearly': return 12;
      default: return 6; // Default to bi-annual
    }
  };

  // Helper function to calculate aging string
  const getAgingString = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    if (due > today) return null; // Not overdue
    
    const diffMs = today - due;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} overdue`;
    
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    
    if (remainingDays === 0) {
      return `${months} month${months !== 1 ? 's' : ''} overdue`;
    }
    return `${months} month${months !== 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''} overdue`;
  };

  // Helper function to generate installment schedule with partial payment tracking
  const generateInstallmentSchedule = (txn) => {
    const firstDueDate = txn.firstDueDate || txn.nextDue || txn.nextDueDate;
    if (!firstDueDate) return [];
    
    const installmentCount = parseInt(txn.installments) || parseInt(txn.installmentCount) || 4;
    const cycleMonths = getCycleMonths(txn.paymentCycle || txn.cycle);
    const totalSale = parseFloat(txn.sale) || parseFloat(txn.saleValue) || parseFloat(txn.totalSale) || 0;
    const totalReceived = parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
    const installmentAmount = totalSale / installmentCount;
    
    const schedule = [];
    const startDate = new Date(firstDueDate);
    let remainingPayment = totalReceived; // Track how much payment is left to allocate
    
    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
      
      // Allocate payment to this installment
      let paidAmount = 0;
      let status = 'pending';
      
      if (remainingPayment >= installmentAmount) {
        // Fully paid
        paidAmount = installmentAmount;
        remainingPayment -= installmentAmount;
        status = 'paid';
      } else if (remainingPayment > 0) {
        // Partially paid
        paidAmount = remainingPayment;
        remainingPayment = 0;
        status = 'partial';
      }
      
      const remaining = installmentAmount - paidAmount;
      const paidPercentage = (paidAmount / installmentAmount) * 100;
      
      // Calculate aging for overdue installments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateNormalized = new Date(dueDate);
      dueDateNormalized.setHours(0, 0, 0, 0);
      
      const isOverdue = dueDateNormalized <= today && status !== 'paid';
      const aging = isOverdue ? getAgingString(dueDate) : null;
      
      schedule.push({
        number: i + 1,
        dueDate: dueDate,
        amount: installmentAmount,
        paidAmount: paidAmount,
        remaining: remaining,
        paidPercentage: paidPercentage,
        status: status,
        isOverdue: isOverdue,
        aging: aging
      });
    }
    
    return schedule;
  };

  // Helper function to get next due date
  const getNextDueDate = (txn) => {
    const schedule = generateInstallmentSchedule(txn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the first unpaid or partially paid installment that's in the future
    const nextDue = schedule.find(inst => inst.status !== 'paid' && new Date(inst.dueDate) > today);
    
    if (nextDue) {
      return nextDue;
    }
    
    // If all future ones are paid, find first unpaid (could be overdue partial)
    return schedule.find(inst => inst.status !== 'paid') || null;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSale = customerTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.totalSale) || 0), 0
    );
    const totalReceived = customerTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.totalReceived) || 0), 0
    );
    
    // Also count from receipts
    const totalFromReceipts = customerReceipts.reduce((sum, r) => 
      sum + (parseFloat(r.amount) || 0), 0
    );
    
    // Use the higher value for received (transactions might not be updated yet)
    const actualReceived = Math.max(totalReceived, totalFromReceipts);
    const totalReceivable = totalSale - actualReceived;

    // Calculate overdue and future receivables based on installment schedule
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let overdueAmount = 0;
    let futureAmount = 0;
    
    customerTransactions.forEach(txn => {
      const schedule = generateInstallmentSchedule(txn);
      
      if (schedule.length === 0) {
        // No schedule generated, treat all receivable as future
        const receivable = parseFloat(txn.totalReceivable) || 0;
        if (receivable > 0) {
          futureAmount += receivable;
        }
        return;
      }
      
      schedule.forEach(inst => {
        if (inst.status !== 'paid' && inst.remaining > 0) {
          if (inst.isOverdue) {
            overdueAmount += inst.remaining;
          } else {
            futureAmount += inst.remaining;
          }
        }
      });
    });
    
    return { 
      totalSale, 
      totalReceived: actualReceived, 
      totalReceivable,
      overdueAmount,
      futureAmount,
      receiptCount: customerReceipts.length,
      totalFromReceipts
    };
  }, [customerTransactions, customerReceipts]);

  if (!customer) return null;

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.avatar}>
              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div style={styles.headerInfo}>
              <h2 style={styles.customerName}>{customer.name}</h2>
              <div style={styles.customerMeta}>
                {customer.phone && <span>📱 {customer.phone}</span>}
                {customer.email && <span>📧 {customer.email}</span>}
              </div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'transactions' && customerTransactions.length > 0 && (
                <span style={styles.tabBadge}>{customerTransactions.length}</span>
              )}
              {tab.id === 'receipts' && customerReceipts.length > 0 && (
                <span style={styles.tabBadge}>{customerReceipts.length}</span>
              )}
              {tab.id === 'interactions' && customerInteractions.length > 0 && (
                <span style={styles.tabBadge}>{customerInteractions.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={styles.content}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={styles.tabContent}>
              {/* Stats Grid */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Total Sale Value</span>
                  <span style={styles.statValue}>{formatCurrency(stats.totalSale)}</span>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#10b981' }}>
                  <span style={styles.statLabel}>Total Received</span>
                  <span style={{ ...styles.statValue, color: '#10b981' }}>
                    {formatCurrency(stats.totalReceived)}
                  </span>
                  {stats.receiptCount > 0 && (
                    <span style={styles.statSubtext}>
                      ({stats.receiptCount} receipts)
                    </span>
                  )}
                </div>
                <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
                  <span style={styles.statLabel}>Total Receivable</span>
                  <span style={{ ...styles.statValue, color: '#f59e0b' }}>
                    {formatCurrency(stats.totalReceivable)}
                  </span>
                </div>
              </div>

              {/* Overdue vs Future */}
              {stats.totalReceivable > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Payment Status</h3>
                  <div style={styles.paymentStatusGrid}>
                    <div style={styles.overdueCard}>
                      <span style={styles.overdueLabel}>⚠️ Overdue</span>
                      <span style={styles.overdueValue}>
                        {formatCurrency(stats.overdueAmount)}
                      </span>
                    </div>
                    <div style={styles.futureCard}>
                      <span style={styles.futureLabel}>📅 Future Due</span>
                      <span style={styles.futureValue}>
                        {formatCurrency(stats.futureAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Details */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Contact Information</h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Phone</span>
                    <span style={styles.detailValue}>{customer.phone || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Email</span>
                    <span style={styles.detailValue}>{customer.email || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>CNIC</span>
                    <span style={styles.detailValue}>{customer.cnic || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Address</span>
                    <span style={styles.detailValue}>{customer.address || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Type</span>
                    <span style={styles.detailValue}>
                      {customer.type === 'individual' ? 'Customer' : 
                       customer.type === 'broker' ? 'Broker' : 
                       customer.type === 'both' ? 'Customer & Broker' : 
                       customer.type || 'Customer'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Customer Since</span>
                    <span style={styles.detailValue}>{formatDate(customer.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Activity Summary</h3>
                <div style={styles.quickStats}>
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{customerTransactions.length}</span>
                    <span style={styles.quickStatLabel}>Transactions</span>
                  </div>
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{customerProjects.length}</span>
                    <span style={styles.quickStatLabel}>Projects</span>
                  </div>
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{customerReceipts.length}</span>
                    <span style={styles.quickStatLabel}>Receipts</span>
                  </div>
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{customerInteractions.length}</span>
                    <span style={styles.quickStatLabel}>Interactions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div style={styles.tabContent}>
              {customerTransactions.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>💰</span>
                  <p>No transactions found</p>
                  <p style={styles.emptySubtext}>
                    Transactions will appear here when you sell inventory or add transactions.
                  </p>
                </div>
              ) : (
                <div style={styles.list}>
                  {customerTransactions.map(txn => {
                    // Generate installment schedule for this transaction
                    const schedule = generateInstallmentSchedule(txn);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    let txnOverdue = 0;
                    let txnFuture = 0;
                    let nextDueInst = null;
                    let oldestOverdueAging = null;
                    
                    if (schedule.length > 0) {
                      schedule.forEach(inst => {
                        if (inst.status !== 'paid' && inst.remaining > 0) {
                          if (inst.isOverdue) {
                            txnOverdue += inst.remaining;
                            // Track oldest overdue for aging display
                            if (!oldestOverdueAging) {
                              oldestOverdueAging = inst.aging;
                            }
                          } else {
                            txnFuture += inst.remaining;
                            // Set next due date to first future installment with remaining
                            if (!nextDueInst) {
                              nextDueInst = inst;
                            }
                          }
                        }
                      });
                    } else {
                      // Fallback if no schedule
                      const receivable = parseFloat(txn.totalReceivable) || 0;
                      if (receivable > 0) {
                        txnFuture = receivable;
                      }
                    }
                    
                    const txnReceivable = parseFloat(txn.totalReceivable) || 0;
                    const paidInstallments = schedule.filter(s => s.status === 'paid').length;
                    const partialInstallments = schedule.filter(s => s.status === 'partial').length;
                    const totalInstallments = schedule.length || parseInt(txn.installments) || 0;
                    
                    return (
                      <div key={txn.id} style={styles.listItem}>
                        <div style={styles.listItemHeader}>
                          <span style={styles.projectBadge}>{txn.projectName || txn.name}</span>
                          <span style={styles.plotInfo}>
                            {txn.plotNumber} {txn.size && `• ${txn.size}`}
                          </span>
                        </div>
                        <div style={styles.listItemBody}>
                          <div style={styles.amountRow}>
                            <span>Total: {formatCurrency(txn.totalSale)}</span>
                            <span style={{ color: '#10b981' }}>
                              Received: {formatCurrency(txn.totalReceived)}
                            </span>
                          </div>
                          
                          {/* Installment Progress */}
                          {totalInstallments > 0 && (
                            <div style={styles.installmentProgress}>
                              <span style={styles.installmentText}>
                                📊 Installments: {paidInstallments} paid
                                {partialInstallments > 0 && `, ${partialInstallments} partial`}
                                {` of ${totalInstallments}`}
                              </span>
                            </div>
                          )}
                          
                          {/* Overdue and Future Due */}
                          {txnReceivable > 0 && (
                            <div style={styles.dueBreakdown}>
                              {txnOverdue > 0 && (
                                <div style={styles.overdueWithAging}>
                                  <span style={styles.overdueTag}>
                                    ⚠️ Overdue: {formatCurrency(txnOverdue)}
                                  </span>
                                  {oldestOverdueAging && (
                                    <span style={styles.agingTag}>
                                      ⏱️ {oldestOverdueAging}
                                    </span>
                                  )}
                                </div>
                              )}
                              {txnFuture > 0 && (
                                <span style={styles.futureTag}>
                                  📅 Future: {formatCurrency(txnFuture)}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div style={styles.txnMeta}>
                            <span>📅 Sale: {formatDate(txn.saleDate)}</span>
                            {txn.brokerName && <span>🤵 {txn.brokerName}</span>}
                            {nextDueInst && (
                              <span style={styles.nextDueTag}>
                                ⏰ Next: {formatDate(nextDueInst.dueDate)} ({formatCurrency(nextDueInst.remaining)})
                              </span>
                            )}
                            {txn.status && (
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: txn.status === 'active' ? '#dcfce7' : 
                                               txn.status === 'completed' ? '#dbeafe' : '#fef3c7',
                                color: txn.status === 'active' ? '#166534' : 
                                      txn.status === 'completed' ? '#1e40af' : '#92400e'
                              }}>
                                {txn.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div style={styles.tabContent}>
              {customerProjects.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🏗️</span>
                  <p>No projects found</p>
                  <p style={styles.emptySubtext}>
                    Projects will appear here based on transactions.
                  </p>
                </div>
              ) : (
                <div style={styles.list}>
                  {customerProjects.map((project, idx) => {
                    // Calculate overdue/future for this project using installment schedules
                    let projectOverdue = 0;
                    let projectFuture = 0;
                    
                    project.transactions.forEach(txn => {
                      const schedule = generateInstallmentSchedule(txn);
                      
                      if (schedule.length > 0) {
                        schedule.forEach(inst => {
                          if (inst.status !== 'paid' && inst.remaining > 0) {
                            if (inst.isOverdue) {
                              projectOverdue += inst.remaining;
                            } else {
                              projectFuture += inst.remaining;
                            }
                          }
                        });
                      } else {
                        // Fallback
                        const receivable = parseFloat(txn.totalReceivable) || 0;
                        if (receivable > 0) {
                          projectFuture += receivable;
                        }
                      }
                    });
                    
                    const projectDue = project.totalValue - project.totalReceived;
                    
                    return (
                      <div key={idx} style={styles.projectCard}>
                        <div style={styles.listItemHeader}>
                          <span style={styles.projectName}>{project.name}</span>
                          <span style={styles.txnCount}>
                            {project.transactions.length} unit(s)
                          </span>
                        </div>
                        <div style={styles.listItemBody}>
                          {project.location && (
                            <span style={styles.projectLocation}>📍 {project.location}</span>
                          )}
                          <div style={styles.projectFinancials}>
                            <span>Total: {formatCurrency(project.totalValue)}</span>
                            <span style={{ color: '#10b981' }}>
                              Received: {formatCurrency(project.totalReceived)}
                            </span>
                          </div>
                          {/* Overdue and Future Due */}
                          {projectDue > 0 && (
                            <div style={styles.dueBreakdown}>
                              {projectOverdue > 0 && (
                                <span style={styles.overdueTag}>
                                  ⚠️ Overdue: {formatCurrency(projectOverdue)}
                                </span>
                              )}
                              {projectFuture > 0 && (
                                <span style={styles.futureTag}>
                                  📅 Future: {formatCurrency(projectFuture)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Units with Installment Schedule */}
                        <div style={styles.unitsContainer}>
                          {project.transactions.map(txn => {
                            const schedule = generateInstallmentSchedule(txn);
                            
                            return (
                              <div key={txn.id} style={styles.unitCard}>
                                <div style={styles.unitHeader}>
                                  <span style={styles.unitTitle}>
                                    🏠 {txn.plotNumber || txn.unit || 'Unit'}
                                  </span>
                                  <span style={styles.unitValue}>
                                    {formatCurrency(txn.totalSale)}
                                  </span>
                                </div>
                                
                                {/* Installment Schedule Table */}
                                {schedule.length > 0 && (
                                  <div style={styles.scheduleTable}>
                                    <div style={styles.scheduleHeader}>
                                      <span style={styles.scheduleCol}>#</span>
                                      <span style={styles.scheduleColWide}>Due Date</span>
                                      <span style={styles.scheduleCol}>Amount</span>
                                      <span style={styles.scheduleCol}>Received</span>
                                      <span style={styles.scheduleCol}>Balance</span>
                                      <span style={styles.scheduleColWide}>Status</span>
                                    </div>
                                    {schedule.map(inst => (
                                      <div 
                                        key={inst.number} 
                                        style={{
                                          ...styles.scheduleRow,
                                          backgroundColor: inst.status === 'paid' ? '#f0fdf4' : 
                                                          inst.isOverdue ? '#fef2f2' : '#fffbeb'
                                        }}
                                      >
                                        <span style={styles.scheduleCol}>{inst.number}</span>
                                        <span style={styles.scheduleColWide}>
                                          {formatDate(inst.dueDate)}
                                        </span>
                                        <span style={styles.scheduleCol}>
                                          {formatCurrency(inst.amount)}
                                        </span>
                                        <span style={{...styles.scheduleCol, color: '#10b981', fontWeight: '600'}}>
                                          {formatCurrency(inst.paidAmount)}
                                        </span>
                                        <span style={{
                                          ...styles.scheduleCol, 
                                          color: inst.remaining > 0 ? '#dc2626' : '#10b981',
                                          fontWeight: '600'
                                        }}>
                                          {formatCurrency(inst.remaining)}
                                        </span>
                                        <span style={styles.scheduleColWide}>
                                          {inst.status === 'paid' && (
                                            <span style={styles.paidBadge}>✓ Paid</span>
                                          )}
                                          {inst.status === 'partial' && (
                                            <span style={styles.partialBadge}>
                                              ◐ {inst.paidPercentage.toFixed(0)}% Paid
                                            </span>
                                          )}
                                          {inst.status === 'pending' && inst.isOverdue && (
                                            <span style={styles.overdueBadge}>
                                              ⚠️ {inst.aging}
                                            </span>
                                          )}
                                          {inst.status === 'pending' && !inst.isOverdue && (
                                            <span style={styles.pendingBadge}>⏳ Upcoming</span>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Receipts Tab */}
          {activeTab === 'receipts' && (
            <div style={styles.tabContent}>
              {customerReceipts.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🧾</span>
                  <p>No receipts found</p>
                  <p style={styles.emptySubtext}>
                    Receipts will appear here when payments are recorded.
                  </p>
                </div>
              ) : (
                <>
                  {/* Receipt Summary */}
                  <div style={styles.receiptSummary}>
                    <div style={styles.receiptSummaryItem}>
                      <span style={styles.receiptSummaryLabel}>Total Payments</span>
                      <span style={styles.receiptSummaryValue}>
                        {formatCurrency(stats.totalFromReceipts)}
                      </span>
                    </div>
                    <div style={styles.receiptSummaryItem}>
                      <span style={styles.receiptSummaryLabel}>Receipt Count</span>
                      <span style={styles.receiptSummaryValue}>{customerReceipts.length}</span>
                    </div>
                  </div>

                  <div style={styles.list}>
                    {customerReceipts.map(receipt => (
                      <div key={receipt.id} style={styles.listItem}>
                        <div style={styles.listItemHeader}>
                          <span style={styles.receiptAmount}>
                            {formatCurrency(receipt.amount)}
                          </span>
                          <span style={styles.receiptDate}>{formatDate(receipt.date)}</span>
                        </div>
                        <div style={styles.listItemBody}>
                          <span style={styles.paymentMethod}>
                            {receipt.method === 'cash' ? '💵' : 
                             receipt.method === 'cheque' ? '📝' : 
                             receipt.method === 'bank_transfer' ? '🏦' : '💳'}
                            {' '}{(receipt.method || 'cash').replace('_', ' ').toUpperCase()}
                          </span>
                          {receipt.projectName && (
                            <span style={styles.receiptProject}>
                              📋 {receipt.projectName}
                            </span>
                          )}
                          {receipt.reference && (
                            <span style={styles.receiptRef}>Ref: {receipt.reference}</span>
                          )}
                        </div>
                        {receipt.receiptNumber && (
                          <div style={styles.receiptNumber}>
                            #{receipt.receiptNumber}
                          </div>
                        )}
                        {receipt.notes && (
                          <p style={styles.receiptNotes}>{receipt.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Interactions Tab */}
          {activeTab === 'interactions' && (
            <div style={styles.tabContent}>
              {customerInteractions.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📞</span>
                  <p>No interactions recorded</p>
                  <p style={styles.emptySubtext}>
                    Log calls, meetings, and other interactions here.
                  </p>
                </div>
              ) : (
                <div style={styles.list}>
                  {customerInteractions.map(interaction => {
                    const typeConfig = INTERACTION_TYPES[interaction.type] || INTERACTION_TYPES.other;
                    const priorityConfig = PRIORITY_CONFIG[interaction.priority] || PRIORITY_CONFIG.medium;
                    const statusConfig = STATUS_CONFIG[interaction.status] || STATUS_CONFIG.pending;
                    
                    return (
                      <div key={interaction.id} style={styles.interactionItem}>
                        <div style={styles.interactionHeader}>
                          <div style={styles.interactionType}>
                            <span style={{
                              ...styles.typeIconSmall,
                              backgroundColor: typeConfig.color + '20',
                              color: typeConfig.color
                            }}>
                              {typeConfig.icon}
                            </span>
                            <span style={styles.typeText}>{typeConfig.label}</span>
                          </div>
                          <div style={styles.interactionBadges}>
                            <span style={{
                              ...styles.badge,
                              backgroundColor: priorityConfig.color + '15',
                              color: priorityConfig.color
                            }}>
                              {priorityConfig.label}
                            </span>
                            <span style={{
                              ...styles.badge,
                              backgroundColor: statusConfig.color + '15',
                              color: statusConfig.color
                            }}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                        
                        <h4 style={styles.interactionSubject}>{interaction.subject}</h4>
                        
                        {interaction.notes && (
                          <p style={styles.interactionNotes}>
                            {interaction.notes.length > 150 
                              ? interaction.notes.substring(0, 150) + '...' 
                              : interaction.notes}
                          </p>
                        )}
                        
                        {interaction.outcome && (
                          <div style={styles.outcomeBox}>
                            <strong>Outcome:</strong> {interaction.outcome}
                          </div>
                        )}
                        
                        <div style={styles.interactionFooter}>
                          <span>📅 {formatDate(interaction.date)}</span>
                          {interaction.time && <span>⏰ {formatTime(interaction.time)}</span>}
                          {interaction.status === 'follow_up' && interaction.followUpDate && (
                            <span style={styles.followUpTag}>
                              🔔 Follow-up: {formatDate(interaction.followUpDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
    borderRadius: '20px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
  },
  headerInfo: {
    color: '#fff',
  },
  customerName: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
  },
  customerMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    opacity: '0.9',
  },
  closeBtn: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 16px',
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#667eea',
    borderBottomColor: '#667eea',
  },
  tabBadge: {
    backgroundColor: '#667eea',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
  tabContent: {
    padding: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    borderLeft: '4px solid #667eea',
  },
  statLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
  },
  statSubtext: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  paymentStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  overdueCard: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    borderLeft: '4px solid #ef4444',
  },
  overdueLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#991b1b',
    marginBottom: '4px',
  },
  overdueValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#dc2626',
  },
  futureCard: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    borderLeft: '4px solid #f59e0b',
  },
  futureLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#92400e',
    marginBottom: '4px',
  },
  futureValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#d97706',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  detailValue: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1e293b',
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  quickStat: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  quickStatValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: '700',
    color: '#667eea',
  },
  quickStatLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  listItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  projectBadge: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
  plotInfo: {
    fontSize: '14px',
    color: '#64748b',
  },
  listItemBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  amountRow: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    flexWrap: 'wrap',
  },
  txnMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dueBreakdown: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
    flexWrap: 'wrap',
  },
  overdueTag: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  futureTag: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#d97706',
    backgroundColor: '#fffbeb',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  installmentProgress: {
    marginTop: '4px',
  },
  installmentText: {
    fontSize: '13px',
    color: '#6366f1',
    fontWeight: '500',
  },
  nextDueTag: {
    color: '#0891b2',
    fontWeight: '500',
    backgroundColor: '#ecfeff',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  unitInstallments: {
    marginLeft: '8px',
    fontSize: '11px',
    color: '#6366f1',
  },
  overdueWithAging: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  agingTag: {
    fontSize: '12px',
    color: '#991b1b',
    fontWeight: '500',
  },
  projectCard: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  unitsContainer: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  unitCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  unitHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
  },
  unitTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  unitValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#6366f1',
  },
  scheduleTable: {
    fontSize: '12px',
  },
  scheduleHeader: {
    display: 'grid',
    gridTemplateColumns: '40px 90px 1fr 1fr 1fr 120px',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '600',
    color: '#64748b',
  },
  scheduleRow: {
    display: 'grid',
    gridTemplateColumns: '40px 90px 1fr 1fr 1fr 120px',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  },
  scheduleCol: {
    fontSize: '12px',
    color: '#475569',
  },
  scheduleColWide: {
    fontSize: '12px',
    color: '#475569',
  },
  paidBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  partialBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  overdueBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  pendingBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  projectName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  txnCount: {
    fontSize: '13px',
    color: '#64748b',
  },
  projectLocation: {
    fontSize: '14px',
    color: '#64748b',
  },
  projectFinancials: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    flexWrap: 'wrap',
  },
  unitsList: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px dashed #e2e8f0',
  },
  unitItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '13px',
    color: '#64748b',
  },
  receiptSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
  },
  receiptSummaryItem: {
    textAlign: 'center',
  },
  receiptSummaryLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#047857',
    marginBottom: '4px',
  },
  receiptSummaryValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#059669',
  },
  receiptAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#10b981',
  },
  receiptDate: {
    fontSize: '14px',
    color: '#64748b',
  },
  paymentMethod: {
    fontSize: '14px',
    fontWeight: '500',
  },
  receiptProject: {
    fontSize: '13px',
    color: '#6366f1',
  },
  receiptRef: {
    fontSize: '13px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  receiptNumber: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  receiptNotes: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  interactionItem: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  interactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  interactionType: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  typeIconSmall: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '16px',
  },
  typeText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  interactionBadges: {
    display: 'flex',
    gap: '6px',
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  interactionSubject: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  interactionNotes: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  outcomeBox: {
    padding: '10px 12px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#047857',
    marginBottom: '10px',
  },
  interactionFooter: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  followUpTag: {
    color: '#b45309',
    fontWeight: '500',
  },
};