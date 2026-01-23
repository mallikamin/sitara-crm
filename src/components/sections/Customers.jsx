import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContextAPI';
import CustomerModal from '../modals/CustomerModal';
import CustomerDetails from '../crm/CustomerDetails';

function Customers() {
  const { 
    customers, 
    projects,  // projects ARE transactions
    receipts,
    addCustomer, 
    updateCustomer, 
    deleteCustomer 
  } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

  // Calculate customer stats with transactions
  const customerStats = useMemo(() => {
    return (customers || []).map(customer => {
      // Get all transactions/projects for this customer
      // projects ARE the transactions - stored flat, not nested
      const customerTransactions = (projects || []).filter(p => 
        String(p.customerId) === String(customer.id)
      );

      // Get receipts for this customer
      const customerReceipts = (receipts || []).filter(r => 
        String(r.customerId) === String(customer.id)
      );

      // Calculate totals
      const totalValue = customerTransactions.reduce((sum, t) => 
        sum + (parseFloat(t.sale) || parseFloat(t.saleValue) || parseFloat(t.totalSale) || 0), 0
      );
      const totalReceived = customerTransactions.reduce((sum, t) => 
        sum + (parseFloat(t.received) || parseFloat(t.totalReceived) || 0), 0
      );
      const totalFromReceipts = customerReceipts.reduce((sum, r) => 
        sum + (parseFloat(r.amount) || 0), 0
      );

      return {
        ...customer,
        transactionCount: customerTransactions.length,
        receiptCount: customerReceipts.length,
        totalValue,
        totalReceived: Math.max(totalReceived, totalFromReceipts), // Use higher value
        totalPending: totalValue - Math.max(totalReceived, totalFromReceipts)
      };
    });
  }, [customers, projects, receipts]);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (customerData) => {
    if (selectedCustomer) {
      updateCustomer(selectedCustomer.id, customerData);
    } else {
      addCustomer(customerData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteCustomer = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomer(id);
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const filteredCustomers = customerStats.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle both 'individual' and 'customer' types
    let matchesType = customerTypeFilter === 'all';
    if (customerTypeFilter === 'individual') {
      matchesType = customer.type === 'individual' || customer.type === 'customer';
    } else if (customerTypeFilter !== 'all') {
      matchesType = customer.type === customerTypeFilter;
    }
    
    return matchesSearch && matchesType;
  });

  // Count stats
  const totalCustomers = customers?.length || 0;
  const brokerCount = (customers || []).filter(c => c.type === 'broker').length;
  const customerCount = (customers || []).filter(c => 
    c.type === 'individual' || c.type === 'customer'
  ).length;
  const bothCount = (customers || []).filter(c => c.type === 'both').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button 
          onClick={handleAddCustomer}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
        >
          <span className="mr-2">+</span>
          Add New Customer
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border rounded-lg"
              />
              <span className="absolute left-3 top-2.5">🔍</span>
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="individual">Customers</option>
              <option value="broker">Brokers</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{totalCustomers}</div>
          <div className="text-sm text-gray-600">Total Customers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{brokerCount}</div>
          <div className="text-sm text-gray-600">Brokers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{customerCount}</div>
          <div className="text-sm text-gray-600">Customers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{bothCount}</div>
          <div className="text-sm text-gray-600">Both</div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Customer</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Contact</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Transactions</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">👥</span>
                      <p>No customers found.</p>
                      <p className="text-sm">Click "Add New Customer" to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  return (
                    <tr 
                      key={customer.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetails(customer)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-medium">
                              {customer.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.company || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">{customer.email || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{customer.phone || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          customer.type === 'broker' ? 'bg-orange-100 text-orange-800' :
                          (customer.type === 'individual' || customer.type === 'customer') ? 'bg-green-100 text-green-800' :
                          customer.type === 'both' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.type === 'individual' ? 'Customer' : (customer.type || 'Unknown')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium">
                          {customer.transactionCount} transaction(s)
                        </div>
                        {customer.totalValue > 0 && (
                          <>
                            <div className="text-xs text-gray-500">
                              Total: ₨{customer.totalValue.toLocaleString()}
                            </div>
                            {customer.totalPending > 0 && (
                              <div className="text-xs text-orange-600">
                                Due: ₨{customer.totalPending.toLocaleString()}
                              </div>
                            )}
                          </>
                        )}
                        {customer.receiptCount > 0 && (
                          <div className="text-xs text-emerald-600">
                            {customer.receiptCount} receipt(s)
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          customer.status === 'active' ? 'bg-green-100 text-green-800' :
                          customer.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.status || 'active'}
                        </span>
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="text-green-600 hover:text-green-800 px-2 py-1 text-sm"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                            title="Delete"
                          >
                            🗑️
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

      {/* Customer Modal */}
      {isModalOpen && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Customer Details */}
      {isDetailsOpen && selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </div>
  );
}

export default Customers;