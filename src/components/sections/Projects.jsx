import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';
import AddTransactionModal from '../modals/AddTransactionModal';
import EditTransactionModal from '../modals/EditTransactionModal';
import TransactionDetails from '../crm/TransactionDetails';

function Projects({ onBulkUpload }) {
  const { 
    projects,        // All transactions
    customers, 
    brokers,
    commissionPayments,
    addTransaction, 
    updateProject,
    deleteProject 
  } = useData();
  
  // View mode: 'transactions' or 'master'
  const [viewMode, setViewMode] = useState('transactions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [expandedProject, setExpandedProject] = useState(null);

  // Get customers and brokers for filters
  const customersList = customers || [];
  const brokersList = brokers || [];
  
  // Normalize transactions data
  const allTransactions = (projects || []).map(project => ({
    ...project,
    saleValue: project.sale || project.saleValue || project.totalSale || 0,
    totalReceived: project.received || project.totalReceived || 0,
    totalReceivable: project.receivable || project.totalReceivable || 
      ((project.sale || project.saleValue || 0) - (project.received || project.totalReceived || 0)),
    unitNumber: project.unit || project.unitNumber,
    nextDueDate: project.nextDue || project.nextDueDate || project.firstDueDate,
  }));

  // ========== MASTER PROJECTS VIEW ==========
  const masterProjectsList = useMemo(() => {
    const projectGroups = {};
    
    allTransactions.forEach(transaction => {
      const projectName = transaction.projectName || transaction.name || 'Unnamed Project';
      
      if (!projectGroups[projectName]) {
        projectGroups[projectName] = {
          id: `master_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: projectName,
          transactions: [],
          totalUnits: 0,
          soldUnits: 0,
          activeUnits: 0,
          completedUnits: 0,
          totalSaleValue: 0,
          totalReceived: 0,
          totalReceivable: 0,
          totalBrokerCommission: 0,
          totalBrokerCommissionPaid: 0,
          totalCompanyRepCommission: 0,
          totalCompanyRepCommissionPaid: 0,
        };
      }
      
      const group = projectGroups[projectName];
      group.transactions.push(transaction);
      group.totalUnits++;
      
      // Count by status
      if (transaction.status === 'active') group.activeUnits++;
      if (transaction.status === 'completed') group.completedUnits++;
      if (transaction.status !== 'cancelled') group.soldUnits++;
      
      const sale = parseFloat(transaction.sale || transaction.saleValue || 0);
      const received = parseFloat(transaction.received || transaction.totalReceived || 0);
      
      group.totalSaleValue += sale;
      group.totalReceived += received;
      group.totalReceivable += (sale - received);
      
      // Calculate commissions
      const brokerCommissionRate = parseFloat(transaction.brokerCommissionRate || 0);
      const companyRepCommissionRate = parseFloat(transaction.companyRepCommissionRate || 0);
      
      group.totalBrokerCommission += (sale * brokerCommissionRate / 100);
      group.totalCompanyRepCommission += (sale * companyRepCommissionRate / 100);
      
      // Calculate paid commissions
      if (commissionPayments) {
        const brokerPayments = commissionPayments
          .filter(cp => cp.projectId === transaction.id && cp.recipientType === 'broker')
          .reduce((sum, cp) => sum + (cp.paidAmount || 0), 0);
        
        const companyRepPayments = commissionPayments
          .filter(cp => cp.projectId === transaction.id && cp.recipientType === 'companyRep')
          .reduce((sum, cp) => sum + (cp.paidAmount || 0), 0);
        
        group.totalBrokerCommissionPaid += brokerPayments;
        group.totalCompanyRepCommissionPaid += companyRepPayments;
      }
    });
    
    return Object.values(projectGroups);
  }, [allTransactions, commissionPayments]);

  // Filter master projects
  const filteredMasterProjects = useMemo(() => {
    let result = [...masterProjectsList];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(term));
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'units_desc': return b.totalUnits - a.totalUnits;
        case 'sales_desc': return b.totalSaleValue - a.totalSaleValue;
        case 'commission_desc': 
          return (b.totalBrokerCommission + b.totalCompanyRepCommission) - 
                 (a.totalBrokerCommission + a.totalCompanyRepCommission);
        default: return 0;
      }
    });
    
    return result;
  }, [masterProjectsList, searchTerm, sortBy]);

  // ========== TRANSACTIONS VIEW ==========
  const filteredTransactions = allTransactions.filter(transaction => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (transaction.name || '').toLowerCase().includes(searchLower) ||
      (transaction.unit || '').toLowerCase().includes(searchLower) ||
      (transaction.unitNumber || '').toLowerCase().includes(searchLower) ||
      (transaction.customerName || '').toLowerCase().includes(searchLower) ||
      (transaction.projectName || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || 
      String(transaction.customerId) === String(customerFilter);
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  // Calculate totals based on current view
  const totals = useMemo(() => {
    if (viewMode === 'master') {
      return filteredMasterProjects.reduce((acc, project) => ({
        totalProjects: acc.totalProjects + 1,
        totalUnits: acc.totalUnits + project.totalUnits,
        totalSaleValue: acc.totalSaleValue + project.totalSaleValue,
        totalReceived: acc.totalReceived + project.totalReceived,
        totalReceivable: acc.totalReceivable + project.totalReceivable,
        totalCommission: acc.totalCommission + project.totalBrokerCommission + project.totalCompanyRepCommission,
        count: acc.count + 1,
      }), {
        totalProjects: 0,
        totalUnits: 0,
        totalSaleValue: 0,
        totalReceived: 0,
        totalReceivable: 0,
        totalCommission: 0,
        count: 0
      });
    } else {
      return filteredTransactions.reduce((acc, transaction) => {
        const saleValue = Number(transaction.saleValue || transaction.sale || 0);
        const received = Number(transaction.totalReceived || transaction.received || 0);
        const receivable = saleValue - received;
        const brokerCommission = (saleValue * (transaction.brokerCommissionRate || 0)) / 100;
        const companyRepCommission = (saleValue * (transaction.companyRepCommissionRate || 0)) / 100;

        return {
          totalSaleValue: acc.totalSaleValue + saleValue,
          totalReceived: acc.totalReceived + received,
          totalReceivable: acc.totalReceivable + receivable,
          totalCommission: acc.totalCommission + brokerCommission + companyRepCommission,
          count: acc.count + 1
        };
      }, {
        totalSaleValue: 0,
        totalReceived: 0,
        totalReceivable: 0,
        totalCommission: 0,
        count: 0
      });
    }
  }, [viewMode, filteredMasterProjects, filteredTransactions]);

  // Event handlers
  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  };

  const handleSaveTransaction = (transactionData) => {
    addTransaction(transactionData);
    setIsModalOpen(false);
  };

  const handleUpdateTransaction = (transactionId, updates) => {
    updateProject(transactionId, updates);
    setIsEditModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleDeleteTransaction = (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteProject(transactionId);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (Math.abs(num) >= 10000000) return '₨' + (num / 10000000).toFixed(2) + ' Cr';
    if (Math.abs(num) >= 100000) return '₨' + (num / 100000).toFixed(2) + ' Lac';
    return '₨' + num.toLocaleString('en-PK');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const toggleExpand = (projectId) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  return (
    <div className="p-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {viewMode === 'master' ? 'Master Projects' : 'Sales Transactions'}
          </h1>
          <p className="text-gray-600">
            {viewMode === 'master' 
              ? 'Aggregated view of all projects with commission tracking' 
              : 'Manage property/plot sales and installments'}
          </p>
        </div>
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                viewMode === 'transactions'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Transactions
            </button>
            <button
              onClick={() => setViewMode('master')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                viewMode === 'master'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏢 Master Projects
            </button>
          </div>
          {/* Bulk Upload Button */}
          {onBulkUpload && (
            <button 
              onClick={onBulkUpload}
              className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 flex items-center"
            >
              <span className="mr-2">📤</span>
              Bulk Upload
            </button>
          )}
          <button 
            onClick={handleAddTransaction}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <span className="mr-2">+</span>
            New Transaction
          </button>
        </div>
      </div>

      {/* Stats Cards - Dynamic based on view */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {viewMode === 'master' ? (
          <>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold">{totals.totalProjects}</div>
              <div className="text-sm text-gray-600">Total Projects</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{totals.totalUnits}</div>
              <div className="text-sm text-gray-600">Total Units</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totals.totalSaleValue)}</div>
              <div className="text-sm text-gray-600">Total Sales</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-indigo-600">{formatCurrency(totals.totalCommission)}</div>
              <div className="text-sm text-gray-600">Total Commission</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold">{totals.count}</div>
              <div className="text-sm text-gray-600">Total Transactions</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totals.totalSaleValue)}</div>
              <div className="text-sm text-gray-600">Total Sale Value</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalReceived)}</div>
              <div className="text-sm text-gray-600">Total Received</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalReceivable)}</div>
              <div className="text-sm text-gray-600">Total Receivable</div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder={viewMode === 'master' ? 'Search projects...' : 'Search transactions...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border rounded-lg"
              />
              <span className="absolute left-3 top-2.5">🔍</span>
            </div>
          </div>
          
          {viewMode === 'transactions' ? (
            <>
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="all">All Customers</option>
                  {customersList.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="w-full md:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="units_desc">Most Units</option>
                <option value="sales_desc">Highest Sales</option>
                <option value="commission_desc">Highest Commission</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content - Transactions View or Master Projects View */}
      {viewMode === 'transactions' ? (
        /* TRANSACTIONS TABLE VIEW */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Transaction</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Project</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Customer</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Sale Value</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Received</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Due</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">📋</span>
                        <p>No transactions found.</p>
                        <p className="text-sm">Click "New Transaction" to create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const saleValue = Number(transaction.saleValue || transaction.sale || 0);
                    const received = Number(transaction.totalReceived || transaction.received || 0);
                    const due = saleValue - received;
                    
                    return (
                      <tr 
                        key={transaction.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewDetails(transaction)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">{transaction.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">{transaction.projectName || '-'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{transaction.customerName || '-'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{transaction.unitNumber || transaction.unit || '-'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{formatCurrency(saleValue)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-green-600 font-medium">{formatCurrency(received)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-red-600 font-medium">{formatCurrency(due)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status || 'active'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MASTER PROJECTS VIEW */
        <div className="space-y-4">
          {filteredMasterProjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <span className="text-4xl block mb-2">🏢</span>
              <p>No projects found.</p>
            </div>
          ) : (
            filteredMasterProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Project Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                        <span className="text-sm text-gray-500">
                          {expandedProject === project.id ? '▼' : '▶'} {project.totalUnits} units
                        </span>
                      </div>
                      
                      {/* Project Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Sold Units</div>
                          <div className="text-lg font-semibold text-gray-900">{project.soldUnits}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total Sales</div>
                          <div className="text-lg font-semibold text-purple-600">{formatCurrency(project.totalSaleValue)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Received</div>
                          <div className="text-lg font-semibold text-green-600">{formatCurrency(project.totalReceived)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Receivable</div>
                          <div className="text-lg font-semibold text-red-600">{formatCurrency(project.totalReceivable)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Commission Owed</div>
                          <div className="text-lg font-semibold text-indigo-600">
                            {formatCurrency(project.totalBrokerCommission + project.totalCompanyRepCommission)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Commission Paid</div>
                          <div className="text-lg font-semibold text-teal-600">
                            {formatCurrency(project.totalBrokerCommissionPaid + project.totalCompanyRepCommissionPaid)}
                          </div>
                        </div>
                      </div>

                      {/* Commission Breakdown */}
                      {(project.totalBrokerCommission > 0 || project.totalCompanyRepCommission > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.totalBrokerCommission > 0 && (
                              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                <div>
                                  <div className="text-xs text-purple-700 font-medium">🤵 Broker Commission</div>
                                  <div className="text-sm text-purple-900">
                                    Paid: {formatCurrency(project.totalBrokerCommissionPaid)} / {formatCurrency(project.totalBrokerCommission)}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-purple-600">
                                  {formatCurrency(project.totalBrokerCommission - project.totalBrokerCommissionPaid)}
                                </div>
                              </div>
                            )}
                            {project.totalCompanyRepCommission > 0 && (
                              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div>
                                  <div className="text-xs text-green-700 font-medium">👔 Company Rep Commission</div>
                                  <div className="text-sm text-green-900">
                                    Paid: {formatCurrency(project.totalCompanyRepCommissionPaid)} / {formatCurrency(project.totalCompanyRepCommission)}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency(project.totalCompanyRepCommission - project.totalCompanyRepCommissionPaid)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions List */}
                {expandedProject === project.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Transactions ({project.transactions.length})</h4>
                    <div className="space-y-2">
                      {project.transactions.map((txn) => (
                        <div 
                          key={txn.id} 
                          className="bg-white p-4 rounded border border-gray-200 hover:border-blue-300 cursor-pointer transition"
                          onClick={() => handleViewDetails(txn)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{txn.name}</div>
                              <div className="text-sm text-gray-600">
                                {txn.customerName} • {txn.unitNumber || txn.unit}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(txn.sale || txn.saleValue)}</div>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(txn.status)}`}>
                                {txn.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <AddTransactionModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
        />
      )}

      {isEditModalOpen && selectedTransaction && (
        <EditTransactionModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          customers={customersList}
          brokers={brokersList}
          onSave={handleUpdateTransaction}
        />
      )}

      {isDetailsOpen && selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTransaction(null);
          }}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}
    </div>
  );
}

export default Projects;