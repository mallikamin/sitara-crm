import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';

// Interaction type icons and colors
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
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  high: { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  medium: { label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  low: { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
};

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  follow_up: { label: 'Follow Up', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  pending: { label: 'Pending', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
};

export default function Interactions({ onAddInteraction }) {
  const { db, customers, deleteInteraction } = useData();
  const interactions = db?.interactions || [];

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Get all unique contacts from interactions for filter
  const allContacts = useMemo(() => {
    const contactMap = new Map();
    interactions.forEach(int => {
      (int.contacts || []).forEach(contact => {
        if (!contactMap.has(contact.id)) {
          contactMap.set(contact.id, contact);
        }
      });
    });
    return Array.from(contactMap.values());
  }, [interactions]);

  // Filtered and sorted interactions
  const filteredInteractions = useMemo(() => {
    let result = [...interactions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(int => 
        int.subject?.toLowerCase().includes(term) ||
        int.notes?.toLowerCase().includes(term) ||
        int.outcome?.toLowerCase().includes(term) ||
        (int.contacts || []).some(c => c.name?.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(int => int.type === filterType);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      result = result.filter(int => int.priority === filterPriority);
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(int => int.status === filterStatus);
    }

    // Customer filter
    if (filterCustomer !== 'all') {
      result = result.filter(int => 
        (int.contacts || []).some(c => c.id === filterCustomer)
      );
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(int => int.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(int => int.date <= dateTo);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.date + ' ' + (a.time || '00:00')) - new Date(b.date + ' ' + (b.time || '00:00'));
        case 'date_desc':
          return new Date(b.date + ' ' + (b.time || '00:00')) - new Date(a.date + ' ' + (a.time || '00:00'));
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        default:
          return 0;
      }
    });

    return result;
  }, [interactions, searchTerm, filterType, filterPriority, filterStatus, filterCustomer, dateFrom, dateTo, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const weekStart = thisWeekStart.toISOString().split('T')[0];

    return {
      total: interactions.length,
      today: interactions.filter(i => i.date === today).length,
      thisWeek: interactions.filter(i => i.date >= weekStart).length,
      followUps: interactions.filter(i => i.status === 'follow_up' && i.followUpDate && i.followUpDate >= today).length,
      urgent: interactions.filter(i => i.priority === 'urgent' && i.status !== 'completed').length
    };
  }, [interactions]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleDelete = (id) => {
    deleteInteraction(id);
    setShowDeleteConfirm(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterCustomer('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = filterType !== 'all' || filterPriority !== 'all' || 
    filterStatus !== 'all' || filterCustomer !== 'all' || dateFrom || dateTo;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Interactions</h1>
            <p style={styles.subtitle}>Track all customer communications and follow-ups</p>
          </div>
          <button style={styles.addButton} onClick={onAddInteraction}>
            <span style={styles.addIcon}>+</span>
            Log Interaction
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total Interactions</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📅</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.today}</span>
            <span style={styles.statLabel}>Today</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📆</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.thisWeek}</span>
            <span style={styles.statLabel}>This Week</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔔</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.followUps}</span>
            <span style={styles.statLabel}>Pending Follow-ups</span>
          </div>
        </div>
        <div style={{ ...styles.statCard, ...(stats.urgent > 0 ? styles.urgentCard : {}) }}>
          <div style={styles.statIcon}>🚨</div>
          <div style={styles.statInfo}>
            <span style={{ ...styles.statValue, ...(stats.urgent > 0 ? { color: '#ef4444' } : {}) }}>
              {stats.urgent}
            </span>
            <span style={styles.statLabel}>Urgent Items</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.controlsSection}>
        <div style={styles.searchRow}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search interactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button style={styles.clearSearch} onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
          
          <div style={styles.controlButtons}>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.sortSelect}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="priority">By Priority</option>
              <option value="type">By Type</option>
            </select>
            
            <button 
              style={{
                ...styles.filterToggle,
                ...(showFilters ? styles.filterToggleActive : {}),
                ...(hasActiveFilters ? styles.filterToggleHasActive : {})
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span>⚙️</span>
              Filters
              {hasActiveFilters && <span style={styles.filterBadge}>{
                [filterType !== 'all', filterPriority !== 'all', filterStatus !== 'all', 
                 filterCustomer !== 'all', dateFrom, dateTo].filter(Boolean).length
              }</span>}
            </button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div style={styles.filtersPanel}>
            <div style={styles.filterGrid}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Type</label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Types</option>
                  {Object.entries(INTERACTION_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.label}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Priority</label>
                <select 
                  value={filterPriority} 
                  onChange={(e) => setFilterPriority(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Priorities</option>
                  {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Status</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Contact</label>
                <select 
                  value={filterCustomer} 
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Contacts</option>
                  {allContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>From Date</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={styles.filterInput}
                />
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>To Date</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)}
                  style={styles.filterInput}
                />
              </div>
            </div>
            
            {hasActiveFilters && (
              <button style={styles.clearFilters} onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Type Filters */}
      <div style={styles.quickFilters}>
        <button 
          style={{
            ...styles.quickFilterBtn,
            ...(filterType === 'all' ? styles.quickFilterActive : {})
          }}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        {Object.entries(INTERACTION_TYPES).map(([key, val]) => (
          <button 
            key={key}
            style={{
              ...styles.quickFilterBtn,
              ...(filterType === key ? { ...styles.quickFilterActive, borderColor: val.color, color: val.color } : {})
            }}
            onClick={() => setFilterType(key)}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div style={styles.resultsInfo}>
        <span>Showing {filteredInteractions.length} of {interactions.length} interactions</span>
      </div>

      {/* Interactions List */}
      {filteredInteractions.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3 style={styles.emptyTitle}>
            {interactions.length === 0 ? 'No interactions yet' : 'No matching interactions'}
          </h3>
          <p style={styles.emptyText}>
            {interactions.length === 0 
              ? 'Start logging your customer interactions to keep track of all communications.'
              : 'Try adjusting your filters or search term.'}
          </p>
          {interactions.length === 0 && (
            <button style={styles.emptyButton} onClick={onAddInteraction}>
              Log First Interaction
            </button>
          )}
        </div>
      ) : (
        <div style={styles.interactionsList}>
          {filteredInteractions.map((interaction, index) => {
            const typeConfig = INTERACTION_TYPES[interaction.type] || INTERACTION_TYPES.other;
            const priorityConfig = PRIORITY_CONFIG[interaction.priority] || PRIORITY_CONFIG.medium;
            const statusConfig = STATUS_CONFIG[interaction.status] || STATUS_CONFIG.pending;
            
            return (
              <div 
                key={interaction.id} 
                style={{
                  ...styles.interactionCard,
                  animationDelay: `${index * 0.05}s`
                }}
                onClick={() => setSelectedInteraction(interaction)}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.typeIndicator}>
                    <span style={{
                      ...styles.typeIcon,
                      backgroundColor: typeConfig.color + '20',
                      color: typeConfig.color
                    }}>
                      {typeConfig.icon}
                    </span>
                    <span style={styles.typeLabel}>{typeConfig.label}</span>
                  </div>
                  
                  <div style={styles.cardMeta}>
                    <span style={{
                      ...styles.priorityBadge,
                      backgroundColor: priorityConfig.bg,
                      color: priorityConfig.color
                    }}>
                      {priorityConfig.label}
                    </span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color
                    }}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <h3 style={styles.cardSubject}>{interaction.subject || 'No Subject'}</h3>
                
                {interaction.notes && (
                  <p style={styles.cardNotes}>
                    {interaction.notes.length > 150 
                      ? interaction.notes.substring(0, 150) + '...' 
                      : interaction.notes}
                  </p>
                )}

                <div style={styles.contactsRow}>
                  {(interaction.contacts || []).slice(0, 3).map((contact, idx) => (
                    <span key={idx} style={styles.contactChip}>
                      {contact.type === 'broker' ? '🤵' : '👤'} {contact.name}
                    </span>
                  ))}
                  {(interaction.contacts || []).length > 3 && (
                    <span style={styles.moreContacts}>
                      +{interaction.contacts.length - 3} more
                    </span>
                  )}
                </div>


                {/* Company Rep Attribution - NEW */}
                {interaction.companyRepName && (
                  <div style={styles.companyRepRow}>
                    <span style={styles.companyRepBadge}>
                      👔 By: {interaction.companyRepName}
                    </span>
                  </div>
                )}

                <div style={styles.cardFooter}>
                  <div style={styles.dateTime}>
                    <span>📅 {formatDate(interaction.date)}</span>
                    {interaction.time && <span>⏰ {formatTime(interaction.time)}</span>}
                  </div>
                  
                  {interaction.status === 'follow_up' && interaction.followUpDate && (
                    <div style={styles.followUpBadge}>
                      🔔 Follow-up: {formatDate(interaction.followUpDate)}
                    </div>
                  )}
                  
                  {(interaction.attachments || []).length > 0 && (
                    <div style={styles.attachmentIndicator}>
                      📎 {interaction.attachments.length}
                    </div>
                  )}
                </div>

                <div style={styles.cardActions}>
                  <button 
                    style={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInteraction(interaction);
                    }}
                  >
                    View
                  </button>
                  <button 
                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(interaction.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInteraction && (
        <div style={styles.modalOverlay} onClick={() => setSelectedInteraction(null)}>
          <div style={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setSelectedInteraction(null)}>×</button>
            
            <div style={styles.modalHeader}>
              <span style={{
                ...styles.modalTypeIcon,
                backgroundColor: (INTERACTION_TYPES[selectedInteraction.type]?.color || '#667eea') + '20',
                color: INTERACTION_TYPES[selectedInteraction.type]?.color || '#667eea'
              }}>
                {INTERACTION_TYPES[selectedInteraction.type]?.icon || '📝'}
              </span>
              <div>
                <h2 style={styles.modalTitle}>{selectedInteraction.subject || 'No Subject'}</h2>
                <span style={styles.modalType}>
                  {INTERACTION_TYPES[selectedInteraction.type]?.label || 'Other'}
                </span>
              </div>
            </div>

            <div style={styles.modalBadges}>
              <span style={{
                ...styles.modalBadge,
                backgroundColor: PRIORITY_CONFIG[selectedInteraction.priority]?.bg,
                color: PRIORITY_CONFIG[selectedInteraction.priority]?.color
              }}>
                {PRIORITY_CONFIG[selectedInteraction.priority]?.label} Priority
              </span>
              <span style={{
                ...styles.modalBadge,
                backgroundColor: STATUS_CONFIG[selectedInteraction.status]?.bg,
                color: STATUS_CONFIG[selectedInteraction.status]?.color
              }}>
                {STATUS_CONFIG[selectedInteraction.status]?.label}
              </span>
            </div>

            <div style={styles.modalSection}>
              <h4 style={styles.modalSectionTitle}>Date & Time</h4>
              <p style={styles.modalText}>
                {formatDate(selectedInteraction.date)} {selectedInteraction.time && `at ${formatTime(selectedInteraction.time)}`}
              </p>
            </div>

            <div style={styles.modalSection}>
              <h4 style={styles.modalSectionTitle}>Contacts</h4>
              <div style={styles.modalContacts}>
                {(selectedInteraction.contacts || []).map((contact, idx) => (
                  <div key={idx} style={styles.modalContactCard}>
                    <span style={styles.contactIcon}>
                      {contact.type === 'broker' ? '🤵' : '👤'}
                    </span>
                    <div>
                      <div style={styles.contactName}>{contact.name}</div>
                      <div style={styles.contactType}>
                        {contact.type === 'broker' ? 'Broker' : 'Customer'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedInteraction.notes && (
              <div style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>Notes</h4>
                <p style={styles.modalText}>{selectedInteraction.notes}</p>
              </div>
            )}

            {selectedInteraction.outcome && (
              <div style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>Outcome</h4>
                <p style={styles.modalText}>{selectedInteraction.outcome}</p>
              </div>
            )}

            {selectedInteraction.status === 'follow_up' && selectedInteraction.followUpDate && (
              <div style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>Follow-up Date</h4>
                <p style={styles.followUpText}>
                  🔔 {formatDate(selectedInteraction.followUpDate)}
                </p>
              </div>
            )}

            {(selectedInteraction.attachments || []).length > 0 && (
              <div style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>Attachments ({selectedInteraction.attachments.length})</h4>
                <div style={styles.attachmentsList}>
                  {selectedInteraction.attachments.map((att, idx) => (
                    <div key={idx} style={styles.attachmentItem}>
                      <span style={styles.attachmentIcon}>📎</span>
                      <span style={styles.attachmentName}>{att.name}</span>
                      <span style={styles.attachmentSize}>
                        {(att.size / 1024).toFixed(1)} KB
                      </span>
                      {att.data && att.type?.startsWith('image/') && (
                        <img 
                          src={att.data} 
                          alt={att.name}
                          style={styles.attachmentPreview}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.modalFooter}>
              <span style={styles.modalId}>ID: {selectedInteraction.id}</span>
              <button 
                style={styles.modalDeleteBtn}
                onClick={() => {
                  setShowDeleteConfirm(selectedInteraction.id);
                  setSelectedInteraction(null);
                }}
              >
                Delete Interaction
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
            <h3 style={styles.confirmTitle}>Delete Interaction?</h3>
            <p style={styles.confirmText}>
              This action cannot be undone. The interaction will be permanently removed.
            </p>
            <div style={styles.confirmButtons}>
              <button 
                style={styles.cancelBtn}
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmDeleteBtn}
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '0',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    color: 'rgba(255,255,255,0.85)',
    margin: '0',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#667eea',
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
    transition: 'all 0.2s ease',
  },
  urgentCard: {
    border: '2px solid #fecaca',
    backgroundColor: '#fef2f2',
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
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  controlsSection: {
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto 16px',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
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
    padding: '4px 8px',
  },
  controlButtons: {
    display: 'flex',
    gap: '12px',
  },
  sortSelect: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#475569',
  },
  filterToggleActive: {
    borderColor: '#667eea',
    backgroundColor: '#f5f3ff',
    color: '#667eea',
  },
  filterToggleHasActive: {
    borderColor: '#667eea',
  },
  filterBadge: {
    backgroundColor: '#667eea',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  filtersPanel: {
    marginTop: '16px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    animation: 'slideDown 0.2s ease',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  filterSelect: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  filterInput: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
  },
  clearFilters: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  quickFilters: {
    display: 'flex',
    gap: '8px',
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto 16px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  quickFilterBtn: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    color: '#64748b',
  },
  quickFilterActive: {
    borderColor: '#667eea',
    backgroundColor: '#f5f3ff',
    color: '#667eea',
  },
  resultsInfo: {
    padding: '0 24px',
    maxWidth: '1400px',
    margin: '0 auto 16px',
    fontSize: '14px',
    color: '#64748b',
  },
  interactionsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '16px',
    padding: '0 24px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  interactionCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    animation: 'fadeIn 0.3s ease forwards',
    opacity: '0',
    border: '2px solid transparent',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  typeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  typeIcon: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    fontSize: '18px',
  },
  typeLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  cardMeta: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  priorityBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  cardSubject: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  cardNotes: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
  },
  contactsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  contactChip: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    color: '#475569',
  },
  moreContacts: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#e0e7ff',
    borderRadius: '6px',
    color: '#4f46e5',
    fontWeight: '500',
  },
  companyRepRow: {
    marginBottom: "12px",
  },
  companyRepBadge: {
    fontSize: "12px",
    padding: "4px 12px",
    backgroundColor: "#d1fae5",
    borderRadius: "6px",
    color: "#059669",
    fontWeight: "500",
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
    marginBottom: '12px',
  },
  dateTime: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#64748b',
  },
  followUpBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#fef3c7',
    color: '#b45309',
    borderRadius: '6px',
    fontWeight: '500',
  },
  attachmentIndicator: {
    fontSize: '13px',
    color: '#64748b',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    flex: '1',
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#475569',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
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
  emptyButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
    animation: 'fadeIn 0.2s ease',
  },
  detailModal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '28px',
    position: 'relative',
    animation: 'slideUp 0.3s ease',
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
    transition: 'all 0.2s ease',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  modalTypeIcon: {
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    fontSize: '28px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  modalType: {
    fontSize: '14px',
    color: '#64748b',
  },
  modalBadges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  modalBadge: {
    fontSize: '13px',
    fontWeight: '600',
    padding: '6px 14px',
    borderRadius: '8px',
  },
  modalSection: {
    marginBottom: '20px',
  },
  modalSectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  modalText: {
    fontSize: '15px',
    color: '#1e293b',
    margin: '0',
    lineHeight: '1.6',
  },
  followUpText: {
    fontSize: '15px',
    color: '#b45309',
    fontWeight: '500',
    margin: '0',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
  },
  modalContacts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modalContactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  contactIcon: {
    fontSize: '24px',
  },
  contactName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  contactType: {
    fontSize: '13px',
    color: '#64748b',
  },
  attachmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  attachmentIcon: {
    fontSize: '18px',
  },
  attachmentName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    flex: '1',
    wordBreak: 'break-all',
  },
  attachmentSize: {
    fontSize: '13px',
    color: '#64748b',
  },
  attachmentPreview: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'contain',
    borderRadius: '8px',
    marginTop: '8px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
    marginTop: '8px',
  },
  modalId: {
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  modalDeleteBtn: {
    padding: '10px 20px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '32px',
    textAlign: 'center',
    maxWidth: '400px',
    animation: 'slideUp 0.3s ease',
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
  cancelBtn: {
    flex: '1',
    padding: '12px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
    transition: 'all 0.2s ease',
  },
};

// Add keyframe animations via style tag
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .interactionCard:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    border-color: #667eea;
  }
`;
if (!document.querySelector('#interaction-styles')) {
  styleSheet.id = 'interaction-styles';
  document.head.appendChild(styleSheet);
}