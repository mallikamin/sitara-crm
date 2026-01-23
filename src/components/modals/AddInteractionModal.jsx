import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../contexts/DataContextAPI';

const INTERACTION_TYPES = [
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'sms', label: 'SMS', icon: '📱' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'site_visit', label: 'Site Visit', icon: '🏗️' },
  { value: 'other', label: 'Other', icon: '📝' }
];

const PRIORITY_LEVELS = [
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'low', label: 'Low', color: '#22c55e' }
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'follow_up', label: 'Follow Up Required', icon: '🔔' },
  { value: 'pending', label: 'Pending', icon: '⏳' },
  { value: 'cancelled', label: 'Cancelled', icon: '❌' }
];

export default function AddInteractionModal({ isOpen, onClose }) {
  const { customers, brokers, companyReps = [], addInteraction } = useData();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    type: 'call',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    subject: '',
    notes: '',
    outcome: '',
    priority: 'medium',
    status: 'completed',
    followUpDate: '',
    contacts: [],
    attachments: [],
    companyRepId: '',  // NEW: Which company rep made this interaction
    companyRepName: '' // NEW: Store name for easy display
  });

  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine customers and brokers for contact selection
  const allContacts = useMemo(() => {
    const customerContacts = (customers || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      type: 'customer'
    }));
    
    const brokerContacts = (brokers || []).map(b => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      type: 'broker'
    }));
    
    return [...customerContacts, ...brokerContacts];
  }, [customers, brokers]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return allContacts;
    const term = contactSearch.toLowerCase();
    return allContacts.filter(c => 
      c.name?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  }, [allContacts, contactSearch]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const addContact = (contact) => {
    if (!formData.contacts.find(c => c.id === contact.id)) {
      setFormData(prev => ({
        ...prev,
        contacts: [...prev.contacts, contact]
      }));
    }
    setContactSearch('');
    setShowContactDropdown(false);
  };

  const removeContact = (contactId) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== contactId)
    }));
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB limit
    
    for (const file of files) {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
        continue;
      }
      
      try {
        const base64 = await readFileAsBase64(file);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          }]
        }));
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.type) {
      newErrors.type = 'Please select interaction type';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (formData.contacts.length === 0) {
      newErrors.contacts = 'Please select at least one contact';
    }
    
    if (formData.status === 'follow_up' && !formData.followUpDate) {
      newErrors.followUpDate = 'Follow-up date is required when status is "Follow Up"';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      const interactionData = {
        ...formData,
        id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      addInteraction(interactionData);
      
      // Reset form
      setFormData({
        type: 'call',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        subject: '',
        notes: '',
        outcome: '',
        priority: 'medium',
        status: 'completed',
        followUpDate: '',
        contacts: [],
        attachments: [],
        companyRepId: '',
        companyRepName: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Error adding interaction:', error);
      alert('Failed to save interaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>📝 Log Interaction</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Interaction Type Selection */}
          <div style={styles.section}>
            <label style={styles.label}>Interaction Type *</label>
            <div style={styles.typeGrid}>
              {INTERACTION_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  style={{
                    ...styles.typeBtn,
                    ...(formData.type === type.value ? styles.typeBtnActive : {})
                  }}
                  onClick={() => handleChange('type', type.value)}
                >
                  <span style={styles.typeIcon}>{type.icon}</span>
                  <span style={styles.typeLabel}>{type.label}</span>
                </button>
              ))}
            </div>
            {errors.type && <span style={styles.error}>{errors.type}</span>}
          </div>

          {/* Date and Time */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.date ? styles.inputError : {})
                }}
              />
              {errors.date && <span style={styles.error}>{errors.date}</span>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Subject */}
          <div style={styles.field}>
            <label style={styles.label}>Subject *</label>
            <input
              type="text"
              placeholder="Brief description of the interaction"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              style={{
                ...styles.input,
                ...(errors.subject ? styles.inputError : {})
              }}
            />
            {errors.subject && <span style={styles.error}>{errors.subject}</span>}
          </div>

          {/* Contact Selection */}
          <div style={styles.field}>
            <label style={styles.label}>Contacts * (select all involved)</label>
            
            {/* Selected Contacts */}
            {formData.contacts.length > 0 && (
              <div style={styles.selectedContacts}>
                {formData.contacts.map(contact => (
                  <div key={contact.id} style={styles.contactChip}>
                    <span style={styles.contactChipIcon}>
                      {contact.type === 'broker' ? '🤵' : '👤'}
                    </span>
                    <span>{contact.name}</span>
                    <button
                      type="button"
                      style={styles.removeChip}
                      onClick={() => removeContact(contact.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Contact Search */}
            <div style={styles.contactSearchWrapper}>
              <input
                type="text"
                placeholder="Search customers or brokers..."
                value={contactSearch}
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  setShowContactDropdown(true);
                }}
                onFocus={() => setShowContactDropdown(true)}
                style={{
                  ...styles.input,
                  ...(errors.contacts ? styles.inputError : {})
                }}
              />
              
              {showContactDropdown && filteredContacts.length > 0 && (
                <div style={styles.contactDropdown}>
                  {filteredContacts.slice(0, 10).map(contact => {
                    const isSelected = formData.contacts.find(c => c.id === contact.id);
                    return (
                      <div
                        key={contact.id}
                        style={{
                          ...styles.contactOption,
                          ...(isSelected ? styles.contactOptionSelected : {})
                        }}
                        onClick={() => !isSelected && addContact(contact)}
                      >
                        <span style={styles.contactOptionIcon}>
                          {contact.type === 'broker' ? '🤵' : '👤'}
                        </span>
                        <div style={styles.contactOptionInfo}>
                          <span style={styles.contactOptionName}>{contact.name}</span>
                          <span style={styles.contactOptionType}>
                            {contact.type === 'broker' ? 'Broker' : 'Customer'}
                            {contact.phone && ` • ${contact.phone}`}
                          </span>
                        </div>
                        {isSelected && <span style={styles.checkmark}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {errors.contacts && <span style={styles.error}>{errors.contacts}</span>}
          </div>

          {/* Company Rep Selection - WHO made this interaction */}
          <div style={styles.section}>
            <label style={styles.label}>
              <span>👔 Interaction Made By (Company Rep)</span>
              <span style={styles.labelHint}>Optional - Track which rep made this interaction</span>
            </label>
            <select
              value={formData.companyRepId}
              onChange={(e) => {
                const repId = e.target.value;
                const rep = companyReps.find(r => r.id === repId);
                setFormData(prev => ({
                  ...prev,
                  companyRepId: repId,
                  companyRepName: rep?.name || ''
                }));
              }}
              style={styles.select}
            >
              <option value="">-- Select Company Rep --</option>
              {companyReps.filter(r => r.status === 'active').map(rep => (
                <option key={rep.id} value={rep.id}>
                  {rep.name} {rep.department ? `(${rep.department})` : ''}
                </option>
              ))}
            </select>
            {formData.companyRepId && (
              <div style={styles.repSelected}>
                ✅ This interaction will be attributed to <strong>{formData.companyRepName}</strong>
              </div>
            )}
          </div>

          {/* Priority and Status */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Priority</label>
              <div style={styles.priorityRow}>
                {PRIORITY_LEVELS.map(priority => {
                  const isActive = formData.priority === priority.value;
                  return (
                    <button
                      key={priority.value}
                      type="button"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: isActive ? priority.color : '#e2e8f0',
                        backgroundColor: isActive ? priority.color + '15' : '#fff',
                        color: isActive ? priority.color : '#64748b'
                      }}
                      onClick={() => handleChange('priority', priority.value)}
                    >
                      {priority.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <div style={styles.statusGrid}>
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.value}
                  type="button"
                  style={{
                    ...styles.statusBtn,
                    ...(formData.status === status.value ? styles.statusBtnActive : {})
                  }}
                  onClick={() => handleChange('status', status.value)}
                >
                  <span>{status.icon}</span>
                  <span>{status.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up Date (conditional) */}
          {formData.status === 'follow_up' && (
            <div style={styles.field}>
              <label style={styles.label}>Follow-up Date *</label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => handleChange('followUpDate', e.target.value)}
                min={formData.date}
                style={{
                  ...styles.input,
                  ...(errors.followUpDate ? styles.inputError : {})
                }}
              />
              {errors.followUpDate && <span style={styles.error}>{errors.followUpDate}</span>}
            </div>
          )}

          {/* Notes */}
          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <textarea
              placeholder="Detailed notes about the interaction..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              style={styles.textarea}
              rows={4}
            />
          </div>

          {/* Outcome */}
          <div style={styles.field}>
            <label style={styles.label}>Outcome</label>
            <textarea
              placeholder="What was the result or conclusion?"
              value={formData.outcome}
              onChange={(e) => handleChange('outcome', e.target.value)}
              style={styles.textarea}
              rows={2}
            />
          </div>

          {/* Attachments */}
          <div style={styles.field}>
            <label style={styles.label}>Attachments</label>
            
            {/* Attachment List */}
            {formData.attachments.length > 0 && (
              <div style={styles.attachmentList}>
                {formData.attachments.map((att, idx) => (
                  <div key={idx} style={styles.attachmentItem}>
                    <span style={styles.attachmentIcon}>📎</span>
                    <div style={styles.attachmentInfo}>
                      <span style={styles.attachmentName}>{att.name}</span>
                      <span style={styles.attachmentSize}>
                        {(att.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      style={styles.removeAttachment}
                      onClick={() => removeAttachment(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            
            <button
              type="button"
              style={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <span>📎</span>
              Add Attachment
            </button>
            <p style={styles.attachHint}>
              Max 5MB per file. Supported: Images, PDF, Word, Excel, Text
            </p>
          </div>

          {/* Submit Buttons */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Interaction'}
            </button>
          </div>
        </form>
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
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  form: {
    padding: '24px',
    overflow: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '24px',
  },
  field: {
    marginBottom: '20px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
    gap: '2px',
  },
  labelHint: {
    fontSize: '12px',
    fontWeight: '400',
    color: '#6b7280',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  repSelected: {
    marginTop: '8px',
    padding: '10px 14px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#166534',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  error: {
    display: 'block',
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '4px',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px',
  },
  typeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 12px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  typeBtnActive: {
    borderColor: '#667eea',
    backgroundColor: '#f5f3ff',
  },
  typeIcon: {
    fontSize: '24px',
  },
  typeLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569',
  },
  selectedContacts: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px',
  },
  contactChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#e0e7ff',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#4338ca',
  },
  contactChipIcon: {
    fontSize: '16px',
  },
  removeChip: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#6366f1',
    padding: '0 0 0 4px',
    lineHeight: '1',
  },
  contactSearchWrapper: {
    position: 'relative',
  },
  contactDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    marginTop: '4px',
    maxHeight: '240px',
    overflow: 'auto',
    zIndex: 100,
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  },
  contactOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    borderBottom: '1px solid #f1f5f9',
  },
  contactOptionSelected: {
    backgroundColor: '#f5f3ff',
    cursor: 'default',
  },
  contactOptionIcon: {
    fontSize: '20px',
  },
  contactOptionInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  contactOptionName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  contactOptionType: {
    fontSize: '12px',
    color: '#64748b',
  },
  checkmark: {
    color: '#667eea',
    fontSize: '18px',
    fontWeight: '700',
  },
  priorityRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  statusBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#475569',
  },
  statusBtnActive: {
    borderColor: '#667eea',
    backgroundColor: '#f5f3ff',
    color: '#4338ca',
  },
  attachmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  attachmentIcon: {
    fontSize: '18px',
  },
  attachmentInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  attachmentName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  attachmentSize: {
    fontSize: '12px',
    color: '#64748b',
  },
  removeAttachment: {
    width: '28px',
    height: '28px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  attachBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    backgroundColor: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  attachHint: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelBtn: {
    flex: '1',
    padding: '14px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    flex: '2',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

// Add keyframe animations
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
`;
if (!document.querySelector('#interaction-modal-styles')) {
  styleSheet.id = 'interaction-modal-styles';
  document.head.appendChild(styleSheet);
}