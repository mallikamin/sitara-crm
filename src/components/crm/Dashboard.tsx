import React, { useMemo, useState, useEffect } from 'react'; // Added useEffect import
import { useCRMStore } from "/src/store/useCRMStore";
import { calculateOverallFinancials } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import StatCard from './StatCard';
import { InventorySection } from './InventorySection';
import { InventoryItem } from '../../types/crm';
import { Package, Users, Building, DollarSign, Clock, AlertTriangle, TrendingUp, Handshake } from 'lucide-react';
import { useData } from '../../contexts/DataContextAPI';

const Dashboard: React.FC = () => {
  const { db, deleteInventory, bulkImportInventory, addNotification, addCustomer, addProject, addInteraction, addReceipt, addInventory } = useCRMStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState<'customer' | 'project' | 'interaction' | 'receipt' | null>(null);

  // Also get data from DataContext for broker information
  const { brokers: dataBrokers } = useData();

  // Combine brokers from both stores (use CRMStore as primary)
  const brokers = db.brokers || dataBrokers || [];

  // Financial calculations
  const overallFinancials = useMemo(() => 
    calculateOverallFinancials(db.projects), 
    [db.projects]
  );

  // Calculate broker statistics
  const brokerStats = useMemo(() => {
    const totalBrokers = brokers.length;
    const activeBrokers = brokers.filter(b => b.status === 'active').length;
    
    // Calculate total broker commissions
    let totalCommission = 0;
    let pendingCommission = 0;
    let brokerDeals = 0;
    
    db.projects.forEach(project => {
      if (project.brokerId) {
        const broker = brokers.find(b => b.id === project.brokerId);
        if (broker) {
          brokerDeals++;
          const saleValue = parseFloat(project.sale) || parseFloat(project.saleValue) || 0;
          const received = parseFloat(project.received) || parseFloat(project.totalReceived) || 0;
          const commissionRate = broker.commissionRate || 1;
          
          totalCommission += (saleValue * commissionRate) / 100;
          pendingCommission += ((saleValue - received) * commissionRate) / 100;
        }
      }
    });

    return {
      totalBrokers,
      activeBrokers,
      brokerDeals,
      totalCommission,
      pendingCommission
    };
  }, [db.projects, brokers]);

  // Stats data with icons
  const stats = [
    { 
      label: 'Total Customers', 
      value: db.customers.length,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      change: '+12%',
      description: 'Total registered customers'
    },
    { 
      label: 'Brokers', 
      value: brokerStats.totalBrokers,
      icon: <Handshake className="w-6 h-6" />,
      color: 'bg-purple-500',
      change: brokerStats.activeBrokers > 0 ? `${brokerStats.activeBrokers} active` : '',
      description: 'Total brokers',
      isBroker: true
    },
    { 
      label: 'Broker Deals', 
      value: brokerStats.brokerDeals,
      icon: <Handshake className="w-6 h-6" />,
      color: 'bg-indigo-500',
      description: 'Deals with brokers',
      isBroker: true
    },
    { 
      label: 'Active Projects', 
      value: db.projects.filter(p => p.status === 'active').length,
      icon: <Building className="w-6 h-6" />,
      color: 'bg-green-500',
      change: '+5%',
      description: 'Currently active projects'
    },
    { 
      label: 'Total Sale Value', 
      value: formatCurrency(overallFinancials.totalSale),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-purple-500',
      description: 'Total project sale value'
    },
    { 
      label: 'Total Received', 
      value: formatCurrency(overallFinancials.totalReceived),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-emerald-500',
      change: '+8%',
      description: 'Total amount received'
    },
    { 
      label: 'Pending Receivable', 
      value: formatCurrency(overallFinancials.totalReceivable),
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-amber-500',
      isWarning: true,
      description: 'Pending payments'
    },
    { 
      label: 'Overdue Amount', 
      value: formatCurrency(overallFinancials.totalOverdue),
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'bg-red-500',
      isDanger: true,
      description: 'Overdue payments'
    },
    { 
      label: 'Future Receivable', 
      value: formatCurrency(overallFinancials.totalFuture),
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-indigo-500',
      description: 'Future expected payments'
    },
    { 
      label: 'Available Inventory', 
      value: db.inventory.filter(i => i.status === 'available').length,
      icon: <Package className="w-6 h-6" />,
      color: 'bg-cyan-500',
      description: 'Available units'
    },
    { 
      label: 'Broker Commission', 
      value: formatCurrency(brokerStats.totalCommission),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-pink-500',
      description: 'Total broker commission',
      isBroker: true
    },
    { 
      label: 'Pending Commission', 
      value: formatCurrency(brokerStats.pendingCommission),
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-orange-500',
      isWarning: true,
      description: 'Commission pending payment',
      isBroker: true
    },
  ];

  useEffect(() => {
    // Test if store functions are working
    console.log('Store functions available:', {
      addInventory: typeof addInventory,
      bulkImportInventory: typeof bulkImportInventory,
      deleteInventory: typeof deleteInventory
    }); 
    
    // Debug brokers
    console.log('Brokers data:', {
      fromCRMStore: db.brokers?.length || 0,
      fromDataContext: dataBrokers?.length || 0,
      combined: brokers.length
    });
    
    window.testInventory = () => {
      const testItem = {
        projectName: 'Test Project',
        block: 'A',
        unitShopNumber: 'TEST-' + Date.now(),
        unitType: 'Residential' as const,
        marlas: 5,
        ratePerMarla: 500000,
        totalValue: 2500000,
        saleValue: 2500000,
        plotFeatures: ['Test'],
        plotFeature: 'Test',
        status: 'available' as const,
      };
      
      addInventory(testItem);
      addNotification({
        type: 'success',
        message: 'Test item added via console',
        timestamp: new Date().toISOString()
      });
      console.log('Test item added:', testItem);
    };
  }, [addInventory, addNotification, bulkImportInventory, deleteInventory, db.brokers, dataBrokers, brokers]);

  // Handle inventory import from Excel
  const handleImportInventory = (items: Partial<InventoryItem>[]) => {
    bulkImportInventory(items);
    
    addNotification({
      type: 'success',
      message: `Successfully imported ${items.length} inventory items`,
      timestamp: new Date().toISOString()
    });
  };

  // Handle delete inventory
  const handleDeleteInventory = (id: string) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      deleteInventory(id);
      addNotification({
        type: 'success',
        message: 'Inventory item deleted successfully',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Handle add inventory (opens your modal)
  const handleAddInventory = () => {
    console.log('Opening Add Inventory modal');
    
    // For now, add a dummy inventory item to test
    const newItem = {
      projectName: 'Test Project',
      block: 'A',
      unitShopNumber: '101',
      unitType: 'Residential' as const,
      marlas: 5,
      ratePerMarla: 500000,
      totalValue: 2500000,
      saleValue: 2500000,
      plotFeatures: ['Corner', 'Park View'],
      plotFeature: 'Corner',
      status: 'available' as const,
    };
    
    // Add to store
    addInventory(newItem);
    
    addNotification({
      type: 'success',
      message: 'Inventory item added (test mode)',
      timestamp: new Date().toISOString()
    });
  };

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'customer':
        setShowAddModal('customer');
        break;
      case 'project':
        setShowAddModal('project');
        break;
      case 'interaction':
        setShowAddModal('interaction');
        break;
      case 'receipt':
        setShowAddModal('receipt');
        break;
      case 'inventory':
        setActiveSection('inventory');
        break;
      case 'brokers':
        // Navigate to brokers page
        window.location.href = '/brokers';
        break;
      case 'report':
        // Generate report logic
        addNotification({
          type: 'info',
          message: 'Generating report...',
          timestamp: new Date().toISOString()
        });
        break;
      default:
        break;
    }
  };

  // Calculate recent activities with broker support
  const recentActivities = useMemo(() => {
    const activities = [];
    
    // Recent interactions (including broker interactions)
    const recentInteractions = db.interactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
    
    recentInteractions.forEach(int => {
      let contact = null;
      let contactType = '';
      
      if (int.customerId) {
        contact = db.customers.find(c => c.id === int.customerId);
        contactType = 'customer';
      } else if (int.brokerId) {
        contact = brokers.find(b => b.id === int.brokerId);
        contactType = 'broker';
      }
      
      if (contact) {
        activities.push({
          id: int.id,
          type: 'interaction',
          icon: int.type === 'call' ? '📞' : int.type === 'email' ? '📧' : '💬',
          description: `${int.type} with ${contact.name}`,
          date: new Date(int.date),
          contact: contact.name,
          contactType: contactType,
          status: int.status
        });
      }
    });
    
    // Recent receipts
    const recentReceipts = db.receipts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2);
    
    recentReceipts.forEach(rec => {
      const customer = db.customers.find(c => c.id === rec.customerId);
      const project = db.projects.find(p => p.id === rec.projectId);
      if (customer && project) {
        activities.push({
          id: rec.id,
          type: 'receipt',
          icon: '💰',
          description: `Payment received for ${project.name}`,
          date: new Date(rec.date),
          contact: customer.name,
          amount: rec.amount
        });
      }
    });
    
    // Recent inventory updates
    const recentInventory = db.inventory
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 2)
      .filter(item => new Date(item.updatedAt).getTime() !== new Date(item.createdAt).getTime());
    
    recentInventory.forEach(item => {
      activities.push({
        id: item.id,
        type: 'inventory',
        icon: '📦',
        description: `Inventory ${item.status === 'sold' ? 'sold' : 'updated'}: ${item.projectName} - ${item.unitShopNumber || item.unit}`,
        date: new Date(item.updatedAt),
        contact: 'System',
        status: item.status
      });
    });
    
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [db, brokers]);

  // If inventory section is active, show inventory
  if (activeSection === 'inventory') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Navigation header */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setActiveSection('dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {db.inventory.length} items • {db.inventory.filter(i => i.status === 'available').length} available
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Section */}
        <InventorySection
          inventory={db.inventory}
          onAddInventory={handleAddInventory}
          onDeleteInventory={handleDeleteInventory}
          onImportInventory={handleImportInventory}
        />
      </div>
    );
  }
  
  // Default dashboard view
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
            <p className="text-blue-100 opacity-90">
              Here's what's happening with your projects today.
            </p>
            
            {/* Broker Stats in Welcome Section */}
            {brokerStats.totalBrokers > 0 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 inline-block mr-4">
                <span className="text-sm opacity-90">Brokers</span>
                <p className="text-xl font-bold">{brokerStats.totalBrokers} ({brokerStats.activeBrokers} active)</p>
              </div>
            )}
            
            <div className="flex items-center mt-4 space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-sm opacity-90">Active Projects</span>
                <p className="text-xl font-bold">{db.projects.filter(p => p.status === 'active').length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-sm opacity-90">Today's Revenue</span>
                <p className="text-xl font-bold">{formatCurrency(overallFinancials.totalReceived)}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-sm opacity-90">Broker Deals</span>
                <p className="text-xl font-bold">{brokerStats.brokerDeals}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-sm opacity-90">Pending Tasks</span>
                <p className="text-xl font-bold">{db.interactions.filter(i => i.status === 'pending').length}</p>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm opacity-90">Quick Stats</p>
              <p className="text-2xl font-bold">{db.customers.length}</p>
              <p className="text-sm opacity-90">Total Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className={`bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow ${stat.isDanger ? 'border-red-200' : stat.isWarning ? 'border-amber-200' : ''} ${stat.isBroker ? 'border-l-4 border-l-purple-500' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
              {stat.isBroker && (
                <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                  Broker
                </span>
              )}
              {stat.change && (
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold mb-2 ${stat.isDanger ? 'text-red-600' : stat.isWarning ? 'text-amber-600' : 'text-gray-900'}`}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-400">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activities Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleQuickAction('customer')}
              className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-xl p-4 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center mb-2">
                <div className="bg-blue-500 text-white p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  👤
                </div>
                <span className="font-semibold text-gray-900">Add Customer</span>
              </div>
              <p className="text-sm text-gray-600">Register new customer</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('brokers')}
              className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-xl p-4 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center mb-2">
                <div className="bg-purple-500 text-white p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  🤝
                </div>
                <span className="font-semibold text-gray-900">Manage Brokers</span>
              </div>
              <p className="text-sm text-gray-600">View & manage brokers</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('project')}
              className="bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 rounded-xl p-4 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center mb-2">
                <div className="bg-green-500 text-white p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  🏗
                </div>
                <span className="font-semibold text-gray-900">Add Project</span>
              </div>
              <p className="text-sm text-gray-600">Create new project</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('interaction')}
              className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-xl p-4 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center mb-2">
                <div className="bg-purple-500 text-white p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  💬
                </div>
                <span className="font-semibold text-gray-900">Log Interaction</span>
              </div>
              <p className="text-sm text-gray-600">Record customer/broker call</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('receipt')}
              className="bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border border-amber-200 rounded-xl p-4 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center mb-2">
                <div className="bg-amber-500 text-white p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  💰
                </div>
                <span className="font-semibold text-gray-900">Add Receipt</span>
              </div>
              <p className="text-sm text-gray-600">Record payment received</p>
            </button>
            
            <button 
              onClick={() => setActiveSection('inventory')}
              className="bg-gradient-to-r from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 border border-cyan-200 rounded-xl p-4 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center mb-2">
                <div className="bg-cyan-500 text-white p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  📦
                </div>
                <span className="font-semibold text-gray-900">Manage Inventory</span>
              </div>
              <p className="text-sm text-gray-600">View & manage inventory</p>
            </button>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="bg-gray-100 text-gray-600 p-2 rounded-lg mr-3">📋</span>
              Recent Activities
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-xl">{activity.icon}</span>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <span className="text-xs text-gray-500">
                        {activity.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">
                          {activity.contact}
                        </span>
                        {activity.contactType === 'broker' && (
                          <span className="ml-2 text-xs font-medium bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            Broker
                          </span>
                        )}
                      </div>
                      {activity.amount ? (
                        <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {formatCurrency(activity.amount)}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          activity.status === 'follow_up' ? 'bg-yellow-100 text-yellow-800' :
                          activity.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activity.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <p className="text-gray-500">No recent activities</p>
                <p className="text-sm text-gray-400 mt-1">Activities will appear here as they happen</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Status Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Project Status</h3>
            <span className="text-xs text-gray-500">Active/Completed</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Active Projects</span>
                <span className="font-medium">{db.projects.filter(p => p.status === 'active').length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(db.projects.filter(p => p.status === 'active').length / Math.max(db.projects.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Projects with Brokers</span>
                <span className="font-medium">{db.projects.filter(p => p.brokerId).length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${(db.projects.filter(p => p.brokerId).length / Math.max(db.projects.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Broker Commission Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Broker Commission</h3>
            <button 
              onClick={() => window.location.href = '/brokers'}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              View Brokers
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Total Commission</span>
                <span className="font-medium">{formatCurrency(brokerStats.totalCommission)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-500 h-2 rounded-full" 
                  style={{ width: `${(brokerStats.totalCommission / Math.max(overallFinancials.totalSale, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Pending Commission</span>
                <span className="font-medium">{formatCurrency(brokerStats.pendingCommission)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full" 
                  style={{ width: `${(brokerStats.pendingCommission / Math.max(brokerStats.totalCommission, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
            <span className="text-xs text-gray-500">Next 7 days</span>
          </div>
          <div className="space-y-3">
            {db.receipts
              .filter(r => {
                const dueDate = new Date(r.dueDate || r.date);
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return dueDate >= today && dueDate <= nextWeek;
              })
              .slice(0, 3)
              .map(receipt => {
                const customer = db.customers.find(c => c.id === receipt.customerId);
                const project = db.projects.find(p => p.id === receipt.projectId);
                const dueDate = new Date(receipt.dueDate || receipt.date);
                const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{project?.name || 'No project'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(receipt.amount)}</p>
                      <p className={`text-xs ${daysLeft <= 2 ? 'text-red-600' : 'text-gray-500'}`}>
                        {daysLeft <= 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            {db.receipts.filter(r => {
              const dueDate = new Date(r.dueDate || r.date);
              const today = new Date();
              const nextWeek = new Date(today);
              nextWeek.setDate(today.getDate() + 7);
              return dueDate >= today && dueDate <= nextWeek;
            }).length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No upcoming deadlines</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;