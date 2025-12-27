import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CRMData, Customer, Project, Interaction, Receipt, Inventory, Notification } from '../types/crm'
import { INITIAL_DB } from '../constants'

interface CRMStore {
  // Data state
  db: CRMData
  loading: boolean
  currentSection: string
  
  // UI state
  notifications: Notification[]
  
  // Data actions
  setDb: (data: CRMData) => void
  setLoading: (loading: boolean) => void
  setCurrentSection: (section: string) => void
  
  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  
  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  
  // Inventory actions
  addInventory: (item: Omit<Inventory, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateInventory: (id: string, updates: Partial<Inventory>) => void
  deleteInventory: (id: string) => void
  
  // Interaction actions
  addInteraction: (interaction: Omit<Interaction, 'id' | 'createdAt'>) => void
  deleteInteraction: (id: string) => void
  
  // Receipt actions
  addReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => void
  deleteReceipt: (id: string) => void
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  
  // Utility actions
  resetData: () => void
  exportData: () => string
  importData: (data: CRMData) => void
}

export const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      // Initial state
      db: INITIAL_DB,
      loading: false,
      currentSection: 'dashboard',
      notifications: [],
      
      // Data actions
      setDb: (data) => set({ db: data }),
      setLoading: (loading) => set({ loading }),
      setCurrentSection: (section) => set({ currentSection: section }),
      
      // Customer actions
      addCustomer: (customerData) => set((state) => {
        const newCustomer: Customer = {
          ...customerData,
          id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        return {
          db: {
            ...state.db,
            customers: [...state.db.customers, newCustomer],
            lastUpdated: new Date().toISOString()
          }
        }
      }),
      
      updateCustomer: (id, updates) => set((state) => ({
        db: {
          ...state.db,
          customers: state.db.customers.map(customer => 
            customer.id === id 
              ? { ...customer, ...updates, updatedAt: new Date().toISOString() }
              : customer
          ),
          lastUpdated: new Date().toISOString()
        }
      })),
      
      deleteCustomer: (id) => set((state) => ({
        db: {
          ...state.db,
          customers: state.db.customers.filter(c => c.id !== id),
          lastUpdated: new Date().toISOString()
        }
      })),
      
      // Project actions
      addProject: (projectData) => set((state) => {
        const newProject: Project = {
          ...projectData,
          id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        return {
          db: {
            ...state.db,
            projects: [...state.db.projects, newProject],
            lastUpdated: new Date().toISOString()
          }
        }
      }),
      
      // Inventory actions
      addInventory: (itemData) => set((state) => {
        const newItem: Inventory = {
          ...itemData,
          id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        return {
          db: {
            ...state.db,
            inventory: [...state.db.inventory, newItem],
            lastUpdated: new Date().toISOString()
          }
        }
      }),
      
      // Interaction actions
      addInteraction: (interactionData) => set((state) => {
        const newInteraction: Interaction = {
          ...interactionData,
          id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        }
        
        return {
          db: {
            ...state.db,
            interactions: [...state.db.interactions, newInteraction],
            lastUpdated: new Date().toISOString()
          }
        }
      }),
      
      // Receipt actions
      addReceipt: (receiptData) => set((state) => {
        const newReceipt: Receipt = {
          ...receiptData,
          id: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        }
        
        return {
          db: {
            ...state.db,
            receipts: [...state.db.receipts, newReceipt],
            lastUpdated: new Date().toISOString()
          }
        }
      }),
      
      // Notification actions
      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: Date.now().toString()
          }
        ]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      // Utility actions
      resetData: () => set({ db: INITIAL_DB }),
      
      exportData: () => {
        return JSON.stringify(get().db, null, 2)
      },
      
      importData: (data) => {
        set({ db: data })
      }
    }),
    {
      name: 'sitara-crm-storage',
      partialize: (state) => ({ db: state.db })
    }
  )
)