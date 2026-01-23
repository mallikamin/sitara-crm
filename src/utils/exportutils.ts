import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { CRMData, Project, Customer, Broker, CommissionPayment } from '../types/crm'
import { formatCurrency, formatDate } from './formatters'
import { calculateProjectFinancials, calculateOverallFinancials, calculateProjectCommissions } from './calculations'

export const exportTableToExcel = (tableId: string, fileName: string) => {
  try {
    const table = document.getElementById(tableId)
    if (!table) throw new Error('Table not found')

    const ws = XLSX.utils.table_to_sheet(table)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)

    return { success: true }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, error }
  }
}

export const exportAllData = (data: CRMData): { success: boolean; error?: string } => {
  try {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = `sitara_crm_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, error: String(error) }
  }
}

// UPDATED: Include commission data in financial summary
export const exportFinancialSummary = (
  projects: Project[], 
  customers: Customer[], 
  brokers: Broker[], 
  commissionPayments: CommissionPayment[]
) => {
  try {
    const financials = calculateOverallFinancials(projects, commissionPayments)

    const data = [
      ['SITARA BUILDERS CRM - FINANCIAL SUMMARY', ''],
      ['Generated on', new Date().toLocaleDateString()],
      [''],
      ['Financial Overview', 'Amount (PKR)'],
      ['Total Sale Value', financials.totalSale],
      ['Total Received', financials.totalReceived],
      ['Total Receivable', financials.totalReceivable],
      ['Total Overdue', financials.totalOverdue],
      ['Future Receivable', financials.totalFuture],
      ['Percentage Paid', `${financials.percentagePaid.toFixed(1)}%`],
      [''],
      ['Commission Overview', 'Amount (PKR)'],
      ['Total Broker Commission Owed', financials.totalBrokerCommissionOwed || 0],
      ['Total Broker Commission Paid', financials.totalBrokerCommissionPaid || 0],
      ['Total Broker Commission Accrued', financials.totalBrokerCommissionAccrued || 0],
      ['Total Company Rep Commission Owed', financials.totalCompanyRepCommissionOwed || 0],
      ['Total Company Rep Commission Paid', financials.totalCompanyRepCommissionPaid || 0],
      ['Total Company Rep Commission Accrued', financials.totalCompanyRepCommissionAccrued || 0],
      ['Total Commission Owed', financials.totalCommissionOwed || 0],
      ['Total Commission Paid', financials.totalCommissionPaid || 0],
      ['Total Commission Accrued', financials.totalCommissionAccrued || 0],
      [''],
      ['Summary Statistics', 'Count'],
      ['Total Customers', customers.length],
      ['Total Projects', projects.length],
      ['Total Brokers', brokers.length],
      ['Total Commission Payments', commissionPayments.length],
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Summary')
    XLSX.writeFile(wb, `financial_summary_${new Date().toISOString().slice(0, 10)}.xlsx`)

    return { success: true }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, error }
  }
}

// UPDATED: Include company rep in customer report
export const generateCustomerReportPDF = (
  customer: Customer, 
  projects: Project[], 
  brokers: Broker[],
  commissionPayments: CommissionPayment[]
) => {
  try {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.setTextColor(30, 58, 138)
    doc.text('SITARA BUILDERS CRM', 20, 20)
    doc.setFontSize(14)
    doc.text('CUSTOMER REPORT', 20, 30)

    // Customer Info
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40)
    doc.text(`Customer: ${customer.name}`, 150, 40)

    let yPos = 55

    // Customer Details
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.text('CUSTOMER INFORMATION', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    const customerInfo = [
      ['Name:', customer.name],
      ['Phone:', customer.phone],
      ['Email:', customer.email || 'N/A'],
      ['CNIC:', customer.cnic || 'N/A'],
      ['Type:', customer.type.toUpperCase()],
      ['Status:', customer.status.toUpperCase()],
    ]

    customerInfo.forEach(([label, value]) => {
      doc.text(label, 25, yPos)
      doc.text(value, 80, yPos)
      yPos += 7
    })

    yPos += 5

    // Projects with commission data
    const customerProjects = projects.filter(p => p.customerId === customer.id)
    if (customerProjects.length > 0) {
      doc.setFontSize(12)
      doc.text('PROJECTS', 20, yPos)
      yPos += 10

      const tableData = customerProjects.map(project => {
        const financials = calculateProjectFinancials(project)
        const commissions = calculateProjectCommissions(project, commissionPayments)
        const broker = project.brokerId ? brokers.find(b => b.id === project.brokerId) : null
        const companyRep = project.companyRepId ? brokers.find(b => b.id === project.companyRepId) : null
        
        return [
          project.name,
          project.unit,
          formatCurrency(financials.totalSale),
          formatCurrency(financials.totalReceived),
          formatCurrency(financials.totalReceivable),
          broker?.name || 'N/A',
          companyRep?.name || 'N/A',
          project.status.toUpperCase(),
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Project', 'Unit', 'Sale Value', 'Received', 'Balance', 'Broker', 'Company Rep', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      })
    }

    doc.save(`customer_report_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)

    return { success: true }
  } catch (error) {
    console.error('PDF generation failed:', error)
    return { success: false, error }
  }
}

// NEW: Export projects with full commission breakdown
export const exportProjectsWithCommission = (
  projects: Project[],
  customers: Customer[],
  brokers: Broker[],
  commissionPayments: CommissionPayment[]
) => {
  try {
    const data = [
      ['SITARA BUILDERS CRM - PROJECTS WITH COMMISSION', ''],
      ['Generated on', new Date().toLocaleDateString()],
      [''],
      [
        'Project', 'Unit', 'Customer', 'Customer CNIC', 'Marlas', 'Rate/Marla', 
        'Sale Value', 'Received', 'Balance',
        'Broker', 'Broker Commission %', 'Broker Owed', 'Broker Paid', 'Broker Pending',
        'Company Rep', 'Company Rep Commission %', 'Company Rep Owed', 'Company Rep Paid', 'Company Rep Pending',
        'Status', 'Payment Cycle', 'Created'
      ]
    ]

    projects.forEach(project => {
      const customer = customers.find(c => c.id === project.customerId)
      const broker = project.brokerId ? brokers.find(b => b.id === project.brokerId) : null
      const companyRep = project.companyRepId ? brokers.find(b => b.id === project.companyRepId) : null
      
      const commissions = calculateProjectCommissions(project, commissionPayments)
      
      data.push([
        project.name,
        project.unit,
        customer?.name || 'N/A',
        customer?.cnic || 'N/A',
        project.marlas || 0,
        project.rate || 0,
        project.sale,
        project.received,
        project.sale - project.received,
        broker?.name || 'N/A',
        project.brokerCommissionRate || 0,
        commissions.broker.total,
        commissions.broker.paid,
        commissions.broker.accrued,
        companyRep?.name || 'N/A',
        project.companyRepCommissionRate || 0,
        commissions.companyRep.total,
        commissions.companyRep.paid,
        commissions.companyRep.accrued,
        project.status,
        project.cycle,
        formatDate(project.createdAt),
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Projects')
    XLSX.writeFile(wb, `projects_with_commission_${new Date().toISOString().slice(0, 10)}.xlsx`)

    return { success: true }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, error }
  }
}

// NEW: Export commission payments
export const exportCommissionPayments = (
  commissionPayments: CommissionPayment[],
  projects: Project[],
  brokers: Broker[]
) => {
  try {
    const data = [
      ['SITARA BUILDERS CRM - COMMISSION PAYMENTS', ''],
      ['Generated on', new Date().toLocaleDateString()],
      [''],
      [
        'Payment ID', 'Project', 'Recipient', 'Type', 'Total Owed', 'Paid Amount', 
        'Remaining', 'Status', 'Payment Date', 'Payment Method', 'Reference', 'Notes', 'Created'
      ]
    ]

    commissionPayments.forEach(payment => {
      const project = projects.find(p => p.id === payment.projectId)
      
      data.push([
        payment.id,
        project ? `${project.name} - ${project.unit}` : 'N/A',
        payment.recipientName,
        payment.recipientType === 'broker' ? 'Broker' : 'Company Rep',
        payment.amount,
        payment.paidAmount,
        payment.remainingAmount,
        payment.status,
        payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A',
        payment.paymentMethod || 'N/A',
        payment.paymentReference || 'N/A',
        payment.notes || '',
        formatDate(payment.createdAt),
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Commission Payments')
    XLSX.writeFile(wb, `commission_payments_${new Date().toISOString().slice(0, 10)}.xlsx`)

    return { success: true }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, error }
  }
}

// NEW: Export broker summary with commission details
export const exportBrokerSummary = (
  brokers: Broker[],
  projects: Project[],
  commissionPayments: CommissionPayment[]
) => {
  try {
    const data = [
      ['SITARA BUILDERS CRM - BROKER COMMISSION SUMMARY', ''],
      ['Generated on', new Date().toLocaleDateString()],
      [''],
      [
        'Broker Name', 'Phone', 'CNIC', 'Default Commission %', 
        'Total Projects', 'Total Sale Value', 
        'Commission Owed', 'Commission Paid', 'Commission Accrued', 'Status'
      ]
    ]

    brokers.forEach(broker => {
      const brokerProjects = projects.filter(p => p.brokerId === broker.id)
      const totalSale = brokerProjects.reduce((sum, p) => sum + p.sale, 0)
      
      let commissionOwed = 0
      let commissionPaid = 0
      
      brokerProjects.forEach(project => {
        const commissions = calculateProjectCommissions(project, commissionPayments)
        commissionOwed += commissions.broker.total
        commissionPaid += commissions.broker.paid
      })
      
      data.push([
        broker.name,
        broker.phone,
        broker.cnic,
        broker.commissionRate || 1,
        brokerProjects.length,
        totalSale,
        commissionOwed,
        commissionPaid,
        commissionOwed - commissionPaid,
        broker.status,
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Broker Summary')
    XLSX.writeFile(wb, `broker_summary_${new Date().toISOString().slice(0, 10)}.xlsx`)

    return { success: true }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, error }
  }
}