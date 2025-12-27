import React, { useState } from 'react';
import { DataProvider } from './contexts/DataContext';
import Header from './components/common/Header';
import Dashboard from './components/sections/Dashboard';
import Customers from './components/sections/Customers';
import Projects from './components/sections/Projects';
import Inventory from './components/sections/Inventory';
import Interactions from './components/sections/Interactions';
import Receipts from "./components/crm/ReceiptsSection";
import Reports from './components/sections/Reports';
import Notification from './components/common/Notification';
import './App.css';

function AppContent() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);

  const showNotification = (type, title, message, duration = 3000) => {
    const id = Date.now();
    const newNotification = { id, type, title, message, duration };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const handleExport = () => {
    showNotification('info', 'Export', 'Export feature coming soon');
  };

  const handleImport = () => {
    showNotification('info', 'Import', 'Import feature coming soon');
  };

  const handleBackup = () => {
    showNotification('info', 'Backup', 'Backup feature coming soon');
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'projects':
        return <Projects />;
      case 'inventory':
        return <Inventory />;
      case 'interactions':
        return <Interactions />;
      case 'receipts':
        return <Receipts />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Header
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        onExport={handleExport}
        onImport={handleImport}
        onBackup={handleBackup}
      />
      
      <main className="container">
        {renderSection()}
      </main>
      
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