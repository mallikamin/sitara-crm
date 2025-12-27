export interface Customer {
  id: string
  name: string
  cnic: string
  phone: string
  email?: string
  company?: string
  address?: string
  type: 'customer' | 'broker' | 'both'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface Installment {
  id: string
  number: number
  amount: number
  dueDate: string
  paid: boolean
  partialPaid: number
  paidOn?: string
  receiptId?: string
}

export interface Project {
  id: string
  customerId: string
  brokerId?: string
  name: string
  unit: string
  marlas: number
  rate: number
  sale: number
  received: number
  status: 'active' | 'completed' | 'cancelled'
  cycle: 'monthly' | 'quarterly' | 'bi_annual' | 'annual' | 'custom'
  notes?: string
  installments: Installment[]
  createdAt: string
  updatedAt: string
}

export interface Interaction {
  id: string
  contactType: 'customer' | 'broker'
  customerId?: string
  brokerId?: string
  type: 'call' | 'whatsapp' | 'sms' | 'email' | 'meeting' | 'site_visit' | 'update'
  status: 'follow_up' | 'no_follow_up' | 'do_not_contact' | 'resolved' | 'pending'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  date: string
  notes?: string
  nextFollowUp?: string
  createdAt: string
}

export interface Receipt {
  id: string
  customerId: string
  projectId: string
  installmentId?: string
  amount: number
  date: string
  method: 'cash' | 'bank_transfer' | 'cheque' | 'online'
  reference?: string
  notes?: string
  createdAt: string
}

export interface Inventory {
  id: string
  projectName: string
  block?: string
  unit: string
  unitType: 'shop' | 'office' | 'apartment' | 'plot' | 'warehouse' | 'showroom'
  marlas: number
  rate: number
  saleValue: number
  plotFeature?: string
  otherFeature?: string
  status: 'available' | 'sold' | 'reserved' | 'blocked'
  customerId?: string
  projectId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MasterProject {
  id: string
  name: string
  description?: string
  location?: string
  totalUnits: number
  availableUnits: number
  soldUnits: number
  createdAt: string
  updatedAt: string
}

export interface Settings {
  currency: string
  defaultCycle: string
  followUpDays: number[]
  commissionRate: number
}

export interface CRMData {
  version: string
  customers: Customer[]
  projects: Project[]
  interactions: Interaction[]
  receipts: Receipt[]
  inventory: Inventory[]
  masterProjects: MasterProject[]
  settings: Settings
  lastUpdated: string | null
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

export interface PaginationState {
  currentPage: number
  totalPages: number
  itemsPerPage: number
}