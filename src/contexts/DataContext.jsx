import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_DB } from '../constants';
import { useStorage } from '../hooks/useStorage';
import { calculateProjectFinancials, calculateCustomerFinancials } from '../utils/calculations';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [db, setDb] = useState(INITIAL_DB);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('dashboard');
  const { saveData, loadData } = useStorage();

  // Load data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const loadedData = await loadData();
        if (loadedData) {
          setDb(loadedData);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [loadData]);

  // Save data when it changes
  useEffect(() => {
    const save = async () => {
      if (!loading) {
        await saveData(db);
      }
    };
    save();
  }, [db, loading, saveData]);

  // Helper functions
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setDb(prev => ({
      ...prev,
      customers: [...prev.customers, newCustomer],
      lastUpdated: new Date().toISOString()
    }));
    
    return newCustomer;
  };

  const updateCustomer = (id, updates) => {
    setDb(prev => ({
      ...prev,
      customers: prev.customers.map(customer => 
        customer.id === id 
          ? { ...customer, ...updates, updatedAt: new Date().toISOString() }
          : customer
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const deleteCustomer = (id) => {
    setDb(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== id),
      lastUpdated: new Date().toISOString()
    }));
  };

  const addProject = (project) => {
    const newProject = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setDb(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      lastUpdated: new Date().toISOString()
    }));
    
    return newProject;
  };

  const addInventoryItem = (item) => {
    const newItem = {
      ...item,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setDb(prev => ({
      ...prev,
      inventory: [...prev.inventory, newItem],
      lastUpdated: new Date().toISOString()
    }));
    
    return newItem;
  };

  // Calculate overall financials
  const calculateOverallFinancials = () => {
    let totalSale = 0;
    let totalReceived = 0;
    let totalReceivable = 0;
    let totalOverdue = 0;
    let totalFuture = 0;
    
    db.projects.forEach(project => {
      const financials = calculateProjectFinancials(project);
      totalSale += financials.totalSale;
      totalReceived += financials.totalReceived;
      totalReceivable += financials.totalReceivable;
      totalOverdue += financials.totalOverdue;
      totalFuture += financials.totalFuture;
    });
    
    return {
      totalSale,
      totalReceived,
      totalReceivable,
      totalOverdue,
      totalFuture,
      percentagePaid: totalSale > 0 ? ((totalReceived / totalSale) * 100) : 0
    };
  };

  const value = {
    db,
    loading,
    currentSection,
    setCurrentSection,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addProject,
    addInventoryItem,
    calculateOverallFinancials,
    calculateCustomerFinancials: (customerId) => calculateCustomerFinancials(customerId, db),
    calculateProjectFinancials,
    setDb
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};