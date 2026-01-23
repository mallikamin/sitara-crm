import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';

const EditTransactionModal = ({ open, onClose, transaction, onSave }) => {
  // Get data directly from DataContext - no need for props
  const { customers = [], brokers = [], companyReps = [] } = useData();
  
  const [formData, setFormData] = useState({
    customerId: '',
    brokerId: '',
    brokerCommissionRate: 1,  // DEFAULT 1%
    companyRepId: '',  // Company Rep field
    companyRepCommissionRate: 1,  // Default 1%
    saleValue: '',
    installments: 4,
    paymentCycle: 'bi_annual',
    firstDueDate: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (transaction) {
      // Find broker and company rep to get their current rates
      const broker = transaction.brokerId ? brokers.find(b => b.id === transaction.brokerId) : null;
      const companyRep = transaction.companyRepId ? companyReps.find(r => r.id === transaction.companyRepId) : null;
      
      setFormData({
        customerId: transaction.customerId || '',
        brokerId: transaction.brokerId || '',
        brokerCommissionRate: transaction.brokerCommissionRate || broker?.commissionRate || 1,
        companyRepId: transaction.companyRepId || '',
        companyRepCommissionRate: transaction.companyRepCommissionRate || companyRep?.commissionRate || 1,
        saleValue: transaction.saleValue || transaction.totalSale || transaction.sale || '',
        installments: transaction.installments || 4,
        paymentCycle: transaction.paymentCycle || transaction.cycle || 'bi_annual',
        firstDueDate: transaction.firstDueDate || transaction.nextDue || transaction.nextDueDate || '',
        status: transaction.status || 'active',
        notes: transaction.notes || ''
      });
    }
  }, [transaction, brokers, companyReps]);

  if (!open || !transaction) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'brokerId') {
      // Auto-fill broker commission rate when broker is selected
      const broker = brokers.find(b => String(b.id) === String(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        brokerCommissionRate: broker?.commissionRate || 1
      }));
    } else if (name === 'companyRepId') {
      // Auto-fill company rep commission rate when selected
      const companyRep = brokers.find(b => String(b.id) === String(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        companyRepCommissionRate: companyRep?.commissionRate || 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      alert('Please select a customer');
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    const broker = formData.brokerId ? brokers.find(b => b.id === formData.brokerId) : null;
    const companyRep = formData.companyRepId ? companyReps.find(r => r.id === formData.companyRepId) : null;

    const saleValue = parseFloat(formData.saleValue);
    
    // Calculate commissions with custom rates
    const brokerCommissionRate = formData.brokerId ? (parseFloat(formData.brokerCommissionRate) || 1) : 0;
    const brokerCommission = formData.brokerId ? (saleValue * brokerCommissionRate / 100) : 0;
    
    const companyRepCommissionRate = formData.companyRepId ? (parseFloat(formData.companyRepCommissionRate) || 1) : 0;
    const companyRepCommission = formData.companyRepId ? (saleValue * companyRepCommissionRate / 100) : 0;

    const updatedData = {
      customerId: formData.customerId,
      customerName: customer?.name || '',
      
      // Broker info with 1% default
      brokerId: formData.brokerId || null,
      brokerName: broker?.name || '',
      brokerCommissionRate: brokerCommissionRate,
      brokerCommission: brokerCommission,
      
      // NEW: Company Rep info
      companyRepId: formData.companyRepId || null,
      companyRepName: companyRep?.name || '',
      companyRepCommissionRate: companyRepCommissionRate,
      companyRepCommission: companyRepCommission,
      
      saleValue: saleValue,
      totalSale: saleValue,
      sale: saleValue,
      totalReceivable: saleValue - (transaction.totalReceived || transaction.received || 0),
      installments: parseInt(formData.installments),
      paymentCycle: formData.paymentCycle,
      cycle: formData.paymentCycle,
      firstDueDate: formData.firstDueDate,
      nextDue: formData.firstDueDate,
      nextDueDate: formData.firstDueDate,
      status: formData.status,
      notes: formData.notes,
      updatedAt: new Date().toISOString()
    };

    console.log('📝 EditTransactionModal: Updating transaction', {
      brokerCommissionRate: updatedData.brokerCommissionRate,
      companyRepCommissionRate: updatedData.companyRepCommissionRate,
      totalCommission: updatedData.brokerCommission + updatedData.companyRepCommission
    });

    onSave(transaction.projectId, transaction.id, updatedData);
    onClose();
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (Math.abs(num) >= 10000000) return '₨' + (num / 10000000).toFixed(2) + ' Cr';
    if (Math.abs(num) >= 100000) return '₨' + (num / 100000).toFixed(2) + ' Lac';
    return '₨' + num.toLocaleString('en-PK');
  };

  const selectedBroker = formData.brokerId ? brokers.find(b => String(b.id) === String(formData.brokerId)) : null;
  const selectedCompanyRep = formData.companyRepId ? companyReps.find(r => String(r.id) === String(formData.companyRepId)) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Transaction</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="info-section">
              <h3>Transaction Details</h3>
              <div className="info-grid">
                <div><strong>Name:</strong> {transaction.name}</div>
                <div><strong>Unit:</strong> {transaction.unitNumber || transaction.unit || 'N/A'}</div>
                <div><strong>Marlas:</strong> {transaction.marlas || 'N/A'}</div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label>Customer *</label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Customer</option>
                  {customers
                    .filter(c => !c.type || c.type === 'individual' || c.type === 'customer' || c.type === 'both')
                    .map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Broker (Optional)
                  <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                    Commission defaults to 1%
                  </span>
                </label>
                <select
                  name="brokerId"
                  value={formData.brokerId}
                  onChange={handleChange}
                >
                  <option value="">No Broker</option>
                  {brokers.filter(b => b.status !== 'inactive').map(broker => (
                    <option key={broker.id} value={broker.id}>
                      {broker.name} ({broker.commissionRate || 1}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Broker Commission Rate */}
              {formData.brokerId && (
                <div className="form-group">
                  <label>
                    Broker Commission %
                    <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                      Editable for this transaction
                    </span>
                  </label>
                  <input
                    type="number"
                    name="brokerCommissionRate"
                    value={formData.brokerCommissionRate}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Commission: {formatCurrency((parseFloat(formData.saleValue || 0) * parseFloat(formData.brokerCommissionRate || 0)) / 100)}
                  </div>
                </div>
              )}

              {/* NEW: Company Rep Field */}
              <div className="form-group">
                <label>
                  Company Rep (Optional)
                  <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                    Commission defaults to 1%
                  </span>
                </label>
                <select
                  name="companyRepId"
                  value={formData.companyRepId}
                  onChange={handleChange}
                >
                  <option value="">No Company Rep</option>
                  {companyReps.filter(r => r.status === 'active').map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({rep.commissionRate || 1}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* NEW: Company Rep Commission Rate */}
              {formData.companyRepId && (
                <div className="form-group">
                  <label>
                    Company Rep Commission %
                    <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                      Editable for this transaction
                    </span>
                  </label>
                  <input
                    type="number"
                    name="companyRepCommissionRate"
                    value={formData.companyRepCommissionRate}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Commission: {formatCurrency((parseFloat(formData.saleValue || 0) * parseFloat(formData.companyRepCommissionRate || 0)) / 100)}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Sale Value *</label>
                <input
                  type="number"
                  name="saleValue"
                  value={formData.saleValue}
                  onChange={handleChange}
                  required
                  step="1000"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Installments</label>
                  <select
                    name="installments"
                    value={formData.installments}
                    onChange={handleChange}
                  >
                    <option value="1">1 (Full Payment)</option>
                    <option value="2">2 Installments</option>
                    <option value="4">4 Installments</option>
                    <option value="6">6 Installments</option>
                    <option value="8">8 Installments</option>
                    <option value="12">12 Installments</option>
                    <option value="16">16 Installments</option>
                    <option value="20">20 Installments</option>
                    <option value="24">24 Installments</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Cycle</label>
                  <select
                    name="paymentCycle"
                    value={formData.paymentCycle}
                    onChange={handleChange}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="bi_annual">Bi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>First Due Date</label>
                <input
                  type="date"
                  name="firstDueDate"
                  value={formData.firstDueDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              {/* Commission Summary */}
              {formData.saleValue && (selectedBroker || selectedCompanyRep) && (
                <div className="commission-summary">
                  <h4>Commission Summary</h4>
                  
                  {selectedBroker && (
                    <div className="commission-item broker">
                      <div className="commission-label">🤵 Broker Commission</div>
                      <div className="commission-details">
                        <span>{selectedBroker.name}</span>
                        <span>{formData.brokerCommissionRate}%</span>
                        <strong>{formatCurrency((parseFloat(formData.saleValue) * parseFloat(formData.brokerCommissionRate)) / 100)}</strong>
                      </div>
                    </div>
                  )}
                  
                  {selectedCompanyRep && (
                    <div className="commission-item company-rep">
                      <div className="commission-label">👔 Company Rep Commission</div>
                      <div className="commission-details">
                        <span>{selectedCompanyRep.name}</span>
                        <span>{formData.companyRepCommissionRate}%</span>
                        <strong>{formatCurrency((parseFloat(formData.saleValue) * parseFloat(formData.companyRepCommissionRate)) / 100)}</strong>
                      </div>
                    </div>
                  )}
                  
                  {(selectedBroker || selectedCompanyRep) && (
                    <div className="commission-total">
                      <span>Total Commission</span>
                      <strong>
                        {formatCurrency(
                          ((parseFloat(formData.saleValue) || 0) * 
                          ((parseFloat(formData.brokerCommissionRate) || 0) + (parseFloat(formData.companyRepCommissionRate) || 0))) / 100
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-container {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid #f0f0f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #999;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f5f5f5;
        }

        .modal-body {
          padding: 28px;
          overflow-y: auto;
          max-height: calc(90vh - 160px);
        }

        .info-section {
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .info-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #666;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          font-size: 13px;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #666;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 14px;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          font-size: 15px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .commission-summary {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          margin-top: 8px;
        }

        .commission-summary h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #666;
        }

        .commission-item {
          background: white;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .commission-item.broker {
          border-left: 3px solid #a855f7;
        }

        .commission-item.company-rep {
          border-left: 3px solid #10b981;
        }

        .commission-label {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .commission-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .commission-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 4px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 28px;
          border-top: 1px solid #f0f0f0;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.5);
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #666;
        }

        .btn-secondary:hover {
          background: #e8e8e8;
        }
      `}</style>
    </div>
  );
};

export default EditTransactionModal;