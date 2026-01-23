import React, { useState } from 'react';
import { DataProvider, useData } from './contexts/DataContextAPI';
import { MigrationButton } from './components/MigrationButton';
import Header from './components/common/Header';
import Dashboard from './components/sections/Dashboard';
import Customers from './components/sections/Customers';
import Projects from './components/sections/Projects';
import Inventory from './components/sections/Inventory';
import Interactions from './components/sections/Interactions';
import AddInteractionModal from './components/modals/AddInteractionModal';
import Receipts from './components/crm/ReceiptsSection';
import Reports from './components/sections/Reports';
import Brokers from './components/crm/Brokers';
import BrokerDetail from './components/crm/BrokerDetail';
import AddBrokerModal from './components/crm/AddBrokerModal';
import Notification from './components/common/Notification';
import BackupManager from './components/crm/BackupManager';

// ========== NEW IMPORTS - CRM v4.0 ==========
import CompanyReps from './components/crm/CompanyReps';
import PaymentsTab from './components/crm/PaymentsTab';
import BulkUploadTransactionsModal from './components/modals/BulkUploadTransactionsModal';

import './App.css';

function AppContent() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  
  // Broker states
  const [selectedBrokerId, setSelectedBrokerId] = useState(null);
  const [showAddBroker, setShowAddBroker] = useState(false);
  
  // ========== NEW STATE - CRM v4.0 ==========
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Get functions from DataContext
  const { exportToFile, createManualBackup, customers, brokers } = useData();

  const showNotification = (type, title, message, duration = 3000) => {
    const id = Date.now();
    const newNotification = { id, type, title, message, duration };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const handleExport = () => {
    try {
      console.log('Starting export...');
      const result = exportToFile();
      
      if (result && result.success) {
        showNotification('success', 'Export Successful', `Data exported to ${result.filename}`);
        console.log('Export result:', result);
      } else {
        showNotification('error', 'Export Failed', result?.error || 'Unknown error');
        console.error('Export failed:', result?.error);
      }
    } catch (error) {
      showNotification('error', 'Export Error', error.message);
      console.error('Export error:', error);
    }
  };

  const handleImport = () => {
    showNotification('info', 'Import Data', 'Please use the Backup Manager to import data');
    setShowBackupManager(true);
  };

  const handleBackup = () => {
    // Create a backup first, then show manager
    try {
      const result = createManualBackup();
      if (result && result.success) {
        showNotification('success', 'Backup Created', 'Manual backup created successfully');
      } else {
        showNotification('warning', 'Backup Notice', result?.error || 'Opening Backup Manager');
      }
    } catch (error) {
      showNotification('error', 'Backup Error', error.message);
    }
    
    // Always show the backup manager
    setTimeout(() => {
      setShowBackupManager(true);
    }, 500);
  };

  // Handle section change - reset broker selection when leaving brokers section
  const handleSectionChange = (section) => {
    if (section !== 'brokers') {
      setSelectedBrokerId(null);
    }
    setCurrentSection(section);
  };

  // Handle broker selection
  const handleSelectBroker = (brokerId) => {
    // Ensure we only store the ID string, not the whole broker object
    const id = typeof brokerId === 'object' ? brokerId?.id : brokerId;
    setSelectedBrokerId(id);
  };

  // Handle back from broker detail
  const handleBackFromBroker = () => {
    setSelectedBrokerId(null);
  };

  // Handle add broker success
  const handleAddBrokerSuccess = (broker) => {
    showNotification('success', 'Broker Added', `${broker.name} has been added successfully`);
    setShowAddBroker(false);
  };

  // ========== NEW HANDLER - Bulk Upload Success ==========
  const handleBulkUploadSuccess = (result) => {
    showNotification('success', 'Bulk Upload Complete', `${result.imported} transactions imported successfully`);
    setShowBulkUpload(false);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard />;
      
      case 'customers':
        return <Customers />;
      
      case 'brokers':
        // Show broker detail if a broker is selected, otherwise show list
        if (selectedBrokerId) {
          return (
            <BrokerDetail 
              brokerId={selectedBrokerId}
              onBack={handleBackFromBroker}
            />
          );
        }
        return (
          <Brokers 
            onSelectBroker={handleSelectBroker}
            onAddBroker={() => setShowAddBroker(true)}
          />
        );
      
      // ========== NEW SECTION - Company Reps ==========
      case 'companyReps':
        return <CompanyReps />;
      
      case 'projects':
        return (
          <Projects 
            onBulkUpload={() => setShowBulkUpload(true)}
          />
        );
      
      case 'inventory':
        return <Inventory />;
      
      case 'interactions':
        return (
          <Interactions 
            onAddInteraction={() => setShowAddInteraction(true)} 
          />
        );
      
      case 'receipts':
        return <Receipts />;
      
      // ========== NEW SECTION - Payments ==========
      case 'payments':
        return <PaymentsTab />;
      
      case 'reports':
        return <Reports />;
      
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <MigrationButton />
      <Header
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        onExport={handleExport}
        onImport={handleImport}
        onBackup={handleBackup}
      />
      
      <main className="container">
        {renderSection()}
      </main>
      
      {/* Add Interaction Modal */}
      <AddInteractionModal 
        isOpen={showAddInteraction} 
        onClose={() => setShowAddInteraction(false)} 
      />
      
      {/* Add Broker Modal */}
      <AddBrokerModal
        isOpen={showAddBroker}
        onClose={() => setShowAddBroker(false)}
        onSuccess={handleAddBrokerSuccess}
      />
      
      {/* ========== NEW MODAL - Bulk Upload Transactions ========== */}
      <BulkUploadTransactionsModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={handleBulkUploadSuccess}
        customers={customers || []}
        brokers={brokers || []}
      />
      
      {/* Backup Manager Modal */}
      {showBackupManager && (
        <BackupManager 
          onClose={() => setShowBackupManager(false)} 
        />
      )}
      
      {/* Notification Container */}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            {...notification}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;