import { useState } from 'react';
import { useData } from '../../contexts/DataContext';

function AddTransactionModal({ transaction, onClose, onSave }) {
  // Get customers, brokers, companyReps, and inventory directly from DataContext
  const { customers = [], brokers = [], companyReps = [], inventory = [] } = useData();
  
  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    brokerId: '',
    brokerCommissionRate: 1,  // DEFAULT 1% (changed from 2.5%)
    companyRepId: '',  // NEW: Company Rep field
    companyRepCommissionRate: 1,  // NEW: Default 1%
    projectName: '',
    unitNumber: '',
    marlas: '',
    ratePerMarla: '',
    saleValue: '',
    installments: 4,
    paymentCycle: 'bi_annual',
    firstDueDate: '',
    status: 'active',
    notes: '',
    inventoryId: ''
  });

  const [showInventory, setShowInventory] = useState(false);

  // Get available inventory items
  const availableInventory = inventory.filter(item => item.status === 'available') || [];
  
  // Filter customers
  const customerList = customers.filter(c => 
    !c.type || c.type === 'individual' || c.type === 'customer' || c.type === 'both'
  );

  // Brokers come from independent array - filter out inactive ones
  const brokerList = brokers.filter(b => b.status !== 'inactive');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'marlas' || name === 'ratePerMarla') {
      const marlas = name === 'marlas' ? parseFloat(value) || 0 : parseFloat(formData.marlas) || 0;
      const rate = name === 'ratePerMarla' ? parseFloat(value) || 0 : parseFloat(formData.ratePerMarla) || 0;
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        saleValue: (marlas * rate).toString()
      }));
    } else if (name === 'brokerId') {
      // When broker is selected, auto-fill their default commission rate
      const broker = brokers.find(b => String(b.id) === String(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        brokerCommissionRate: broker?.commissionRate || 1  // Use broker's rate or default 1%
      }));
    } else if (name === 'companyRepId') {
      // When company rep is selected, auto-fill their default commission rate
      const companyRep = companyReps.find(r => String(r.id) === String(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        companyRepCommissionRate: companyRep?.commissionRate || 1  // Use their rate or default 1%
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectInventory = (item) => {
    setFormData(prev => ({
      ...prev,
      inventoryId: item.id,
      projectName: item.projectName || '',
      unitNumber: item.unitShopNumber || item.unit || '',
      marlas: item.marlas || '',
      ratePerMarla: item.ratePerMarla || '',
      saleValue: (parseFloat(item.marlas || 0) * parseFloat(item.ratePerMarla || 0)).toString(),
      name: `${item.projectName || 'Project'} - ${item.unitShopNumber || item.unit || 'Unit'}`
    }));
    setShowInventory(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.customerId || !formData.saleValue) {
      alert('Please fill in all required fields');
      return;
    }

    // Get selected broker
    let broker = null;
    if (formData.brokerId) {
      broker = brokers.find(b => String(b.id) === String(formData.brokerId));
    }

    // Get selected company rep (NEW)
    let companyRep = null;
    if (formData.companyRepId) {
      companyRep = companyReps.find(r => String(r.id) === String(formData.companyRepId));
    }

    const customer = customers.find(c => String(c.id) === String(formData.customerId));
        
    // Generate a project ID from project name
    const projectId = formData.projectName 
      ? `proj_${formData.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : `proj_${Date.now()}`;
    
    const saleValue = parseFloat(formData.saleValue) || 0;
    
    // Use custom commission rates from form (flexible per transaction)
    const brokerCommissionRate = formData.brokerId ? (parseFloat(formData.brokerCommissionRate) || 1) : 0;
    const brokerCommission = formData.brokerId ? (saleValue * brokerCommissionRate / 100) : 0;
    
    // NEW: Company rep commission calculation
    const companyRepCommissionRate = formData.companyRepId ? (parseFloat(formData.companyRepCommissionRate) || 1) : 0;
    const companyRepCommission = formData.companyRepId ? (saleValue * companyRepCommissionRate / 100) : 0;

    const transactionData = {
      // Include all form data
      ...formData,
      
      // Project identification
      projectId: projectId,
      
      // Customer info
      customerName: customer?.name || '',
      
      // BROKER INFO (1% default)
      brokerId: formData.brokerId || null,
      brokerName: broker?.name || '',
      brokerCommissionRate: brokerCommissionRate,
      brokerCommission: brokerCommission,
      
      // NEW: COMPANY REP INFO (1% default)
      companyRepId: formData.companyRepId || null,
      companyRepName: companyRep?.name || '',
      companyRepCommissionRate: companyRepCommissionRate,
      companyRepCommission: companyRepCommission,
      
      // Financial details
      sale: saleValue,
      totalSale: saleValue,
      received: 0,
      totalReceived: 0,
      receivable: saleValue,
      totalReceivable: saleValue,
      
      // Dates
      nextDue: formData.firstDueDate,
      nextDueDate: formData.firstDueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  
    // Debug logging
    console.log('📝 AddTransactionModal: Creating transaction', {
      hasBrokerId: !!transactionData.brokerId,
      brokerCommissionRate: transactionData.brokerCommissionRate,
      hasCompanyRepId: !!transactionData.companyRepId,
      companyRepCommissionRate: transactionData.companyRepCommissionRate,
      totalCommission: transactionData.brokerCommission + transactionData.companyRepCommission
    });
  
    onSave(transactionData);
  };
    

  // Format currency helper
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (Math.abs(num) >= 10000000) return '₨' + (num / 10000000).toFixed(2) + ' Cr';
    if (Math.abs(num) >= 100000) return '₨' + (num / 100000).toFixed(2) + ' Lac';
    return '₨' + num.toLocaleString('en-PK');
  };

  // Get selected broker and company rep for display
  const selectedBroker = formData.brokerId ? brokers.find(b => String(b.id) === String(formData.brokerId)) : null;
  const selectedCompanyRep = formData.companyRepId ? companyReps.find(r => String(r.id) === String(formData.companyRepId)) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {transaction ? 'Edit Transaction' : 'New Sales Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Select from Available Inventory</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {availableInventory.length} items available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInventory(!showInventory)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showInventory ? 'Hide' : 'Show'} Inventory
              </button>
            </div>
          </div>

          {showInventory && (
            <div className="mb-6 max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 text-left">Project</th>
                    <th className="py-2 px-3 text-left">Unit</th>
                    <th className="py-2 px-3 text-left">Marlas</th>
                    <th className="py-2 px-3 text-left">Rate/Marla</th>
                    <th className="py-2 px-3 text-left">Total</th>
                    <th className="py-2 px-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableInventory.map(item => {
                    const totalValue = (parseFloat(item.marlas || 0) * parseFloat(item.ratePerMarla || 0));
                    return (
                      <tr key={item.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 px-3">{item.projectName || '-'}</td>
                        <td className="py-2 px-3">{item.unitShopNumber || item.unit || '-'}</td>
                        <td className="py-2 px-3">{item.marlas || '-'}</td>
                        <td className="py-2 px-3">₨{(parseFloat(item.ratePerMarla || 0)).toLocaleString()}</td>
                        <td className="py-2 px-3">₨{totalValue.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => handleSelectInventory(item)}
                            className="text-blue-600 hover:underline"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select Customer</option>
                  {customerList.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Broker (Optional)
                  <span className="text-xs text-gray-500 ml-2">Commission defaults to 1%</span>
                </label>
                <select
                  name="brokerId"
                  value={formData.brokerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">No Broker</option>
                  {brokerList.map(broker => (
                    <option key={broker.id} value={broker.id}>
                      {broker.name} - {broker.phone} ({broker.commissionRate || 1}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* NEW: Broker Commission Rate (Editable) */}
              {formData.brokerId && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Broker Commission %
                    <span className="text-xs text-gray-500 ml-2">Editable for this transaction</span>
                  </label>
                  <input
                    type="number"
                    name="brokerCommissionRate"
                    value={formData.brokerCommissionRate}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="1.0"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Commission: {formatCurrency((parseFloat(formData.saleValue || 0) * parseFloat(formData.brokerCommissionRate || 0)) / 100)}
                  </div>
                </div>
              )}

              {/* NEW: Company Rep Field */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Company Rep (Optional)
                  <span className="text-xs text-gray-500 ml-2">Commission defaults to 1%</span>
                </label>
                <select
                  name="companyRepId"
                  value={formData.companyRepId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">No Company Rep</option>
                  {companyReps.filter(r => r.status === 'active').map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} {rep.phone ? `- ${rep.phone}` : ''} ({rep.commissionRate || 1}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* NEW: Company Rep Commission Rate (Editable) */}
              {formData.companyRepId && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Company Rep Commission %
                    <span className="text-xs text-gray-500 ml-2">Editable for this transaction</span>
                  </label>
                  <input
                    type="number"
                    name="companyRepCommissionRate"
                    value={formData.companyRepCommissionRate}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="1.0"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Commission: {formatCurrency((parseFloat(formData.saleValue || 0) * parseFloat(formData.companyRepCommissionRate || 0)) / 100)}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Transaction Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="RUJ - Plot #A-123"
                />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., RUJ, Sitara Heights"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit Number</label>
                <input
                  type="text"
                  name="unitNumber"
                  value={formData.unitNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Plot #A-123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marlas</label>
                  <input
                    type="number"
                    name="marlas"
                    value={formData.marlas}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Per Marla</label>
                  <input
                    type="number"
                    name="ratePerMarla"
                    value={formData.ratePerMarla}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="500000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sale Value *</label>
                <input
                  type="number"
                  name="saleValue"
                  value={formData.saleValue}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Or enter manually"
                />
                {formData.marlas && formData.ratePerMarla && (
                  <div className="text-xs text-gray-500 mt-1">
                    Auto-calculated: ₨{(parseFloat(formData.marlas) * parseFloat(formData.ratePerMarla)).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Installments</label>
                  <select
                    name="installments"
                    value={formData.installments}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="1">1 Installment</option>
                    <option value="2">2 Installments</option>
                    <option value="3">3 Installments</option>
                    <option value="4">4 Installments</option>
                    <option value="6">6 Installments</option>
                    <option value="8">8 Installments</option>
                    <option value="12">12 Installments</option>
                    <option value="16">16 Installments</option>
                    <option value="20">20 Installments</option>
                    <option value="24">24 Installments</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Cycle</label>
                  <select
                    name="paymentCycle"
                    value={formData.paymentCycle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="bi_annual">Bi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">First Due Date *</label>
                <input
                  type="date"
                  name="firstDueDate"
                  value={formData.firstDueDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          {/* UPDATED: Payment Summary with Commission Breakdown */}
          {formData.saleValue && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Payment Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Installment Amount</div>
                  <div className="font-bold">
                    ₨{((parseFloat(formData.saleValue) || 0) / (parseInt(formData.installments) || 1)).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Installments</div>
                  <div className="font-bold">{formData.installments}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Cycle</div>
                  <div className="font-bold capitalize">{formData.paymentCycle.replace('_', '-')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Value</div>
                  <div className="font-bold">₨{(parseFloat(formData.saleValue) || 0).toLocaleString()}</div>
                </div>
              </div>
              
              {/* UPDATED: Commission Summary - Shows Broker AND Company Rep */}
              {(selectedBroker || selectedCompanyRep) && (
                <div className="mt-4 space-y-3">
                  {/* Broker Commission */}
                  {selectedBroker && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                      <h4 className="font-medium mb-1 text-purple-800">🤵 Broker Commission</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-sm text-purple-700">Broker</div>
                          <div className="font-bold text-purple-900">{selectedBroker.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-purple-700">Rate</div>
                          <div className="font-bold text-purple-900">{formData.brokerCommissionRate}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-purple-700">Commission Amount</div>
                          <div className="font-bold text-purple-900">
                            {formatCurrency((parseFloat(formData.saleValue) * parseFloat(formData.brokerCommissionRate)) / 100)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* NEW: Company Rep Commission */}
                  {selectedCompanyRep && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <h4 className="font-medium mb-1 text-green-800">👔 Company Rep Commission</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-sm text-green-700">Company Rep</div>
                          <div className="font-bold text-green-900">{selectedCompanyRep.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-green-700">Rate</div>
                          <div className="font-bold text-green-900">{formData.companyRepCommissionRate}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-green-700">Commission Amount</div>
                          <div className="font-bold text-green-900">
                            {formatCurrency((parseFloat(formData.saleValue) * parseFloat(formData.companyRepCommissionRate)) / 100)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Total Commission */}
                  {(selectedBroker || selectedCompanyRep) && (
                    <div className="p-3 bg-gray-100 border border-gray-300 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Commission</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(
                            ((parseFloat(formData.saleValue) || 0) * 
                            ((parseFloat(formData.brokerCommissionRate) || 0) + (parseFloat(formData.companyRepCommissionRate) || 0))) / 100
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {transaction ? 'Update Transaction' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransactionModal;