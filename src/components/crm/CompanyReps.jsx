import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';

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

// Date range helpers
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

const isThisWeek = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
};

const isThisMonth = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export default function CompanyReps() {
  const { 
    companyReps = [], 
    projects = [],
    interactions = [],
    commissionPayments = [],
    addCompanyRep,
    updateCompanyRep,
    deleteCompanyRep
  } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRepId, setSelectedRepId] = useState(null);

  // ========== PERFORMANCE DASHBOARD DATA ==========
  const performanceDashboard = useMemo(() => {
    const targetInteractions = selectedRepId 
      ? interactions.filter(i => i.companyRepId === selectedRepId)
      : interactions.filter(i => i.companyRepId);

    const targetDeals = selectedRepId
      ? projects.filter(p => p.companyRepId === selectedRepId)
      : projects.filter(p => p.companyRepId);

    const calcPeriod = (filterFn) => {
      const periodInteractions = targetInteractions.filter(i => filterFn(i.date || i.createdAt));
      return {
        total: periodInteractions.length,
        calls: periodInteractions.filter(i => i.type === 'call').length,
        meetings: periodInteractions.filter(i => i.type === 'meeting').length,
        siteVisits: periodInteractions.filter(i => i.type === 'site_visit').length,
        whatsapp: periodInteractions.filter(i => i.type === 'whatsapp').length,
        conversions: targetDeals.filter(p => filterFn(p.createdAt)).length,
      };
    };

    return {
      today: calcPeriod(isToday),
      thisWeek: calcPeriod(isThisWeek),
      thisMonth: calcPeriod(isThisMonth),
      allTime: {
        total: targetInteractions.length,
        calls: targetInteractions.filter(i => i.type === 'call').length,
        meetings: targetInteractions.filter(i => i.type === 'meeting').length,
        siteVisits: targetInteractions.filter(i => i.type === 'site_visit').length,
        whatsapp: targetInteractions.filter(i => i.type === 'whatsapp').length,
        conversions: targetDeals.length,
      }
    };
  }, [selectedRepId, interactions, projects]);

  // Calculate stats for each company rep
  const repsWithStats = useMemo(() => {
    return companyReps.map(rep => {
      const deals = projects.filter(p => p.companyRepId === rep.id);
      const totalSales = deals.reduce((sum, p) => sum + (parseFloat(p.sale || p.saleValue) || 0), 0);
      const totalCommission = deals.reduce((sum, p) => {
        const sale = parseFloat(p.sale || p.saleValue) || 0;
        const rate = parseFloat(p.companyRepCommissionRate) || 1;
        return sum + (sale * rate / 100);
      }, 0);

      // Get actual payments
      const payments = (commissionPayments || []).filter(
        p => p.recipientId === rep.id && p.recipientType === 'companyRep'
      );
      const commissionPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const repInteractions = interactions.filter(i => i.companyRepId === rep.id);
      
      // Time-based activity
      const todayActivity = repInteractions.filter(i => isToday(i.date || i.createdAt)).length;
      const weekActivity = repInteractions.filter(i => isThisWeek(i.date || i.createdAt)).length;
      const monthActivity = repInteractions.filter(i => isThisMonth(i.date || i.createdAt)).length;

      return {
        ...rep,
        totalDeals: deals.length,
        totalSales,
        totalCommission,
        commissionPaid,
        commissionPending: totalCommission - commissionPaid,
        totalInteractions: repInteractions.length,
        todayActivity,
        weekActivity,
        monthActivity,
        conversionRate: repInteractions.length > 0 
          ? ((deals.length / repInteractions.length) * 100).toFixed(1)
          : '0.0'
      };
    });
  }, [companyReps, projects, interactions, commissionPayments]);

  // Filter reps
  const filteredReps = useMemo(() => {
    return repsWithStats.filter(rep => {
      const matchesSearch = !searchTerm || 
        rep.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.phone?.includes(searchTerm) ||
        rep.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || rep.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [repsWithStats, searchTerm, statusFilter]);

  // Overall stats
  const overallStats = useMemo(() => ({
    total: companyReps.length,
    active: companyReps.filter(r => r.status === 'active').length,
    totalDeals: repsWithStats.reduce((sum, r) => sum + r.totalDeals, 0),
    totalSales: repsWithStats.reduce((sum, r) => sum + r.totalSales, 0),
    totalCommission: repsWithStats.reduce((sum, r) => sum + r.totalCommission, 0),
    totalPaid: repsWithStats.reduce((sum, r) => sum + r.commissionPaid, 0),
    totalInteractions: repsWithStats.reduce((sum, r) => sum + r.totalInteractions, 0),
  }), [companyReps, repsWithStats]);

  const handleAddRep = (repData) => {
    addCompanyRep?.({
      ...repData,
      id: `rep_${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    setShowAddModal(false);
  };

  const handleUpdateRep = (repData) => {
    updateCompanyRep?.(editingRep.id, repData);
    setEditingRep(null);
  };

  const handleDeleteRep = (repId) => {
    if (window.confirm('Are you sure you want to delete this company rep?')) {
      deleteCompanyRep?.(repId);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👔 Company Reps</h1>
          <p style={styles.subtitle}>Manage internal sales representatives & track performance</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
          + Add Company Rep
        </button>
      </div>

      {/* ========== PERFORMANCE DASHBOARD ========== */}
      <div style={styles.dashboardContainer}>
        <div style={styles.dashboardHeader}>
          <h2 style={styles.dashboardTitle}>📊 Performance Dashboard</h2>
          <select
            value={selectedRepId || ''}
            onChange={(e) => setSelectedRepId(e.target.value || null)}
            style={styles.repSelect}
          >
            <option value="" style={{background: '#1e293b', color: '#fff'}}>All Company Reps</option>
            {companyReps.filter(r => r.status === 'active').map(rep => (
              <option key={rep.id} value={rep.id} style={{background: '#1e293b', color: '#fff'}}>{rep.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.periodGrid}>
          {/* Today */}
          <div style={styles.periodCard}>
            <div style={styles.periodHeader}>
              <span style={styles.periodIcon}>📅</span>
              <span style={styles.periodTitle}>Today</span>
            </div>
            <div style={styles.periodStats}>
              <div style={styles.periodMainStat}>
                <span style={styles.periodMainValue}>{performanceDashboard.today.total}</span>
                <span style={styles.periodMainLabel}>Total Attempts</span>
              </div>
              <div style={styles.periodBreakdown}>
                <div style={styles.breakdownItem}><span>📞</span><span>{performanceDashboard.today.calls}</span></div>
                <div style={styles.breakdownItem}><span>🤝</span><span>{performanceDashboard.today.meetings}</span></div>
                <div style={styles.breakdownItem}><span>🏗️</span><span>{performanceDashboard.today.siteVisits}</span></div>
                <div style={styles.breakdownItem}><span>💬</span><span>{performanceDashboard.today.whatsapp}</span></div>
              </div>
              <div style={styles.conversionStat}>
                <span>✅ Conversions</span>
                <span style={styles.conversionValue}>{performanceDashboard.today.conversions}</span>
              </div>
            </div>
          </div>

          {/* This Week */}
          <div style={styles.periodCard}>
            <div style={styles.periodHeader}>
              <span style={styles.periodIcon}>📆</span>
              <span style={styles.periodTitle}>This Week</span>
            </div>
            <div style={styles.periodStats}>
              <div style={styles.periodMainStat}>
                <span style={styles.periodMainValue}>{performanceDashboard.thisWeek.total}</span>
                <span style={styles.periodMainLabel}>Total Attempts</span>
              </div>
              <div style={styles.periodBreakdown}>
                <div style={styles.breakdownItem}><span>📞</span><span>{performanceDashboard.thisWeek.calls}</span></div>
                <div style={styles.breakdownItem}><span>🤝</span><span>{performanceDashboard.thisWeek.meetings}</span></div>
                <div style={styles.breakdownItem}><span>🏗️</span><span>{performanceDashboard.thisWeek.siteVisits}</span></div>
                <div style={styles.breakdownItem}><span>💬</span><span>{performanceDashboard.thisWeek.whatsapp}</span></div>
              </div>
              <div style={styles.conversionStat}>
                <span>✅ Conversions</span>
                <span style={styles.conversionValue}>{performanceDashboard.thisWeek.conversions}</span>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div style={styles.periodCard}>
            <div style={styles.periodHeader}>
              <span style={styles.periodIcon}>🗓️</span>
              <span style={styles.periodTitle}>This Month</span>
            </div>
            <div style={styles.periodStats}>
              <div style={styles.periodMainStat}>
                <span style={styles.periodMainValue}>{performanceDashboard.thisMonth.total}</span>
                <span style={styles.periodMainLabel}>Total Attempts</span>
              </div>
              <div style={styles.periodBreakdown}>
                <div style={styles.breakdownItem}><span>📞</span><span>{performanceDashboard.thisMonth.calls}</span></div>
                <div style={styles.breakdownItem}><span>🤝</span><span>{performanceDashboard.thisMonth.meetings}</span></div>
                <div style={styles.breakdownItem}><span>🏗️</span><span>{performanceDashboard.thisMonth.siteVisits}</span></div>
                <div style={styles.breakdownItem}><span>💬</span><span>{performanceDashboard.thisMonth.whatsapp}</span></div>
              </div>
              <div style={styles.conversionStat}>
                <span>✅ Conversions</span>
                <span style={styles.conversionValue}>{performanceDashboard.thisMonth.conversions}</span>
              </div>
            </div>
          </div>

          {/* All Time */}
          <div style={{...styles.periodCard, ...styles.allTimeCard}}>
            <div style={styles.periodHeader}>
              <span style={styles.periodIcon}>🏆</span>
              <span style={styles.periodTitle}>All Time</span>
            </div>
            <div style={styles.periodStats}>
              <div style={styles.periodMainStat}>
                <span style={{...styles.periodMainValue, color: '#fbbf24'}}>{performanceDashboard.allTime.total}</span>
                <span style={styles.periodMainLabel}>Total Attempts</span>
              </div>
              <div style={styles.periodBreakdown}>
                <div style={styles.breakdownItem}><span>📞</span><span>{performanceDashboard.allTime.calls}</span></div>
                <div style={styles.breakdownItem}><span>🤝</span><span>{performanceDashboard.allTime.meetings}</span></div>
                <div style={styles.breakdownItem}><span>🏗️</span><span>{performanceDashboard.allTime.siteVisits}</span></div>
                <div style={styles.breakdownItem}><span>💬</span><span>{performanceDashboard.allTime.whatsapp}</span></div>
              </div>
              <div style={styles.conversionStat}>
                <span>✅ Conversions</span>
                <span style={{...styles.conversionValue, color: '#10b981'}}>{performanceDashboard.allTime.conversions}</span>
              </div>
              {performanceDashboard.allTime.total > 0 && (
                <div style={styles.rateStat}>
                  <span>📈 Conv. Rate</span>
                  <span style={styles.rateValue}>
                    {((performanceDashboard.allTime.conversions / performanceDashboard.allTime.total) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><span style={styles.statIcon}>👔</span><div style={styles.statContent}><span style={styles.statValue}>{overallStats.active}/{overallStats.total}</span><span style={styles.statLabel}>Active Reps</span></div></div>
        <div style={styles.statCard}><span style={styles.statIcon}>🤝</span><div style={styles.statContent}><span style={styles.statValue}>{overallStats.totalDeals}</span><span style={styles.statLabel}>Total Deals</span></div></div>
        <div style={styles.statCard}><span style={styles.statIcon}>💰</span><div style={styles.statContent}><span style={styles.statValue}>{formatCurrency(overallStats.totalCommission)}</span><span style={styles.statLabel}>Commission Owed</span></div></div>
        <div style={styles.statCard}><span style={styles.statIcon}>💸</span><div style={styles.statContent}><span style={{...styles.statValue, color: '#10b981'}}>{formatCurrency(overallStats.totalPaid)}</span><span style={styles.statLabel}>Paid</span></div></div>
        <div style={styles.statCard}><span style={styles.statIcon}>📞</span><div style={styles.statContent}><span style={styles.statValue}>{overallStats.totalInteractions}</span><span style={styles.statLabel}>Interactions</span></div></div>
      </div>

      {/* Search & Filter */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <span>🔍</span>
          <input type="text" placeholder="Search by name, phone, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
        </div>
        <div style={styles.filterBtns}>
          {['all', 'active', 'inactive'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} style={{...styles.filterBtn, ...(statusFilter === status ? styles.filterBtnActive : {})}}>
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reps Grid */}
      <div style={styles.repsGrid}>
        {filteredReps.length === 0 ? (
          <div style={styles.emptyState}><span style={styles.emptyIcon}>👔</span><h3>No company reps found</h3><p>Add your first company rep to get started</p></div>
        ) : (
          filteredReps.map(rep => (
            <div key={rep.id} style={styles.repCard}>
              <div style={styles.repHeader}>
                <div style={styles.repAvatar}>{rep.name?.charAt(0).toUpperCase() || '?'}</div>
                <div style={styles.repInfo}>
                  <h3 style={styles.repName}>{rep.name}</h3>
                  <div style={styles.repMeta}>
                    {rep.phone && <span>📱 {rep.phone}</span>}
                    {rep.department && <span>🏢 {rep.department}</span>}
                  </div>
                </div>
                <span style={{...styles.statusBadge, background: rep.status === 'active' ? '#dcfce7' : '#fee2e2', color: rep.status === 'active' ? '#166534' : '#991b1b'}}>{rep.status}</span>
              </div>

              <div style={styles.repMetrics}>
                <div style={styles.metricItem}><span style={styles.metricValue}>{rep.totalDeals}</span><span style={styles.metricLabel}>Deals</span></div>
                <div style={styles.metricItem}><span style={styles.metricValue}>{formatCurrency(rep.totalSales)}</span><span style={styles.metricLabel}>Sales</span></div>
                <div style={styles.metricItem}><span style={{...styles.metricValue, color: '#10b981'}}>{formatCurrency(rep.commissionPaid)}</span><span style={styles.metricLabel}>Paid</span></div>
                <div style={styles.metricItem}><span style={{...styles.metricValue, color: '#f59e0b'}}>{formatCurrency(rep.commissionPending)}</span><span style={styles.metricLabel}>Pending</span></div>
              </div>

              <div style={styles.activityBar}>
                <div style={styles.activityItem}><span style={styles.activityLabel}>Today</span><span style={styles.activityValue}>{rep.todayActivity}</span></div>
                <div style={styles.activityItem}><span style={styles.activityLabel}>Week</span><span style={styles.activityValue}>{rep.weekActivity}</span></div>
                <div style={styles.activityItem}><span style={styles.activityLabel}>Month</span><span style={styles.activityValue}>{rep.monthActivity}</span></div>
                <div style={styles.activityItem}><span style={styles.activityLabel}>Rate</span><span style={{...styles.activityValue, color: '#6366f1'}}>{rep.conversionRate}%</span></div>
              </div>

              <div style={styles.repActions}>
                <button style={styles.actionBtn} onClick={() => setSelectedRepId(rep.id)}>📊 Stats</button>
                <button style={styles.actionBtn} onClick={() => setEditingRep(rep)}>✏️ Edit</button>
                <button style={{...styles.actionBtn, ...styles.deleteBtn}} onClick={() => handleDeleteRep(rep.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRep) && (
        <RepModal rep={editingRep} onSave={editingRep ? handleUpdateRep : handleAddRep} onClose={() => { setShowAddModal(false); setEditingRep(null); }} />
      )}
    </div>
  );
}

// ========== REP MODAL ==========
function RepModal({ rep, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: rep?.name || '', phone: rep?.phone || '', email: rep?.email || '',
    department: rep?.department || '', commissionRate: rep?.commissionRate || 1,
    status: rep?.status || 'active', notes: rep?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert('Name is required'); return; }
    onSave(formData);
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}><h2>{rep ? 'Edit Company Rep' : 'Add Company Rep'}</h2><button style={modalStyles.closeBtn} onClick={onClose}>×</button></div>
        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.field}><label style={modalStyles.label}>Name *</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={modalStyles.input} required /></div>
          <div style={modalStyles.row}>
            <div style={modalStyles.field}><label style={modalStyles.label}>Phone</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={modalStyles.input} /></div>
            <div style={modalStyles.field}><label style={modalStyles.label}>Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={modalStyles.input} /></div>
          </div>
          <div style={modalStyles.row}>
            <div style={modalStyles.field}><label style={modalStyles.label}>Department</label><input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={modalStyles.input} placeholder="Sales, Marketing..." /></div>
            <div style={modalStyles.field}><label style={modalStyles.label}>Commission Rate (%)</label><input type="number" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 1})} style={modalStyles.input} step="0.1" min="0" max="100" /></div>
          </div>
          <div style={modalStyles.field}><label style={modalStyles.label}>Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={modalStyles.input}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div style={modalStyles.field}><label style={modalStyles.label}>Notes</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{...modalStyles.input, minHeight: '80px'}} rows={3} /></div>
          <div style={modalStyles.actions}><button type="button" style={modalStyles.cancelBtn} onClick={onClose}>Cancel</button><button type="submit" style={modalStyles.saveBtn}>{rep ? 'Update' : 'Add'} Rep</button></div>
        </form>
      </div>
    </div>
  );
}

// ========== STYLES ==========
const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  addBtn: { padding: '12px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  dashboardContainer: { background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '16px', padding: '20px', marginBottom: '24px' },
  dashboardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  dashboardTitle: { margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' },
  repSelect: { padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e293b', color: '#fff', fontSize: '13px', cursor: 'pointer' },
  periodGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  periodCard: { background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' },
  allTimeCard: { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)' },
  periodHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  periodIcon: { fontSize: '14px' },
  periodTitle: { color: '#fff', fontSize: '13px', fontWeight: '600' },
  periodStats: { display: 'flex', flexDirection: 'column', gap: '8px' },
  periodMainStat: { textAlign: 'center', marginBottom: '4px' },
  periodMainValue: { display: 'block', fontSize: '28px', fontWeight: '700', color: '#fff' },
  periodMainLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.6)' },
  periodBreakdown: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' },
  breakdownItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.8)' },
  conversionStat: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'rgba(255,255,255,0.7)' },
  conversionValue: { fontWeight: '700', fontSize: '16px', color: '#10b981' },
  rateStat: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' },
  rateValue: { fontWeight: '700', fontSize: '14px', color: '#fbbf24' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  statIcon: { fontSize: '20px' },
  statContent: { display: 'flex', flexDirection: 'column' },
  statValue: { fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: '11px', color: '#64748b' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '20px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' },
  searchInput: { flex: 1, padding: '10px 0', border: 'none', outline: 'none', fontSize: '14px' },
  filterBtns: { display: 'flex', gap: '6px' },
  filterBtn: { padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  filterBtnActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  repsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  repCard: { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  repHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  repAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700' },
  repInfo: { flex: 1 },
  repName: { margin: 0, fontSize: '15px', fontWeight: '600', color: '#1e293b' },
  repMeta: { display: 'flex', gap: '10px', marginTop: '2px', fontSize: '11px', color: '#64748b' },
  statusBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' },
  repMetrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '10px' },
  metricItem: { textAlign: 'center' },
  metricValue: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b' },
  metricLabel: { fontSize: '10px', color: '#64748b' },
  activityBar: { display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'linear-gradient(135deg, #1e293b, #334155)', borderRadius: '8px', marginBottom: '10px' },
  activityItem: { textAlign: 'center' },
  activityLabel: { display: 'block', fontSize: '9px', color: 'rgba(255,255,255,0.6)' },
  activityValue: { fontSize: '14px', fontWeight: '700', color: '#fff' },
  repActions: { display: 'flex', gap: '6px' },
  actionBtn: { flex: 1, padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  deleteBtn: { flex: 'none', background: '#fef2f2', color: '#dc2626' },
  emptyState: { gridColumn: '1/-1', textAlign: 'center', padding: '48px', background: '#fff', borderRadius: '12px' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
};

const modalStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '16px', width: '480px', maxHeight: '90vh', overflow: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },
  form: { padding: '20px' },
  field: { marginBottom: '14px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#374151' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' },
  cancelBtn: { padding: '9px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  saveBtn: { padding: '9px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};