export interface Customer {
  id: string
  name: string
  cnic: string
  phone: string
  email?: string
  company?: string
  address?: string
  type: 'customer' | 'both'
  status: 'active' | 'inactive'
  linkedBrokerId?: string
  createdAt: string
  updatedAt: string
}

export interface Broker {
  id: string
  name: string
  phone: string
  cnic: string
  email?: string
  address?: string
  company?: string
  commissionRate?: number  // Default 1% per broker
  bankDetails?: string
  notes?: string
  status: 'active' | 'inactive'
  linkedCustomerId?: string
  createdAt: string
  updatedAt: string
}

// NEW: Payment tracking for commissions
export interface CommissionPayment {
  id: string
  projectId: string
  recipientId: string  // brokerId or companyRepId
  recipientType: 'broker' | 'companyRep'
  recipientName: string
  amount: number
  paidAmount: number  // Actual amount paid
  remainingAmount: number  // Amount still owed
  paymentDate?: string  // When payment was made
  paymentMethod?: 'cash' | 'bank_transfer' | 'cheque' | 'online'
  paymentReference?: string
  notes?: string
  status: 'pending' | 'partial' | 'paid'
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
  brokerCommissionRate?: number  // Flexible commission rate (default 1%)
  
  // NEW: Company Rep fields
  companyRepId?: string  // Optional company representative
  companyRepCommissionRate?: number  // Flexible commission rate (default 1%)
  
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
  
  // Computed fields (optional - for component compatibility)
  balance?: number
  overdue?: number
  
  // NEW: Commission tracking (computed from payments)
  brokerCommissionTotal?: number  // Total commission owed to broker
  brokerCommissionPaid?: number   // Total commission paid to broker
  brokerCommissionAccrued?: number  // Unpaid commission
  
  companyRepCommissionTotal?: number
  companyRepCommissionPaid?: number
  companyRepCommissionAccrued?: number
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
  contacts?: Array<{
    id: string
    type: 'customer' | 'broker'
    name?: string
  }>	
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
  receiptNumber?: string
  customerName?: string
  projectName?: string
  updatedAt?: string
}

export interface InventoryItem {
  id: string
  projectName: string
  block: string
  unitShopNumber: string
  unit?: string
  unitType: 'Residential' | 'Commercial' | 'Apartment' | 'Other' | string
  marlas?: number
  ratePerMarla?: number
  totalValue: number
  saleValue: number
  plotFeatures?: string[]
  plotFeature?: string
  status: 'available' | 'reserved' | 'blocked' | 'sold'
  transactionId?: string	
  createdAt: string
  updatedAt: string
}

export const mapExcelToInventory = (excelData: any): Partial<InventoryItem> => {
  return {
    projectName: excelData['Project Name'],
    block: excelData['Block'],
    unitShopNumber: excelData['Unit/Shop#'],
    unit: excelData['Unit/Shop#'],
    unitType: excelData['Unit Type'],
    marlas: excelData['Marlas'] ? parseFloat(excelData['Marlas']) : undefined,
    ratePerMarla: excelData['Rate per Marla'] ? parseFloat(excelData['Rate per Marla']) : undefined,
    totalValue: excelData['Total Value'] ? parseFloat(excelData['Total Value']) : undefined,
    saleValue: excelData['Total Value'] ? parseFloat(excelData['Total Value']) : undefined,
    plotFeatures: excelData['Plot Features'] ? 
      excelData['Plot Features'].split(/[,;]/).map((f: string) => f.trim()) : [],
    plotFeature: excelData['Plot Features'] ? excelData['Plot Features'].split(',')[0] : undefined,
    status: 'available'
  }
}

// NEW: Enhanced Master Project with transaction aggregation
export interface MasterProject {
  id: string
  name: string
  description?: string
  location?: string
  totalUnits: number
  availableUnits: number
  soldUnits: number
  reservedUnits: number
  blockedUnits: number
  
  // Financial Summary
  totalSaleValue: number
  totalReceived: number
  totalReceivable: number
  totalOverdue: number
  
  // Commission Summary
  totalBrokerCommission: number
  totalBrokerCommissionPaid: number
  totalCompanyRepCommission: number
  totalCompanyRepCommissionPaid: number
  
  createdAt: string
  updatedAt: string
}

export interface Settings {
  currency: string
  defaultCycle: string
  followUpDays: number[]
  commissionRate: number  // Default 1% (changed from 2.5%)
  defaultBrokerCommission: number  // NEW: 1%
  defaultCompanyRepCommission: number  // NEW: 1%
}

export interface CRMData {
  version: string
  customers: Customer[]
  projects: Project[]
  brokers: Broker[]
  interactions: Interaction[]
  receipts: Receipt[]
  inventory: InventoryItem[]
  masterProjects: MasterProject[]
  commissionPayments: CommissionPayment[]  // NEW: Track all commission payments
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

export interface ExcelInventoryItem {
  'Project Name': string
  'Block': string
  'Unit/Shop#': string
  'Unit Type': string
  'Marlas'?: string
  'Rate per Marla'?: string
  'Total Value': string
  'Plot Features': string
}

// NEW: Excel template for bulk transaction uploads
export interface ExcelTransactionItem {
  'Customer Name': string
  'Customer Phone': string
  'Customer CNIC': string
  'Project Name': string
  'Unit': string
  'Marlas': number
  'Rate per Marla': number
  'Sale Value': number
  'Received Amount': number
  'Broker Name'?: string
  'Broker Commission %'?: number
  'Company Rep Name'?: string
  'Company Rep Commission %'?: number
  'Payment Cycle': 'monthly' | 'quarterly' | 'bi_annual' | 'annual'
  'Number of Installments': number
  'First Due Date': string
  'Status': 'active' | 'completed' | 'cancelled'
  'Notes'?: string
}

// NEW: Excel template for bulk broker uploads
export interface ExcelBrokerItem {
  'Name': string
  'Phone': string
  'CNIC': string
  'Email'?: string
  'Address'?: string
  'Company'?: string
  'Commission Rate %': number  // Default should be 1%
  'Bank Details'?: string
  'Status': 'active' | 'inactive'
  'Notes'?: string
}

export interface FinancialMetrics {
  totalSaleValue: number
  totalReceived: number
  totalReceivable: number
  totalOverdue: number
  futureReceivable: number
  percentagePaid: number
  averageRecoveryDays: number
  collectionEfficiency: number
  
  // NEW: Commission metrics
  totalBrokerCommissionOwed: number
  totalBrokerCommissionPaid: number
  totalBrokerCommissionAccrued: number
  totalCompanyRepCommissionOwed: number
  totalCompanyRepCommissionPaid: number
  totalCompanyRepCommissionAccrued: number
}

export interface AgingAnalysis {
  current: number
  days30: number
  days60: number
  days90: number
  days120: number
  over120: number
}

export interface CustomerReportData {
  customer: Customer
  projects: Array<{
    project: Project
    financials: any
    installments: Installment[]
  }>
  interactions: Interaction[]
  receipts: Receipt[]
  summary: {
    totalInvested: number
    totalRecovered: number
    outstandingBalance: number
    averagePaymentDelay: number
    riskScore: number
  }
}

export interface ReportConfig {
  type: 'customer' | 'project' | 'broker' | 'consolidated' | 'aging' | 'financial' | 'commission'  // NEW: commission reports
  dateRange: {
    start: Date
    end: Date
  }
  filters: {
    status?: string[]
    projectType?: string[]
    paymentStatus?: string[]
    brokerIds?: string[]  // NEW
    companyRepIds?: string[]  // NEW
  }
  includeDetails: boolean
  format: 'pdf' | 'excel' | 'json'
}

export interface EnrichedReceipt extends Receipt {
  customer?: Customer
  project?: Project
  daysSinceLastPayment?: number | null
  previousPaymentDate?: string
  previousPaymentAmount?: number
  runningTotal?: number
  paymentNumber?: number
  totalPayments?: number
}

// Helper functions
export const generateReceiptNumber = (): string => {
  const year = new Date().getFullYear()
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `RCP-${year}${month}-${random}`
}

export const getProjectDisplayName = (project: Project): string => {
  return `${project.name} - ${project.unit}`
}

export const calculateProjectBalance = (project: Project): number => {
  return project.sale - project.received
}

export const calculateProjectOverdue = (project: Project): number => {
  const today = new Date()
  return project.installments
    .filter(inst => !inst.paid && new Date(inst.dueDate) < today)
    .reduce((sum, inst) => sum + (inst.amount - inst.partialPaid), 0)
}

// NEW: Commission calculation helpers (payment-based, not installment-based)
export const calculateBrokerCommission = (
  project: Project, 
  commissionPayments: CommissionPayment[]
): { total: number; paid: number; accrued: number } => {
  const commissionRate = project.brokerCommissionRate || 1 // Default 1%
  const total = (project.sale * commissionRate) / 100
  
  // Sum all paid amounts from commission payments
  const paid = commissionPayments
    .filter(cp => cp.projectId === project.id && cp.recipientType === 'broker' && cp.recipientId === project.brokerId)
    .reduce((sum, cp) => sum + cp.paidAmount, 0)
  
  const accrued = Math.max(0, total - paid)
  
  return { total, paid, accrued }
}

export const calculateCompanyRepCommission = (
  project: Project,
  commissionPayments: CommissionPayment[]
): { total: number; paid: number; accrued: number } => {
  const commissionRate = project.companyRepCommissionRate || 1 // Default 1%
  const total = (project.sale * commissionRate) / 100
  
  const paid = commissionPayments
    .filter(cp => cp.projectId === project.id && cp.recipientType === 'companyRep' && cp.recipientId === project.companyRepId)
    .reduce((sum, cp) => sum + cp.paidAmount, 0)
  
  const accrued = Math.max(0, total - paid)
  
  return { total, paid, accrued }
}

// NEW: Calculate total commission owed/paid across all projects
export const calculateAllCommissions = (
  projects: Project[],
  commissionPayments: CommissionPayment[]
): {
  brokerTotal: number
  brokerPaid: number
  brokerAccrued: number
  companyRepTotal: number
  companyRepPaid: number
  companyRepAccrued: number
} => {
  let brokerTotal = 0
  let brokerPaid = 0
  let companyRepTotal = 0
  let companyRepPaid = 0
  
  projects.forEach(project => {
    if (project.brokerId) {
      const broker = calculateBrokerCommission(project, commissionPayments)
      brokerTotal += broker.total
      brokerPaid += broker.paid
    }
    
    if (project.companyRepId) {
      const companyRep = calculateCompanyRepCommission(project, commissionPayments)
      companyRepTotal += companyRep.total
      companyRepPaid += companyRep.paid
    }
  })
  
  return {
    brokerTotal,
    brokerPaid,
    brokerAccrued: brokerTotal - brokerPaid,
    companyRepTotal,
    companyRepPaid,
    companyRepAccrued: companyRepTotal - companyRepPaid
  }
}