/**
 * CRM Store - DEPRECATED
 * 
 * This file has been replaced by DataContext.jsx for v4.0
 * 
 * DataContext now handles:
 * - All CRUD operations
 * - localStorage persistence
 * - Backup/restore
 * - Company reps & commission payments
 * - Migration from old formats
 * 
 * This stub file exists only for backward compatibility.
 * All functionality is provided by DataContext.
 * 
 * DO NOT USE THIS STORE DIRECTLY - use useData() from DataContext instead.
 */

import { useData } from '../contexts/DataContext';

// ========== COMPATIBILITY LAYER ==========
// These hooks redirect to DataContext to prevent breaking existing imports

/**
 * @deprecated Use useData() from DataContext instead
 */
export const useCRMStore = (selector) => {
  const data = useData();
  
  // Create a state-like object for compatibility
  const state = {
    version: '4.0',
    customers: data.customers || [],
    projects: data.projects || [],
    brokers: data.brokers || [],
    receipts: data.receipts || [],
    interactions: data.interactions || [],
    inventory: data.inventory || [],
    masterProjects: data.masterProjects || [],
    companyReps: data.companyReps || [],
    commissionPayments: data.commissionPayments || [],
    settings: data.settings || {},
    lastUpdated: data.lastSaved,
    isLoading: data.loading,
    error: null,
    
    // Actions - map to DataContext functions
    addCustomer: data.addCustomer,
    updateCustomer: data.updateCustomer,
    deleteCustomer: data.deleteCustomer,
    addProject: data.addProject,
    updateProject: data.updateProject,
    deleteProject: data.deleteProject,
    addReceipt: data.addReceipt,
    updateReceipt: data.updateReceipt,
    deleteReceipt: data.deleteReceipt,
    addInteraction: data.addInteraction,
    updateInteraction: data.updateInteraction,
    deleteInteraction: data.deleteInteraction,
    addInventoryItem: data.addInventoryItem,
    updateInventory: data.updateInventory,
    deleteInventory: data.deleteInventory,
    
    // Broker actions
    addBroker: data.addBroker,
    updateBroker: data.updateBroker,
    deleteBroker: data.deleteBroker,
    
    // Company rep actions
    addCompanyRep: data.addCompanyRep,
    updateCompanyRep: data.updateCompanyRep,
    deleteCompanyRep: data.deleteCompanyRep,
  };
  
  // If a selector is provided, use it
  if (typeof selector === 'function') {
    return selector(state);
  }
  
  return state;
};

// ========== SELECTOR HOOKS (for backward compatibility) ==========

/** @deprecated Use useData().customers instead */
export const useCustomers = () => {
  const { customers } = useData();
  return customers || [];
};

/** @deprecated Use useData().projects instead */
export const useProjects = () => {
  const { projects } = useData();
  return projects || [];
};

/** @deprecated Use useData().brokers instead */
export const useBrokers = () => {
  const { brokers } = useData();
  return brokers || [];
};

/** @deprecated Use useData().receipts instead */
export const useReceipts = () => {
  const { receipts } = useData();
  return receipts || [];
};

/** @deprecated Use useData().interactions instead */
export const useInteractions = () => {
  const { interactions } = useData();
  return interactions || [];
};

/** @deprecated Use useData().inventory instead */
export const useInventory = () => {
  const { inventory } = useData();
  return inventory || [];
};

/** @deprecated Use useData().settings instead */
export const useSettings = () => {
  const { settings } = useData();
  return settings || {};
};

/** @deprecated Use useData().companyReps instead */
export const useCompanyReps = () => {
  const { companyReps } = useData();
  return companyReps || [];
};

// ========== HELPER HOOKS ==========

export const useCustomerProjects = (customerId) => {
  const { projects } = useData();
  return (projects || []).filter(p => p.customerId === customerId);
};

export const useProjectReceipts = (projectId) => {
  const { receipts } = useData();
  return (receipts || []).filter(r => r.projectId === projectId);
};

export const useBrokerDeals = (brokerId) => {
  const { projects } = useData();
  return (projects || []).filter(p => p.brokerId === brokerId);
};

// Default export for compatibility
export default useCRMStore;

// Log deprecation notice in development
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ useCRMStore is deprecated. Please use useData() from DataContext instead.\n' +
    'Import: import { useData } from "./contexts/DataContext"'
  );
}