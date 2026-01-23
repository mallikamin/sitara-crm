import { getDateString } from './formatters'
import { Project, Customer, CommissionPayment } from '../types/crm'

export const calculateDaysBetween = (date1: string | Date, date2: string | Date): number => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const calculateProjectFinancials = (project: Project) => {
  if (!project) {
    return {
      totalSale: 0,
      totalReceived: 0,
      totalReceivable: 0,
      totalOverdue: 0,
      totalFuture: 0,
      percentagePaid: 0,
    }
  }

  const totalSale = Number(project.sale) || 0
  const totalReceived = Number(project.received) || 0
  const totalReceivable = Math.max(0, totalSale - totalReceived)

  let totalOverdue = 0
  let totalFuture = 0
  const today = getDateString()
  const todayDate = new Date(today)
  todayDate.setHours(0, 0, 0, 0)

  if (project.installments && project.installments.length > 0) {
    project.installments.forEach((installment) => {
      const remaining = Number(installment.amount) - (Number(installment.partialPaid) || 0)

      if (!installment.paid && remaining > 0) {
        const dueDate = new Date(installment.dueDate)
        dueDate.setHours(0, 0, 0, 0)

        if (dueDate <= todayDate) {
          totalOverdue += remaining
        } else {
          totalFuture += remaining
        }
      }
    })
  }

  return {
    totalSale,
    totalReceived,
    totalReceivable,
    totalOverdue,
    totalFuture,
    percentagePaid: totalSale > 0 ? (totalReceived / totalSale) * 100 : 0,
  }
}

/**
 * UPDATED: Calculate commission based on ACTUAL PAYMENTS, not installments
 * This fixes the flawed logic where commission was tied to installment accrual
 */
export const calculateProjectCommissions = (
  project: Project,
  commissionPayments: CommissionPayment[]
) => {
  // Broker commission
  const brokerCommissionRate = project.brokerCommissionRate || 0
  const brokerCommissionTotal = (project.sale * brokerCommissionRate) / 100
  
  const brokerPayments = commissionPayments.filter(
    cp => cp.projectId === project.id && 
          cp.recipientType === 'broker' && 
          cp.recipientId === project.brokerId
  )
  
  const brokerCommissionPaid = brokerPayments.reduce((sum, cp) => sum + cp.paidAmount, 0)
  const brokerCommissionAccrued = Math.max(0, brokerCommissionTotal - brokerCommissionPaid)
  
  // Company Rep commission
  const companyRepCommissionRate = project.companyRepCommissionRate || 0
  const companyRepCommissionTotal = (project.sale * companyRepCommissionRate) / 100
  
  const companyRepPayments = commissionPayments.filter(
    cp => cp.projectId === project.id && 
          cp.recipientType === 'companyRep' && 
          cp.recipientId === project.companyRepId
  )
  
  const companyRepCommissionPaid = companyRepPayments.reduce((sum, cp) => sum + cp.paidAmount, 0)
  const companyRepCommissionAccrued = Math.max(0, companyRepCommissionTotal - companyRepCommissionPaid)
  
  return {
    broker: {
      total: brokerCommissionTotal,
      paid: brokerCommissionPaid,
      accrued: brokerCommissionAccrued,
      percentage: brokerCommissionRate,
    },
    companyRep: {
      total: companyRepCommissionTotal,
      paid: companyRepCommissionPaid,
      accrued: companyRepCommissionAccrued,
      percentage: companyRepCommissionRate,
    },
    totalCommissionOwed: brokerCommissionTotal + companyRepCommissionTotal,
    totalCommissionPaid: brokerCommissionPaid + companyRepCommissionPaid,
    totalCommissionAccrued: brokerCommissionAccrued + companyRepCommissionAccrued,
  }
}

/**
 * Calculate financials for a specific broker across all their projects
 */
export const calculateBrokerFinancials = (
  brokerId: string, 
  projects: Project[],
  commissionPayments: CommissionPayment[]
) => {
  const brokerProjects = projects.filter(p => p.brokerId === brokerId)
  
  let totalSale = 0
  let totalCommissionOwed = 0
  let totalCommissionPaid = 0
  let totalCommissionAccrued = 0
  
  brokerProjects.forEach(project => {
    totalSale += project.sale
    
    const commissions = calculateProjectCommissions(project, commissionPayments)
    totalCommissionOwed += commissions.broker.total
    totalCommissionPaid += commissions.broker.paid
    totalCommissionAccrued += commissions.broker.accrued
  })
  
  return {
    totalProjects: brokerProjects.length,
    totalSale,
    totalCommissionOwed,
    totalCommissionPaid,
    totalCommissionAccrued,
    commissionPercentage: totalSale > 0 ? (totalCommissionPaid / totalCommissionOwed) * 100 : 0,
  }
}

/**
 * Calculate financials for a specific company rep across all their projects
 */
export const calculateCompanyRepFinancials = (
  companyRepId: string,
  projects: Project[],
  commissionPayments: CommissionPayment[]
) => {
  const companyRepProjects = projects.filter(p => p.companyRepId === companyRepId)
  
  let totalSale = 0
  let totalCommissionOwed = 0
  let totalCommissionPaid = 0
  let totalCommissionAccrued = 0
  
  companyRepProjects.forEach(project => {
    totalSale += project.sale
    
    const commissions = calculateProjectCommissions(project, commissionPayments)
    totalCommissionOwed += commissions.companyRep.total
    totalCommissionPaid += commissions.companyRep.paid
    totalCommissionAccrued += commissions.companyRep.accrued
  })
  
  return {
    totalProjects: companyRepProjects.length,
    totalSale,
    totalCommissionOwed,
    totalCommissionPaid,
    totalCommissionAccrued,
    commissionPercentage: totalSale > 0 ? (totalCommissionPaid / totalCommissionOwed) * 100 : 0,
  }
}

export const calculateCustomerFinancials = (customerId: string, projects: Project[]) => {
  const customerProjects = projects.filter((p) => p.customerId === customerId)

  let totalSale = 0
  let totalReceived = 0
  let totalReceivable = 0
  let totalOverdue = 0
  let totalFuture = 0

  customerProjects.forEach((project) => {
    const financials = calculateProjectFinancials(project)
    totalSale += financials.totalSale
    totalReceived += financials.totalReceived
    totalReceivable += financials.totalReceivable
    totalOverdue += financials.totalOverdue
    totalFuture += financials.totalFuture
  })

  return {
    totalSale,
    totalReceived,
    totalReceivable,
    totalOverdue,
    totalFuture,
    percentagePaid: totalSale > 0 ? (totalReceived / totalSale) * 100 : 0,
    totalProjects: customerProjects.length,
  }
}

export const calculateOverallFinancials = (
  projects: Project[],
  commissionPayments: CommissionPayment[] = []
) => {
  let totalSale = 0
  let totalReceived = 0
  let totalReceivable = 0
  let totalOverdue = 0
  let totalFuture = 0
  
  // NEW: Commission tracking
  let totalBrokerCommissionOwed = 0
  let totalBrokerCommissionPaid = 0
  let totalCompanyRepCommissionOwed = 0
  let totalCompanyRepCommissionPaid = 0

  projects.forEach((project) => {
    const financials = calculateProjectFinancials(project)
    totalSale += financials.totalSale
    totalReceived += financials.totalReceived
    totalReceivable += financials.totalReceivable
    totalOverdue += financials.totalOverdue
    totalFuture += financials.totalFuture
    
    // Calculate commissions
    const commissions = calculateProjectCommissions(project, commissionPayments)
    totalBrokerCommissionOwed += commissions.broker.total
    totalBrokerCommissionPaid += commissions.broker.paid
    totalCompanyRepCommissionOwed += commissions.companyRep.total
    totalCompanyRepCommissionPaid += commissions.companyRep.paid
  })

  return {
    totalSale,
    totalReceived,
    totalReceivable,
    totalOverdue,
    totalFuture,
    percentagePaid: totalSale > 0 ? (totalReceived / totalSale) * 100 : 0,
    
    // Commission metrics
    totalBrokerCommissionOwed,
    totalBrokerCommissionPaid,
    totalBrokerCommissionAccrued: totalBrokerCommissionOwed - totalBrokerCommissionPaid,
    totalCompanyRepCommissionOwed,
    totalCompanyRepCommissionPaid,
    totalCompanyRepCommissionAccrued: totalCompanyRepCommissionOwed - totalCompanyRepCommissionPaid,
    totalCommissionOwed: totalBrokerCommissionOwed + totalCompanyRepCommissionOwed,
    totalCommissionPaid: totalBrokerCommissionPaid + totalCompanyRepCommissionPaid,
    totalCommissionAccrued: (totalBrokerCommissionOwed - totalBrokerCommissionPaid) + 
                           (totalCompanyRepCommissionOwed - totalCompanyRepCommissionPaid),
  }
}

export const isOverdue = (dateStr: string): boolean => {
  try {
    if (!dateStr) return false
    const dueDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  } catch {
    return false
  }
}

/**
 * NEW: Calculate commission payment schedule suggestions
 * Based on customer payments received, suggest when to pay commissions
 */
export const suggestCommissionPaymentSchedule = (
  project: Project,
  commissionPayments: CommissionPayment[]
) => {
  const projectFinancials = calculateProjectFinancials(project)
  const commissions = calculateProjectCommissions(project, commissionPayments)
  
  // Suggest paying commission proportional to received amount
  const receivedPercentage = project.sale > 0 ? (project.received / project.sale) * 100 : 0
  
  const suggestedBrokerPayment = (commissions.broker.total * receivedPercentage) / 100 - commissions.broker.paid
  const suggestedCompanyRepPayment = (commissions.companyRep.total * receivedPercentage) / 100 - commissions.companyRep.paid
  
  return {
    receivedPercentage,
    broker: {
      total: commissions.broker.total,
      paid: commissions.broker.paid,
      suggested: Math.max(0, suggestedBrokerPayment),
      remaining: commissions.broker.accrued,
    },
    companyRep: {
      total: commissions.companyRep.total,
      paid: commissions.companyRep.paid,
      suggested: Math.max(0, suggestedCompanyRepPayment),
      remaining: commissions.companyRep.accrued,
    },
  }
}