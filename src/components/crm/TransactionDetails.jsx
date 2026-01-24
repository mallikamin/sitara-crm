import { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';

export default function TransactionDetails({ transaction, onClose, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [brokerDetails, setBrokerDetails] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);

  const { getBroker, getCustomer, getBrokerFinancials, customers, commissionPayments } = useData();

  // Fetch broker and customer details on load
  useEffect(() => {
    if (!transaction) return;
    
      // Fetch broker details if brokerId exists
      if (transaction.brokerId || transaction.broker_id) {
        const broker = getBroker(transaction.brokerId || transaction.broker_id);
        setBrokerDetails(broker);
      }
      
      // FIXED: Always lookup customer by ID
      const customerId = transaction.customerId || transaction.customer_id;
      if (customerId) {
        // Try getCustomer first, then fallback to direct lookup
        let customer = getCustomer ? getCustomer(customerId) : null;
        if (!customer && customers) {
          customer = customers.find(c => String(c.id) === String(customerId));
        }
        setCustomerDetails(customer);
      }
    
  }, [transaction, getBroker, getCustomer, customers]);

  if (!transaction) return null;

  // ========== NORMALIZE FIELD NAMES (snake_case from DB -> camelCase) ==========
  const normalizedTransaction = {
    ...transaction,
    projectName: transaction.projectName || transaction.project_name || transaction.name,
    firstDueDate: transaction.firstDueDate || transaction.first_due_date,
    nextDueDate: transaction.nextDueDate || transaction.next_due_date,
    installmentCount: parseInt(transaction.installmentCount || transaction.installment_count || transaction.installments) || 4,
    paymentCycle: transaction.paymentCycle || transaction.payment_cycle || transaction.cycle || 'bi_annual',
    unitNumber: transaction.unitNumber || transaction.unit_number || transaction.unit,
    ratePerMarla: transaction.ratePerMarla || transaction.rate_per_marla || transaction.rate,
    brokerId: transaction.brokerId || transaction.broker_id,
    customerId: transaction.customerId || transaction.customer_id,
    companyRepId: transaction.companyRepId || transaction.company_rep_id,
  };

  // Get customer name - FIXED: Use looked up customer details
  const customerName = customerDetails?.name || transaction.customerName || 'N/A';
  const customerPhone = customerDetails?.phone || '';
  const customerEmail = customerDetails?.email || '';

  // Calculate financial metrics
  const saleValue = parseFloat(transaction.sale) || parseFloat(transaction.saleValue) || 0;
  const received = parseFloat(transaction.received) || parseFloat(transaction.totalReceived) || 0;
  const receivable = saleValue - received;
  const collectionPercentage = saleValue > 0 ? Math.round((received / saleValue) * 100) : 0;

  // Generate payment schedule - FIXED: Use normalized fields
  const generatePaymentSchedule = () => {
    const firstDue = normalizedTransaction.firstDueDate;
    if (!firstDue) return [];

    const installments = normalizedTransaction.installmentCount;
    const paymentCycle = normalizedTransaction.paymentCycle;
    const firstDueDate = new Date(firstDue);
    
    const cycleMonths = {
      monthly: 1,
      quarterly: 3,
      bi_annual: 6,
      biannual: 6,
      semi_annual: 6,
      annual: 12,
      yearly: 12
    };

    const monthsPerCycle = cycleMonths[paymentCycle] || 6;
    const installmentAmount = saleValue / installments;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Track how much has been paid to determine installment status
    let remainingPaid = received;

    return Array.from({ length: installments }, (_, i) => {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + (i * monthsPerCycle));
      
      // Calculate status based on actual payments
      const amountPaidForThis = Math.min(remainingPaid, installmentAmount);
      remainingPaid -= amountPaidForThis;
      
      let status = 'pending';
      if (amountPaidForThis >= installmentAmount) {
        status = 'paid';
      } else if (amountPaidForThis > 0) {
        status = 'partial';
      } else if (dueDate < today) {
        status = 'overdue';
      }
      
      return {
        installment: i + 1,
        amount: installmentAmount,
        paidAmount: amountPaidForThis,
        dueDate,
        status
      };
    });
  }

  const paymentSchedule = useMemo(generatePaymentSchedule, [transaction, saleValue, received]);

  // Calculate broker commission - FIXED: Use actual commission payments
  const calculateBrokerCommission = () => {
    const brokerId = normalizedTransaction.brokerId;
    if (!brokerId) return { commission: 0, rate: 0, commissionPaid: 0, commissionPending: 0, paidPercentage: 0 };
    
    // Use per-transaction commission rate (1% default)
    const commissionRate = parseFloat(transaction.brokerCommissionRate || transaction.broker_commission_rate) || 1;
    const commission = (saleValue * commissionRate) / 100;
    
    // FIXED: Get ACTUAL paid commission from commissionPayments table
    const actualPaid = (commissionPayments || [])
      .filter(cp => 
        String(cp.projectId || cp.project_id) === String(transaction.id) && 
        (cp.recipientType === 'broker' || cp.recipient_type === 'broker')
      )
      .reduce((sum, cp) => sum + (parseFloat(cp.amount) || parseFloat(cp.paidAmount) || 0), 0);
    
    const commissionPending = commission - actualPaid;
    
    return {
      commission,
      commissionPaid: actualPaid,
      commissionPending: Math.max(0, commissionPending),
      rate: commissionRate,
      paidPercentage: commission > 0 ? Math.round((actualPaid / commission) * 100) : 0
    };
  };

  // Calculate company rep commission - FIXED: Only if assigned AND rate > 0
  const calculateCompanyRepCommission = () => {
    const companyRepId = normalizedTransaction.companyRepId;
    const commissionRate = parseFloat(transaction.companyRepCommissionRate || transaction.company_rep_commission_rate) || 0;
    
    // FIXED: No commission if no company rep assigned OR rate is 0
    if (!companyRepId || commissionRate <= 0) {
      return { commission: 0, rate: 0, commissionPaid: 0, commissionPending: 0, paidPercentage: 0 };
    }
    
    const commission = (saleValue * commissionRate) / 100;
    
    // Get ACTUAL paid commission from commissionPayments table
    const actualPaid = (commissionPayments || [])
      .filter(cp => 
        String(cp.projectId || cp.project_id) === String(transaction.id) && 
        (cp.recipientType === 'companyRep' || cp.recipient_type === 'companyRep' || cp.recipientType === 'company_rep')
      )
      .reduce((sum, cp) => sum + (parseFloat(cp.amount) || parseFloat(cp.paidAmount) || 0), 0);
    
    const commissionPending = commission - actualPaid;
    
    return {
      commission,
      commissionPaid: actualPaid,
      commissionPending: Math.max(0, commissionPending),
      rate: commissionRate,
      paidPercentage: commission > 0 ? Math.round((actualPaid / commission) * 100) : 0
    };
  };

  const brokerCommission = calculateBrokerCommission();
  const companyRepCommission = calculateCompanyRepCommission();

  // Calculate actual next due date from payment schedule
  const calculatedNextDueDate = useMemo(() => {
    if (paymentSchedule.length === 0) return null;
    
    // Find the first unpaid or overdue installment
    const nextDue = paymentSchedule.find(p => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial');
    return nextDue ? nextDue.dueDate : null;
  }, [paymentSchedule]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold">{transaction.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-gray-600">#{transaction.id?.substring(0, 8)}</span>
              <span className="text-gray-600">•</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                transaction.status === 'active' ? 'bg-green-100 text-green-800' :
                transaction.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                transaction.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {transaction.status || 'active'}
              </span>
              {brokerDetails && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  🤵 {brokerDetails.name}
                </span>
              )}
              {transaction.companyRepName && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  👔 {transaction.companyRepName}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === 'overview' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === 'payments' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Payment Schedule
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === 'details' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('broker')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === 'broker' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Broker Info
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                  <div className="text-sm text-purple-700 mb-1">Sale Value</div>
                  <div className="text-2xl font-bold text-purple-900">₨{saleValue.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                  <div className="text-sm text-green-700 mb-1">Received</div>
                  <div className="text-2xl font-bold text-green-900">₨{received.toLocaleString()}</div>
                  <div className="text-xs text-green-600 mt-1">{collectionPercentage}% collected</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
                  <div className="text-sm text-orange-700 mb-1">Receivable</div>
                  <div className="text-2xl font-bold text-orange-900">₨{receivable.toLocaleString()}</div>
                  <div className="text-xs text-orange-600 mt-1">{100 - collectionPercentage}% pending</div>
                </div>
              </div>

              {/* Customer & Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <div className="font-medium">{customerName}</div>
                    </div>
                    {customerPhone && (
                      <div>
                        <span className="text-sm text-gray-600">Phone:</span>
                        <div className="font-medium">{customerPhone}</div>
                      </div>
                    )}
                    {customerEmail && (
                      <div>
                        <span className="text-sm text-gray-600">Email:</span>
                        <div className="font-medium">{customerEmail}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Project Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Project:</span>
                      <div className="font-medium">{normalizedTransaction.projectName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Unit:</span>
                      <div className="font-medium">{normalizedTransaction.unitNumber || 'N/A'}</div>
                    </div>
                    {normalizedTransaction.ratePerMarla > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Rate/Marla:</span>
                        <div className="font-medium">₨{parseFloat(normalizedTransaction.ratePerMarla).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Commission Summary - Shows BOTH broker and company rep */}
              {(brokerCommission.commission > 0 || companyRepCommission.commission > 0) && (
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">💰 Commission Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Broker Commission */}
                    {brokerCommission.commission > 0 && (
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-900">🤵 Broker ({brokerCommission.rate}%)</span>
                          {brokerDetails && <span className="text-xs text-gray-600">{brokerDetails.name}</span>}
                        </div>
                        <div className="text-2xl font-bold text-purple-700 mb-2">
                          ₨{brokerCommission.commission.toLocaleString()}
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Paid: ₨{brokerCommission.commissionPaid.toLocaleString()}</span>
                          <span>Pending: ₨{brokerCommission.commissionPending.toLocaleString()}</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-purple-600 h-1.5 rounded-full" 
                            style={{ width: `${brokerCommission.paidPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Company Rep Commission */}
                    {companyRepCommission.commission > 0 && (
                      <div className="bg-white border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-900">👔 Company Rep ({companyRepCommission.rate}%)</span>
                          {transaction.companyRepName && <span className="text-xs text-gray-600">{transaction.companyRepName}</span>}
                        </div>
                        <div className="text-2xl font-bold text-green-700 mb-2">
                          ₨{companyRepCommission.commission.toLocaleString()}
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Paid: ₨{companyRepCommission.commissionPaid.toLocaleString()}</span>
                          <span>Pending: ₨{companyRepCommission.commissionPending.toLocaleString()}</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-600 h-1.5 rounded-full" 
                            style={{ width: `${companyRepCommission.paidPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Total if both exist */}
                  {(brokerCommission.commission > 0 && companyRepCommission.commission > 0) && (
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="font-semibold">Total Commission:</span>
                      <span className="text-xl font-bold">
                        ₨{(brokerCommission.commission + companyRepCommission.commission).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Payment Schedule</h3>
              {paymentSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No payment schedule available</p>
                  <p className="text-sm text-gray-400 mt-2">First due date is not set for this transaction</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentSchedule.map((payment) => (
                    <div key={payment.installment} className={`border rounded-lg p-4 ${
                      payment.status === 'overdue' ? 'border-red-300 bg-red-50' : ''
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Installment #{payment.installment}</div>
                          <div className="text-sm text-gray-600">
                            Due: {payment.dueDate.toLocaleDateString()}
                          </div>
                          {payment.status === 'partial' && (
                            <div className="text-xs text-blue-600 mt-1">
                              Paid: ₨{payment.paidAmount?.toLocaleString() || 0}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₨{payment.amount.toLocaleString()}</div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            payment.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : payment.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : payment.status === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status === 'paid' ? 'Paid' : 
                             payment.status === 'overdue' ? 'Overdue' :
                             payment.status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Transaction Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Installments</label>
                      <p>{normalizedTransaction.installmentCount}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Payment Cycle</label>
                      <p className="capitalize">{normalizedTransaction.paymentCycle?.replace('_', ' ') || 'Bi-Annual'}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">First Due Date</label>
                      <p>{normalizedTransaction.firstDueDate ? new Date(normalizedTransaction.firstDueDate).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Next Due Date</label>
                      <p>{calculatedNextDueDate 
                        ? calculatedNextDueDate.toLocaleDateString() 
                        : (receivable <= 0 ? 'All paid' : 'Not set')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {transaction.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-line">{transaction.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'broker' && brokerDetails && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4">Broker Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Name</div>
                    <div className="font-medium text-lg">{brokerDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      brokerDetails.status === 'active' ? 'bg-green-100 text-green-800' :
                      brokerDetails.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {brokerDetails.status || 'active'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium">{brokerDetails.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium">{brokerDetails.email || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Broker Commission Details */}
              {brokerCommission.commission > 0 && (
                <div className="border rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4">Broker Commission ({brokerCommission.rate}%)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700">
                        ₨{brokerCommission.commission.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Commission</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        ₨{brokerCommission.commissionPaid.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Commission Paid</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700">
                        ₨{brokerCommission.commissionPending.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Commission Pending</div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Commission Payment Progress</span>
                      <span>{brokerCommission.paidPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${brokerCommission.paidPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {brokerDetails.notes && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Broker Notes</h4>
                  <p className="text-gray-700">{brokerDetails.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'broker' && !brokerDetails && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold mb-2">No Broker Assigned</h3>
              <p className="text-gray-600">
                This transaction doesn't have an assigned broker.
                {transaction.brokerId && ' The assigned broker might have been deleted.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Record Payment
          </button>
          <button 
            onClick={() => onEdit?.(transaction)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Edit Transaction
          </button>
        </div>
      </div>
    </div>
  );
}