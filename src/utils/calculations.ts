import { getDateString } from './formatters'
import { Project, Customer, Inventory } from '../types/crm'

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

export const calculateOverallFinancials = (projects: Project[]) => {
  let totalSale = 0
  let totalReceived = 0
  let totalReceivable = 0
  let totalOverdue = 0
  let totalFuture = 0

  projects.forEach((project) => {
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