import React, { useMemo } from 'react'
import { useCRMStore } from '../../store/useCRMStore'
import { calculateOverallFinancials, calculateCustomerFinancials } from '../../utils/calculations'
import { formatCurrency } from '../../utils/formatters'
import StatCard from './StatCard'

const Dashboard: React.FC = () => {
  const { db } = useCRMStore()
  
  const overallFinancials = useMemo(() => 
    calculateOverallFinancials(db.projects), 
    [db.projects]
  )
  
  const brokersCount = useMemo(() => 
    db.customers.filter(c => c.type === 'broker' || c.type === 'both').length, 
    [db.customers]
  )
  
  const stats = [
    { 
      label: 'Total Customers', 
      value: db.customers.length,
      icon: '👥'
    },
    { 
      label: 'Active Projects', 
      value: db.projects.filter(p => p.status === 'active').length,
      icon: '🏗'
    },
    { 
      label: 'Total Sale Value', 
      value: formatCurrency(overallFinancials.totalSale),
      icon: '💰'
    },
    { 
      label: 'Total Received', 
      value: formatCurrency(overallFinancials.totalReceived),
      icon: '💳'
    },
    { 
      label: 'Total Receivable', 
      value: formatCurrency(overallFinancials.totalReceivable),
      icon: '📊'
    },
    { 
      label: 'Total Overdue', 
      value: formatCurrency(overallFinancials.totalOverdue),
      isDanger: true,
      icon: '⚠️'
    },
    { 
      label: 'Future Receivable', 
      value: formatCurrency(overallFinancials.totalFuture),
      isPrimary: true,
      icon: '📈'
    },
    { 
      label: 'Total Brokers', 
      value: brokersCount,
      icon: '🤝'
    },
  ]

  // Calculate recent activities
  const recentActivities = useMemo(() => {
    const activities = []
    
    // Recent interactions
    const recentInteractions = db.interactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
    
    recentInteractions.forEach(int => {
      const contact = db.customers.find(c => c.id === (int.customerId || int.brokerId))
      if (contact) {
        activities.push({
          id: int.id,
          type: 'interaction',
          icon: int.type === 'call' ? '📞' : int.type === 'email' ? '📧' : '💬',
          description: `${int.type} with ${contact.name}`,
          date: new Date(int.date),
          contact: contact.name,
          status: int.status
        })
      }
    })
    
    // Recent receipts
    const recentReceipts = db.receipts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2)
    
    recentReceipts.forEach(rec => {
      const customer = db.customers.find(c => c.id === rec.customerId)
      const project = db.projects.find(p => p.id === rec.projectId)
      if (customer && project) {
        activities.push({
          id: rec.id,
          type: 'receipt',
          icon: '💰',
          description: `Payment received for ${project.name}`,
          date: new Date(rec.date),
          contact: customer.name,
          amount: rec.amount
        })
      }
    })
    
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
  }, [db])

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            👤 Add Customer
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            🏗 Add Project
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            💬 Log Interaction
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            💰 Add Receipt
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
            📊 Generate Report
          </button>
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">📋 Recent Activities</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All →
          </button>
        </div>
        
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.date.toLocaleDateString()} {activity.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {activity.icon} {activity.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {activity.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {activity.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activity.amount ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {formatCurrency(activity.amount)}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.status === 'follow_up' ? 'bg-yellow-100 text-yellow-800' :
                          activity.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activity.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No recent activities
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard