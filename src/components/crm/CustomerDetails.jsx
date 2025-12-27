import { useState } from 'react';
import { useData } from '../../contexts/DataContext';

function CustomerDetails({ customer, onClose }) {
  const { db } = useData();
  
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!customer) return null;
  
  // Get customer's projects
  const customerProjects = db.projects?.filter(p => p.customerId === customer.id) || [];
  
  // Get customer's receipts
  const customerReceipts = db.receipts?.filter(r => r.customerId === customer.id) || [];
  
  // Get customer's interactions
  const customerInteractions = db.interactions?.filter(i => i.customerId === customer.id) || [];
  
  // Calculate totals
  const totalProjectsValue = customerProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalReceived = customerReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalDue = totalProjectsValue - totalReceived;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl text-blue-600 font-bold">
                {customer.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{customer.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-gray-600">{customer.email}</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">{customer.phone}</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                  customer.type === 'corporate' ? 'bg-blue-100 text-blue-800' :
                  customer.type === 'individual' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {customer.type || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            {['overview', 'projects', 'receipts', 'interactions', 'details'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">{customerProjects.length}</div>
                  <div className="text-sm text-gray-600">Total Projects</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">₨{totalProjectsValue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Value</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">₨{totalReceived.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Received</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">₨{totalDue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Due</div>
                </div>
              </div>

              {/* Recent Interactions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Interactions</h3>
                {customerInteractions.length === 0 ? (
                  <p className="text-gray-500">No interactions recorded</p>
                ) : (
                  <div className="space-y-3">
                    {customerInteractions.slice(0, 5).map((interaction) => (
                      <div key={interaction.id} className="border rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="font-medium">{interaction.type}</span>
                          <span className="text-sm text-gray-600">
                            {new Date(interaction.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-2">{interaction.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm">
                            Outcome: <span className="font-medium">{interaction.outcome}</span>
                          </span>
                          {interaction.followUpDate && (
                            <span className="text-sm text-blue-600">
                              Follow up: {new Date(interaction.followUpDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Projects ({customerProjects.length})</h3>
              {customerProjects.length === 0 ? (
                <p className="text-gray-500">No projects found</p>
              ) : (
                <div className="space-y-4">
                  {customerProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Budget: ₨{project.budget?.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              project.status === 'completed' ? 'bg-green-100 text-green-800' :
                              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status || 'Unknown'}
                            </span>
                            <span className="text-sm text-gray-600">
                              Start: {new Date(project.startDate).toLocaleDateString()}
                            </span>
                            {project.endDate && (
                              <span className="text-sm text-gray-600">
                                End: {new Date(project.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'receipts' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Receipts ({customerReceipts.length})</h3>
              {customerReceipts.length === 0 ? (
                <p className="text-gray-500">No receipts found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-2 px-4 text-left">Receipt #</th>
                        <th className="py-2 px-4 text-left">Date</th>
                        <th className="py-2 px-4 text-left">Project</th>
                        <th className="py-2 px-4 text-left">Amount</th>
                        <th className="py-2 px-4 text-left">Method</th>
                        <th className="py-2 px-4 text-left">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerReceipts.map((receipt) => (
                        <tr key={receipt.id} className="border-b">
                          <td className="py-3 px-4">{receipt.receiptNumber}</td>
                          <td className="py-3 px-4">{new Date(receipt.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{receipt.projectName}</td>
                          <td className="py-3 px-4 font-medium">₨{receipt.amount?.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="capitalize">{receipt.method}</span>
                          </td>
                          <td className="py-3 px-4">{receipt.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'interactions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Interactions ({customerInteractions.length})</h3>
              {customerInteractions.length === 0 ? (
                <p className="text-gray-500">No interactions found</p>
              ) : (
                <div className="space-y-4">
                  {customerInteractions.map((interaction) => (
                    <div key={interaction.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="font-medium">{interaction.type}</span>
                            <span className="text-sm text-gray-600">
                              {new Date(interaction.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{interaction.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span>Outcome: <strong>{interaction.outcome}</strong></span>
                            {interaction.followUpDate && (
                              <span className="text-blue-600">
                                Follow up: {new Date(interaction.followUpDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
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
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p>{customer.email || 'Not provided'}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <p>{customer.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Company</label>
                      <p>{customer.company || 'Not provided'}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Customer Type</label>
                      <p className="capitalize">{customer.type || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {customer.address && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Address</h3>
                  <p className="text-gray-700">{customer.address}</p>
                </div>
              )}

              {customer.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-line">{customer.notes}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Additional Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Created</label>
                    <p>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Last Updated</label>
                    <p>{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <p className="capitalize">{customer.status || 'active'}</p>
                  </div>
                </div>
              </div>
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
            Add Interaction
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;