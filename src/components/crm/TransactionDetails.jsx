import { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';

export default function TransactionDetails({ transaction, onClose, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [brokerDetails, setBrokerDetails] = useState(null);

  const { getBroker, getCustomer, getBrokerFinancials } = useData();

  // Fetch broker and customer details on load
  useEffect(() => {
    if (!transaction) return;
    
      // Fetch broker details if brokerId exists
      if (transaction.brokerId) {
        const broker = getBroker(transaction.brokerId);
        setBrokerDetails(broker);
      }
      
      // Note: customer details are already in transaction.customerName
      // but could also fetch full customer object if needed:
      // const customer = getCustomer(transaction.customerId);
      // setCustomerDetails(customer);
    
  }, [transaction, getBroker, getCustomer]);

  if (!transaction) return null;

  // Calculate financial metrics
  const saleValue = parseFloat(transaction.sale) || parseFloat(transaction.saleValue) || 0;
  const received = parseFloat(transaction.received) || parseFloat(transaction.totalReceived) || 0;
  const receivable = saleValue - received;
  const collectionPercentage = saleValue > 0 ? Math.round((received / saleValue) * 100) : 0;

  // Generate payment schedule
  const generatePaymentSchedule = () => {
    if (!transaction.installments || !transaction.firstDueDate) return [];

    const installments = parseInt(transaction.installments) || 4;
    const paymentCycle = transaction.paymentCycle || transaction.cycle || 'bi_annual';
    const firstDueDate = new Date(transaction.firstDueDate);
    
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

    return Array.from({ length: installments }, (_, i) => {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + (i * monthsPerCycle));
      
      return {
        installment: i + 1,
        amount: installmentAmount,
        dueDate,
        status: i === 0 ? 'paid' : 'pending' // Simple logic, could be enhanced
      };
    });
  }

  const paymentSchedule = useMemo(generatePaymentSchedule, [transaction]);

  // Calculate broker commission (uses per-transaction rate - FIXED)
  const calculateBrokerCommission = () => {
    if (!transaction.brokerId) return { commission: 0, rate: 0, commissionPaid: 0, commissionPending: 0, paidPercentage: 0 };
    
    // Use per-transaction commission rate (1% default)
    const commissionRate = parseFloat(transaction.brokerCommissionRate) || 1;
    const commission = (saleValue * commissionRate) / 100;
    const commissionPaid = (received * commissionRate) / 100;
    const commissionPending = commission - commissionPaid;
    
    return {
      commission,
      commissionPaid,
      commissionPending,
      rate: commissionRate,
      paidPercentage: commission > 0 ? Math.round((commissionPaid / commission) * 100) : 0
    };
  };

  // Calculate company rep commission (NEW)
  const calculateCompanyRepCommission = () => {
    if (!transaction.companyRepId) return { commission: 0, rate: 0, commissionPaid: 0, commissionPending: 0, paidPercentage: 0 };
    
    const commissionRate = parseFloat(transaction.companyRepCommissionRate) || 1;
    const commission = (saleValue * commissionRate) / 100;
    const commissionPaid = (received * commissionRate) / 100;
    const commissionPending = commission - commissionPaid;
    
    return {
      commission,
      commissionPaid,
      commissionPending,
      rate: commissionRate,
      paidPercentage: commission > 0 ? Math.round((commissionPaid / commission) * 100) : 0
    };
  };

  const brokerCommission = calculateBrokerCommission();
  const companyRepCommission = calculateCompanyRepCommission();

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
                      <div className="font-medium">{transaction.customerName || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Project Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Project:</span>
                      <div className="font-medium">{transaction.projectName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Unit:</span>
                      <div className="font-medium">{transaction.unit || transaction.unitNumber || 'N/A'}</div>
                    </div>
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
                <p className="text-gray-500">No payment schedule available</p>
              ) : (
                <div className="space-y-3">
                  {paymentSchedule.map((payment) => (
                    <div key={payment.installment} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Installment #{payment.installment}</div>
                          <div className="text-sm text-gray-600">
                            Due: {payment.dueDate.toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₨{payment.amount.toLocaleString()}</div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            payment.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status === 'paid' ? 'Paid' : 'Pending'}
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
                      <p>{transaction.installments || 4}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Payment Cycle</label>
                      <p className="capitalize">{transaction.paymentCycle?.replace('_', ' ') || 'Bi-Annual'}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">First Due Date</label>
                      <p>{transaction.firstDueDate ? new Date(transaction.firstDueDate).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Next Due Date</label>
                      <p>{transaction.nextDueDate ? new Date(transaction.nextDueDate).toLocaleDateString() : 'Not set'}</p>
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