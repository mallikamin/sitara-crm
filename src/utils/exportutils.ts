import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { CRMData, Project, Customer } from '../types/crm'
import { formatCurrency, formatDate } from './formatters'
import { calculateProjectFinancials, calculateOverallFinancials } from './calculations'

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

export const exportFinancialSummary = (projects: Project[], customers: Customer[]) => {
  try {
    const financials = calculateOverallFinancials(projects)

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
      ['Summary Statistics', 'Count'],
      ['Total Customers', customers.length],
      ['Total Projects', projects.length],
      ['Total Brokers', customers.filter(c => c.type === 'broker' || c.type === 'both').length],
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

export const generateCustomerReportPDF = (customer: Customer, projects: Project[]) => {
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

    // Projects
    const customerProjects = projects.filter(p => p.customerId === customer.id)
    if (customerProjects.length > 0) {
      doc.setFontSize(12)
      doc.text('PROJECTS', 20, yPos)
      yPos += 10

      const tableData = customerProjects.map(project => {
        const financials = calculateProjectFinancials(project)
        return [
          project.name,
          project.unit,
          formatCurrency(financials.totalSale),
          formatCurrency(financials.totalReceived),
          formatCurrency(financials.totalReceivable),
          project.status.toUpperCase(),
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Project', 'Unit', 'Sale Value', 'Received', 'Balance', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      })
    }

    doc.save(`customer_report_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)

    return { success: true }
  } catch (error) {
    console.error('PDF generation failed:', error)
    return { success: false, error }
  }
}