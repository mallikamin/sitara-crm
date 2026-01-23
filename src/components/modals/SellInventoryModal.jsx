import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContextAPI';

const SellInventoryModal = ({ open, onClose, inventoryItem, onSave }) => {
  // Get customers and brokers directly from DataContext - this ensures we always have the latest data
  const { customers = [], brokers = [], companyReps = [] } = useData();
  
  const [formData, setFormData] = useState({
    customerId: '',
    brokerId: '',
    brokerCommissionRate: 1,
    companyRepId: '',
    companyRepCommissionRate: 1,
    ratePerMarla: '',
    installments: 4,
    paymentCycle: 'bi_annual',
    firstDueDate: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize rate when modal opens
  useEffect(() => {
    if (inventoryItem && open) {
      setFormData(prev => ({
        ...prev,
        customerId: '',
        brokerId: '',
        brokerCommissionRate: 1,
        companyRepId: '',
        companyRepCommissionRate: 1,
        ratePerMarla: inventoryItem.ratePerMarla || '',
        installments: 4,
        paymentCycle: 'bi_annual',
        firstDueDate: '',
        notes: ''
      }));
      setIsSubmitting(false);
    }
  }, [inventoryItem, open]);

  if (!open || !inventoryItem) return null;

  // Filter customers - with new structure, all entries in customers[] are actual customers
  // But we still filter just in case there's legacy data
  const eligibleCustomers = customers.filter(c => 
    !c.type || c.type === 'individual' || c.type === 'customer' || c.type === 'both'
  );

  // Brokers come from their own independent array now
  const eligibleBrokers = brokers.filter(b => b.status !== 'inactive');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!formData.customerId) {
      alert('Please select a customer');
      return;
    }
    
    if (!formData.firstDueDate) {
      alert('Please select a first due date');
      return;
    }
    
    if (!formData.ratePerMarla || parseFloat(formData.ratePerMarla) <= 0) {
      alert('Please enter a valid rate per marla');
      return;
    }

    setIsSubmitting(true);

    try {
      const customer = customers.find(c => String(c.id) === String(formData.customerId));
      const broker = formData.brokerId ? brokers.find(b => String(b.id) === String(formData.brokerId)) : null;
      const ratePerMarla = parseFloat(formData.ratePerMarla);
      const marlas = parseFloat(inventoryItem.marlas || 0);
      const totalValue = ratePerMarla * marlas;
      
      // Get company rep
      const companyRep = formData.companyRepId ? companyReps.find(r => String(r.id) === String(formData.companyRepId)) : null;
      
      // Calculate commissions with custom rates
      const brokerCommissionRate = formData.brokerId ? (parseFloat(formData.brokerCommissionRate) || 1) : 0;
      const brokerCommission = formData.brokerId ? (totalValue * brokerCommissionRate / 100) : 0;
      const companyRepCommissionRate = formData.companyRepId ? (parseFloat(formData.companyRepCommissionRate) || 1) : 0;
      const companyRepCommission = formData.companyRepId ? (totalValue * companyRepCommissionRate / 100) : 0;

      const transactionData = {
        // Transaction identification
        name: `${inventoryItem.projectName || 'Unknown Project'} - ${inventoryItem.unitShopNumber || inventoryItem.unit || 'Unknown Unit'}`,
        
        // Customer info
        customerId: formData.customerId,
        customerName: customer?.name || 'Unknown Customer',
        
        // Broker info (from independent brokers array)
        brokerId: formData.brokerId || null,
        brokerName: broker?.name || '',
        brokerCommissionRate: brokerCommissionRate,
        brokerCommission: brokerCommission,
        
        // Company Rep info (NEW)
        companyRepId: formData.companyRepId || null,
        companyRepName: companyRep?.name || '',
        companyRepCommissionRate: companyRepCommissionRate,
        companyRepCommission: companyRepCommission,
        
        // Inventory reference
        inventoryId: inventoryItem.id,
        
        // Unit details
        unit: inventoryItem.unitShopNumber || inventoryItem.unit,
        unitNumber: inventoryItem.unitShopNumber || inventoryItem.unit,
        marlas: inventoryItem.marlas,
        ratePerMarla: ratePerMarla,
        
        // Financial details
        sale: totalValue,
        saleValue: totalValue,
        totalSale: totalValue,
        received: 0,
        totalReceived: 0,
        receivable: totalValue,
        totalReceivable: totalValue,
        
        // Payment schedule
        installments: parseInt(formData.installments),
        installmentCount: parseInt(formData.installments),
        paymentCycle: formData.paymentCycle,
        cycle: formData.paymentCycle,
        firstDueDate: formData.firstDueDate,
        nextDue: formData.firstDueDate,
        nextDueDate: formData.firstDueDate,
        
        // Status
        status: 'active',
        
        // Additional info
        notes: formData.notes,
        projectName: inventoryItem.projectName,
        block: inventoryItem.block,
        
        // Timestamps
        createdAt: new Date().toISOString()
      };

      console.log('📝 SellInventoryModal: Creating transaction with broker:', broker?.name || 'No broker', 'BrokerId:', formData.brokerId);
      
      // Call the onSave callback
      await onSave(transactionData, inventoryItem.id);
      
      // Close modal on success
      onClose();
      
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      alert('Failed to create transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratePerMarla = parseFloat(formData.ratePerMarla || 0);
  const marlas = parseFloat(inventoryItem.marlas || 0);
  const totalValue = ratePerMarla * marlas;
  const installmentAmount = totalValue / parseInt(formData.installments || 1);

  // Get selected broker and company rep for commission display
  const selectedBroker = formData.brokerId ? brokers.find(b => String(b.id) === String(formData.brokerId)) : null;
  const selectedCompanyRep = formData.companyRepId ? companyReps.find(r => String(r.id) === String(formData.companyRepId)) : null;
  const brokerCommission = selectedBroker ? (totalValue * (parseFloat(formData.brokerCommissionRate) || 1)) / 100 : 0;
  const companyRepCommission = selectedCompanyRep ? (totalValue * (parseFloat(formData.companyRepCommissionRate) || 1)) / 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sell Inventory Item</h2>
          <button className="close-btn" onClick={onClose} type="button">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Inventory Details */}
            <div className="info-card">
              <div className="info-row">
                <span className="info-label">Project:</span>
                <span className="info-value">{inventoryItem.projectName || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Unit:</span>
                <span className="info-value">{inventoryItem.unitShopNumber || inventoryItem.unit || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Marlas:</span>
                <span className="info-value">{inventoryItem.marlas || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Base Rate/Marla:</span>
                <span className="info-value">
                  ₨ {(inventoryItem.ratePerMarla || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Transaction Form */}
            <div className="form-section">
              <div className="form-group">
                <label>Select Customer *</label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choose a customer</option>
                  {eligibleCustomers.length === 0 ? (
                    <option value="" disabled>No customers available - add customers first</option>
                  ) : (
                    eligibleCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `(${customer.phone})` : ''} {customer.company ? `- ${customer.company}` : ''}
                      </option>
                    ))
                  )}
                </select>
                {eligibleCustomers.length === 0 && (
                  <div className="helper-text error">
                    ⚠️ No customers found. Please add customers first.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Broker (Optional)</label>
                <select
                  name="brokerId"
                  value={formData.brokerId}
                  onChange={handleChange}
                >
                  <option value="">No Broker</option>
                  {eligibleBrokers.length === 0 ? (
                    <option value="" disabled>No brokers available - add brokers in Brokers tab</option>
                  ) : (
                    eligibleBrokers.map(broker => (
                      <option key={broker.id} value={broker.id}>
                        {broker.name} {broker.phone ? `(${broker.phone})` : ''} - {broker.commissionRate || 1}% commission
                      </option>
                    ))
                  )}
                </select>
                {selectedBroker && (
                  <div className="helper-text" style={{ color: '#6366f1' }}>
                    💰 Broker Commission: ₨ {Math.round(brokerCommission).toLocaleString()} ({selectedBroker.commissionRate || 1}%)
                  </div>
                )}
                {eligibleBrokers.length === 0 && (
                  <div className="helper-text" style={{ color: '#64748b' }}>
                    ℹ️ Add brokers in the Brokers tab to assign them to transactions
                  </div>
                )}
              </div>

              {/* Company Rep Field - NEW */}
              <div className="form-group">
                <label>Company Rep (Optional)</label>
                <select
                  name="companyRepId"
                  value={formData.companyRepId}
                  onChange={handleChange}
                >
                  <option value="">No Company Rep</option>
                  {companyReps.filter(r => r.status === 'active').map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} {rep.phone ? `(${rep.phone})` : ''} - {rep.commissionRate || 1}% commission
                    </option>
                  ))}
                </select>
                {selectedCompanyRep && (
                  <div className="helper-text" style={{ color: '#059669' }}>
                    👔 Rep Commission: ₨ {Math.round(companyRepCommission).toLocaleString()} ({formData.companyRepCommissionRate || 1}%)
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Sale Rate per Marla *</label>
                <input
                  type="number"
                  name="ratePerMarla"
                  value={formData.ratePerMarla}
                  onChange={handleChange}
                  placeholder="Enter sale rate"
                  step="1000"
                  min="0"
                  required
                />
                <div className="helper-text success">
                  Total Value: ₨ {totalValue.toLocaleString()}
                </div>
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
                    <option value="10">10 Installments</option>
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
                    <option value="quarterly">Quarterly (3 months)</option>
                    <option value="bi_annual">Bi-Annual (6 months)</option>
                    <option value="annual">Annual (12 months)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>First Due Date *</label>
                <input
                  type="date"
                  name="firstDueDate"
                  value={formData.firstDueDate}
                  onChange={handleChange}
                  required
                />
              </div>

              {parseInt(formData.installments) > 1 && (
                <div className="payment-summary">
                  <div className="summary-title">Payment Plan Summary</div>
                  <div className="summary-row">
                    <span>Installment Amount:</span>
                    <strong>₨ {Math.round(installmentAmount).toLocaleString()}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total Installments:</span>
                    <strong>{formData.installments}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Payment Frequency:</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {formData.paymentCycle.replace('_', '-').replace('bi-annual', 'Every 6 Months')}
                    </strong>
                  </div>
                  {selectedBroker && (
                    <div className="summary-row" style={{ color: '#6366f1' }}>
                      <span>Broker Commission ({selectedBroker.commissionRate || 1}%):</span>
                      <strong>₨ {Math.round(brokerCommission).toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Total Sale Value:</span>
                    <strong>₨ {totalValue.toLocaleString()}</strong>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional transaction notes..."
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting || !formData.customerId || !formData.firstDueDate}
            >
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
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
          max-width: 650px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid #f0f0f0;
          background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%);
          color: white;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          font-size: 24px;
          color: white;
          cursor: pointer;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .modal-body {
          padding: 28px;
          overflow-y: auto;
          max-height: calc(90vh - 180px);
        }

        .info-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
        }

        .info-row:not(:last-child) {
          border-bottom: 1px solid #e2e8f0;
        }

        .info-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
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
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.01em;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          transition: all 0.2s;
          font-family: inherit;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .helper-text {
          font-size: 12px;
          font-weight: 600;
          margin-top: -4px;
        }

        .helper-text.success {
          color: #10b981;
        }

        .helper-text.error {
          color: #ef4444;
        }

        .payment-summary {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1.5px solid #a7f3d0;
          border-radius: 12px;
          padding: 16px;
        }

        .summary-title {
          font-size: 12px;
          font-weight: 700;
          color: #047857;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
          color: #065f46;
        }

        .summary-row.total {
          border-top: 1px solid #a7f3d0;
          margin-top: 8px;
          padding-top: 12px;
        }

        .summary-row strong {
          color: #047857;
          font-size: 15px;
        }

        .summary-row.total strong {
          font-size: 18px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 28px;
          border-top: 1px solid #f0f0f0;
          background: #fafafa;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px -5px rgba(30, 58, 95, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: white;
          color: #666;
          border: 1.5px solid #e5e7eb;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .modal-container {
            margin: 10px;
            max-height: calc(100vh - 20px);
          }
        }
      `}</style>
    </div>
  );
};

export default SellInventoryModal;