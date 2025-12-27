import { useState, useCallback } from 'react';
import { Customer, Project, InventoryItem, Interaction, Receipt } from '@/types/crm';

// Demo data
const demoCustomers: Customer[] = [
  {
    id: 'C001',
    name: 'Ahmed Khan',
    phone: '+92 300 1234567',
    email: 'ahmed@example.com',
    cnic: '35201-1234567-1',
    address: 'Lahore, Pakistan',
    type: 'customer',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    projects: ['P001'],
  },
  {
    id: 'C002',
    name: 'Fatima Ali',
    phone: '+92 321 9876543',
    email: 'fatima@example.com',
    cnic: '35202-7654321-2',
    address: 'Karachi, Pakistan',
    type: 'broker',
    status: 'active',
    createdAt: new Date('2024-02-20'),
    projects: [],
  },
  {
    id: 'C003',
    name: 'Muhammad Raza',
    phone: '+92 333 5551234',
    cnic: '35203-5551234-3',
    type: 'customer',
    status: 'active',
    createdAt: new Date('2024-03-10'),
    projects: ['P002'],
  },
];

const demoProjects: Project[] = [
  {
    id: 'P001',
    customerId: 'C001',
    customerName: 'Ahmed Khan',
    brokerId: 'C002',
    brokerName: 'Fatima Ali',
    projectName: 'Sitara Square',
    unit: 'Shop-101',
    block: 'Block A',
    marlas: 5.25,
    ratePerMarla: 500000,
    saleValue: 2625000,
    received: 1500000,
    balance: 1125000,
    overdue: 250000,
    status: 'active',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'P002',
    customerId: 'C003',
    customerName: 'Muhammad Raza',
    projectName: 'Sitara Heights',
    unit: 'Apt-502',
    block: 'Tower 1',
    marlas: 8.5,
    ratePerMarla: 350000,
    saleValue: 2975000,
    received: 2000000,
    balance: 975000,
    overdue: 0,
    status: 'active',
    createdAt: new Date('2024-03-15'),
  },
];

const demoInventory: InventoryItem[] = [
  {
    id: 'INV001',
    projectName: 'Sitara Square',
    block: 'Block A',
    unit: 'Shop-102',
    unitType: 'shop',
    marlas: 4.5,
    ratePerMarla: 520000,
    saleValue: 2340000,
    status: 'available',
    plotFeature: 'Corner',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'INV002',
    projectName: 'Sitara Heights',
    block: 'Tower 1',
    unit: 'Apt-301',
    unitType: 'apartment',
    marlas: 7.0,
    ratePerMarla: 380000,
    saleValue: 2660000,
    status: 'reserved',
    plotFeature: 'Park Facing',
    createdAt: new Date('2024-01-05'),
  },
  {
    id: 'INV003',
    projectName: 'Sitara Square',
    block: 'Block B',
    unit: 'Office-201',
    unitType: 'office',
    marlas: 6.0,
    ratePerMarla: 450000,
    saleValue: 2700000,
    status: 'available',
    plotFeature: 'Main Road',
    createdAt: new Date('2024-01-10'),
  },
];

const demoInteractions: Interaction[] = [
  {
    id: 'INT001',
    customerId: 'C001',
    customerName: 'Ahmed Khan',
    type: 'call',
    status: 'follow_up',
    priority: 'high',
    notes: 'Discussed payment schedule. Customer needs flexibility.',
    followUpDate: new Date('2024-12-28'),
    createdAt: new Date('2024-12-20'),
  },
  {
    id: 'INT002',
    customerId: 'C003',
    customerName: 'Muhammad Raza',
    type: 'site_visit',
    status: 'resolved',
    priority: 'medium',
    notes: 'Customer visited site and approved construction progress.',
    createdAt: new Date('2024-12-18'),
  },
];

const demoReceipts: Receipt[] = [
  {
    id: 'R001',
    receiptNumber: 'RCP-2024-001',
    customerId: 'C001',
    customerName: 'Ahmed Khan',
    projectId: 'P001',
    projectName: 'Sitara Square - Shop-101',
    amount: 500000,
    method: 'bank_transfer',
    reference: 'TXN123456',
    date: new Date('2024-12-15'),
    createdAt: new Date('2024-12-15'),
  },
  {
    id: 'R002',
    receiptNumber: 'RCP-2024-002',
    customerId: 'C003',
    customerName: 'Muhammad Raza',
    projectId: 'P002',
    projectName: 'Sitara Heights - Apt-502',
    amount: 750000,
    method: 'cheque',
    reference: 'CHQ-789012',
    date: new Date('2024-12-20'),
    createdAt: new Date('2024-12-20'),
  },
];

export function useCRMStore() {
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers);
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [inventory, setInventory] = useState<InventoryItem[]>(demoInventory);
  const [interactions, setInteractions] = useState<Interaction[]>(demoInteractions);
  const [receipts, setReceipts] = useState<Receipt[]>(demoReceipts);

  const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'createdAt' | 'projects'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `C${String(customers.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
      projects: [],
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, [customers.length]);

  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: `P${String(projects.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, [projects.length]);

  const addInventoryItem = useCallback((item: Omit<InventoryItem, 'id' | 'createdAt'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `INV${String(inventory.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
    };
    setInventory(prev => [...prev, newItem]);
    return newItem;
  }, [inventory.length]);

  const addInteraction = useCallback((interaction: Omit<Interaction, 'id' | 'createdAt'>) => {
    const newInteraction: Interaction = {
      ...interaction,
      id: `INT${String(interactions.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
    };
    setInteractions(prev => [...prev, newInteraction]);
    return newInteraction;
  }, [interactions.length]);

  const addReceipt = useCallback((receipt: Omit<Receipt, 'id' | 'createdAt'>) => {
    const newReceipt: Receipt = {
      ...receipt,
      id: `R${String(receipts.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
    };
    setReceipts(prev => [...prev, newReceipt]);
    return newReceipt;
  }, [receipts.length]);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const deleteInventoryItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  }, []);

  const deleteInteraction = useCallback((id: string) => {
    setInteractions(prev => prev.filter(i => i.id !== id));
  }, []);

  const deleteReceipt = useCallback((id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  }, []);

  // Stats calculations
  const stats = {
    totalCustomers: customers.length,
    totalBrokers: customers.filter(c => c.type === 'broker' || c.type === 'both').length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalSaleValue: projects.reduce((sum, p) => sum + p.saleValue, 0),
    totalReceived: projects.reduce((sum, p) => sum + p.received, 0),
    totalReceivable: projects.reduce((sum, p) => sum + p.balance, 0),
    totalOverdue: projects.reduce((sum, p) => sum + p.overdue, 0),
    futureReceivable: projects.reduce((sum, p) => sum + (p.balance - p.overdue), 0),
    availableInventory: inventory.filter(i => i.status === 'available').length,
    pendingFollowUps: interactions.filter(i => i.status === 'follow_up').length,
  };

  return {
    customers,
    projects,
    inventory,
    interactions,
    receipts,
    stats,
    addCustomer,
    addProject,
    addInventoryItem,
    addInteraction,
    addReceipt,
    deleteCustomer,
    deleteProject,
    deleteInventoryItem,
    deleteInteraction,
    deleteReceipt,
  };
}
