import React, { useState } from 'react';
import { useData } from '../../contexts/DataContextAPI';

export default function AddBrokerModal({ isOpen, onClose, onSuccess }) {
  const { addBroker } = useData();
  
  // DEFAULT: All new brokers start with 1% commission (changed from 2.5%)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    email: '',
    cnic: '',
    address: '',
    commissionRate: 1,  // FIXED: Always 1% default
    bankDetails: '',
    notes: ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = addBroker({
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        email: formData.email.trim(),
        cnic: formData.cnic.trim(),
        address: formData.address.trim(),
        commissionRate: parseFloat(formData.commissionRate) || 1,  // Ensure 1% if empty
        status: 'active'  // ADDED: New brokers are active by default
      });
      
      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      
      // Reset form to defaults
      setFormData({
        name: '',
        phone: '',
        company: '',
        email: '',
        cnic: '',
        address: '',
        commissionRate: 1,  // Reset to 1%
        bankDetails: '',
        notes: ''
      });
      
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add broker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFormData({
      name: '',
      phone: '',
      company: '',
      email: '',
      cnic: '',
      address: '',
      commissionRate: 1,  // Reset to 1%
      bankDetails: '',
      notes: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={handleClose}>×</button>
        
        <div style={styles.header}>
          <div style={styles.headerIcon}>🤵</div>
          <div>
            <h2 style={styles.title}>Add New Broker</h2>
            <p style={styles.subtitle}>Add a broker to your network (default 1% commission)</p>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {/* Required Fields */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Broker name"
                style={styles.input}
                autoFocus
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Phone <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="03XX-XXXXXXX"
                style={styles.input}
              />
            </div>
            
            {/* Optional Fields */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Company / Agency</label>
              <input
                type="text"
                value={formData.company}
                onChange={e => handleChange('company', e.target.value)}
                placeholder="Company name (optional)"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Commission Rate (%)
                <span style={styles.hint}> - Default is 1%, can be customized per transaction</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.commissionRate}
                onChange={e => handleChange('commissionRate', e.target.value)}
                style={styles.input}
              />
              <div style={styles.helpText}>
                💡 This is the default rate. You can adjust it for each transaction individually.
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="email@example.com"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>CNIC</label>
              <input
                type="text"
                value={formData.cnic}
                onChange={e => handleChange('cnic', e.target.value)}
                placeholder="XXXXX-XXXXXXX-X"
                style={styles.input}
              />
            </div>
            
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Full address (optional)"
                style={styles.input}
              />
            </div>
            
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Bank Details</label>
              <input
                type="text"
                value={formData.bankDetails}
                onChange={e => handleChange('bankDetails', e.target.value)}
                placeholder="Account title, number, bank name (for commission payments)"
                style={styles.input}
              />
            </div>
            
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                placeholder="Any additional notes about this broker..."
                style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              style={{
                ...styles.submitBtn,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Broker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== STYLES ==========
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
    maxWidth: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '32px',
    position: 'relative',
    animation: 'slideUp 0.3s ease',
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
    transition: 'all 0.2s ease',
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
    background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
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
    marginBottom: '20px',
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
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: '11px',
    fontWeight: '400',
    color: '#94a3b8',
  },
  helpText: {
    fontSize: '11px',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '6px 10px',
    borderRadius: '6px',
    marginTop: '4px',
  },
  input: {
    padding: '12px 14px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    width: '100%',
    boxSizing: 'border-box',
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
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

// Add animations
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
if (!document.querySelector('#add-broker-modal-styles')) {
  styleSheet.id = 'add-broker-modal-styles';
  document.head.appendChild(styleSheet);
}