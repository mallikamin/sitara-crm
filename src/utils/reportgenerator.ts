// src/utils/reportGenerator.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ========== FORMATTING HELPERS ==========
const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  if (num >= 10000000) {
    return '₨' + (num / 10000000).toFixed(2) + ' Cr';
  } else if (num >= 100000) {
    return '₨' + (num / 100000).toFixed(2) + ' Lac';
  }
  return '₨' + num.toLocaleString('en-PK');
};

const formatCurrencyFull = (amount) => {
  const num = parseFloat(amount) || 0;
  return '₨' + num.toLocaleString('en-PK');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const calculateDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getAgingString = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = calculateDaysBetween(due, today);
  
  if (diffDays <= 0) return 'Current';
  if (diffDays <= 30) return `${diffDays} days`;
  
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  if (days === 0) return `${months} month${months > 1 ? 's' : ''}`;
  return `${months}m ${days}d`;
};

const getCycleMonths = (cycle) => {
  switch (cycle) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'bi_annual':
    case 'biannual':
    case 'semi_annual': return 6;
    case 'annual':
    case 'yearly': return 12;
    default: return 6;
  }
};

// ========== INSTALLMENT SCHEDULE GENERATOR ==========
const generateInstallmentSchedule = (txn) => {
  const firstDueDate = txn.firstDueDate || txn.nextDue || txn.nextDueDate;
  if (!firstDueDate) return [];
  
  const installmentCount = parseInt(txn.installments) || parseInt(txn.installmentCount) || 4;
  const cycleMonths = getCycleMonths(txn.paymentCycle || txn.cycle);
  const totalSale = parseFloat(txn.sale) || parseFloat(txn.saleValue) || parseFloat(txn.totalSale) || 0;
  const totalReceived = parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
  const installmentAmount = totalSale / installmentCount;
  
  const schedule = [];
  const startDate = new Date(firstDueDate);
  let remainingPayment = totalReceived;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < installmentCount; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
    dueDate.setHours(0, 0, 0, 0);
    
    let paidAmount = 0;
    let status = 'pending';
    
    if (remainingPayment >= installmentAmount) {
      paidAmount = installmentAmount;
      remainingPayment -= installmentAmount;
      status = 'paid';
    } else if (remainingPayment > 0) {
      paidAmount = remainingPayment;
      remainingPayment = 0;
      status = 'partial';
    }
    
    const remaining = installmentAmount - paidAmount;
    const isOverdue = dueDate <= today && status !== 'paid';
    
    schedule.push({
      number: i + 1,
      dueDate,
      amount: installmentAmount,
      paidAmount,
      remaining,
      status,
      isOverdue,
      aging: isOverdue ? getAgingString(dueDate) : null
    });
  }
  
  return schedule;
};

// ========== AGING CALCULATOR ==========
const calculateAging = (transactions) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const aging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days120: 0,
    over120: 0,
    total: 0
  };
  
  transactions.forEach(txn => {
    const schedule = generateInstallmentSchedule(txn);
    
    schedule.forEach(inst => {
      if (inst.status !== 'paid' && inst.remaining > 0) {
        const daysOverdue = calculateDaysBetween(inst.dueDate, today);
        
        if (daysOverdue <= 0) {
          aging.current += inst.remaining;
        } else if (daysOverdue <= 30) {
          aging.days30 += inst.remaining;
        } else if (daysOverdue <= 60) {
          aging.days60 += inst.remaining;
        } else if (daysOverdue <= 90) {
          aging.days90 += inst.remaining;
        } else if (daysOverdue <= 120) {
          aging.days120 += inst.remaining;
        } else {
          aging.over120 += inst.remaining;
        }
        aging.total += inst.remaining;
      }
    });
  });
  
  return aging;
};

// ========== RISK SCORE CALCULATOR ==========
const calculateRiskScore = (transactions, receipts) => {
  let score = 0;
  const today = new Date();
  
  // Factor 1: Overdue percentage (40 points max)
  let totalReceivable = 0;
  let totalOverdue = 0;
  
  transactions.forEach(txn => {
    const schedule = generateInstallmentSchedule(txn);
    schedule.forEach(inst => {
      if (inst.status !== 'paid') {
        totalReceivable += inst.remaining;
        if (inst.isOverdue) totalOverdue += inst.remaining;
      }
    });
  });
  
  if (totalReceivable > 0) {
    const overduePercent = (totalOverdue / totalReceivable) * 100;
    score += Math.min(40, overduePercent * 0.4);
  }
  
  // Factor 2: Payment consistency (30 points max)
  if (receipts.length > 0) {
    const sortedReceipts = [...receipts].sort((a, b) => new Date(a.date) - new Date(b.date));
    let latePayments = 0;
    
    // Check if payments were made on time (simplified)
    sortedReceipts.forEach((receipt, idx) => {
      if (idx > 0) {
        const gap = calculateDaysBetween(sortedReceipts[idx - 1].date, receipt.date);
        if (gap > 200) latePayments++; // More than 6 months gap
      }
    });
    
    const latePercent = (latePayments / Math.max(1, receipts.length - 1)) * 100;
    score += Math.min(30, latePercent * 0.3);
  } else if (totalReceivable > 0) {
    score += 30; // No payments at all
  }
  
  // Factor 3: Aging severity (30 points max)
  const aging = calculateAging(transactions);
  if (aging.total > 0) {
    const severeOverdue = aging.days90 + aging.days120 + aging.over120;
    const severePercent = (severeOverdue / aging.total) * 100;
    score += Math.min(30, severePercent * 0.3);
  }
  
  return Math.round(Math.min(100, score));
};

// ========== PDF GENERATION ==========
class ReportGenerator {
  
  // Add header to all pages
  static addHeader(doc, title, subtitle = '') {
    // Header background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 35, 'F');
    
    // Logo/Brand
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('SITARA BUILDERS', 20, 15);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Enterprise Recovery CRM', 20, 22);
    
    // Report title
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 190, 15, { align: 'right' });
    
    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(subtitle, 190, 22, { align: 'right' });
    }
    
    // Date
    doc.setFontSize(8);
    doc.text(`Generated: ${formatDate(new Date())}`, 190, 30, { align: 'right' });
  }
  
  // Add footer to all pages
  static addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Confidential • Sitara Builders CRM`, 20, 287);
      doc.text(`Page ${i} of ${pageCount}`, 190, 287, { align: 'right' });
    }
  }
  
  // Section header
  static addSectionHeader(doc, y, title, icon = '') {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(15, y - 5, 180, 10, 'S');
    
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon} ${title}`, 20, y + 2);
    
    return y + 12;
  }
  
  // KPI Box
  static addKPIBox(doc, x, y, width, label, value, color = [99, 102, 241]) {
    // Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, width, 25, 2, 2, 'FD');
    
    // Color bar
    doc.setFillColor(...color);
    doc.rect(x, y, 3, 25, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 8, y + 8);
    
    // Value
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 8, y + 18);
  }

  // ========== CUSTOMER REPORT ==========
  static generateCustomerReport(data) {
    const { customer, transactions, receipts, interactions } = data;
    const doc = new jsPDF();
    
    // Page 1: Executive Summary
    this.addHeader(doc, 'CUSTOMER PORTFOLIO REPORT', customer.name);
    
    let y = 50;
    
    // Customer Info Box
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y, 180, 30, 3, 3, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, 20, y + 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`CNIC: ${customer.cnic || 'N/A'}  |  Phone: ${customer.phone || 'N/A'}  |  Type: ${customer.type?.toUpperCase() || 'CUSTOMER'}`, 20, y + 18);
    doc.text(`Address: ${customer.address || 'N/A'}`, 20, y + 25);
    
    y += 40;
    
    // Calculate financials
    let totalSale = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0;
    
    transactions.forEach(txn => {
      totalSale += parseFloat(txn.sale) || parseFloat(txn.totalSale) || 0;
      totalReceived += parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
      
      const schedule = generateInstallmentSchedule(txn);
      schedule.forEach(inst => {
        if (inst.status !== 'paid') {
          if (inst.isOverdue) totalOverdue += inst.remaining;
          else totalFuture += inst.remaining;
        }
      });
    });
    
    const totalReceivable = totalSale - totalReceived;
    const collectionRate = totalSale > 0 ? (totalReceived / totalSale * 100).toFixed(1) : 0;
    const riskScore = calculateRiskScore(transactions, receipts);
    
    // KPI Cards
    this.addKPIBox(doc, 15, y, 42, 'Total Investment', formatCurrency(totalSale), [99, 102, 241]);
    this.addKPIBox(doc, 60, y, 42, 'Received', formatCurrency(totalReceived), [16, 185, 129]);
    this.addKPIBox(doc, 105, y, 42, 'Receivable', formatCurrency(totalReceivable), [245, 158, 11]);
    this.addKPIBox(doc, 150, y, 45, 'Overdue', formatCurrency(totalOverdue), [239, 68, 68]);
    
    y += 35;
    
    // Risk Assessment
    y = this.addSectionHeader(doc, y, 'RISK ASSESSMENT', '⚠️');
    
    const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
    const riskColor = riskScore > 70 ? [239, 68, 68] : riskScore > 40 ? [245, 158, 11] : [16, 185, 129];
    
    // Risk score bar
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(20, y, 100, 8, 2, 2, 'F');
    doc.setFillColor(...riskColor);
    doc.roundedRect(20, y, riskScore, 8, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...riskColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${riskScore}/100 - ${riskLevel} RISK`, 125, y + 6);
    
    y += 15;
    
    // Recommendations
    const recommendations = riskScore > 70 
      ? ['Immediate escalation required', 'Daily follow-up schedule', 'Consider legal action preparation']
      : riskScore > 40 
      ? ['Weekly follow-up schedule', 'Payment plan renegotiation', 'Enhanced monitoring']
      : ['Standard collection procedures', 'Monthly review', 'Relationship building'];
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    recommendations.forEach((rec, i) => {
      doc.text(`• ${rec}`, 25, y + (i * 5));
    });
    
    y += 25;
    
    // Transaction Summary Table
    y = this.addSectionHeader(doc, y, 'TRANSACTION PORTFOLIO', '📋');
    
    const txnTableData = transactions.map(txn => {
      const schedule = generateInstallmentSchedule(txn);
      const paid = schedule.filter(s => s.status === 'paid').length;
      const total = schedule.length || parseInt(txn.installments) || 4;
      
      return [
        txn.projectName || txn.name || '-',
        txn.plotNumber || txn.unit || '-',
        formatCurrency(txn.sale || txn.totalSale || 0),
        formatCurrency(txn.received || txn.totalReceived || 0),
        `${paid}/${total}`,
        txn.status?.toUpperCase() || 'ACTIVE'
      ];
    });
    
    autoTable(doc, {
      startY: y,
      head: [['Project', 'Unit', 'Sale Value', 'Received', 'Installments', 'Status']],
      body: txnTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      }
    });
    
    // Page 2: Installment Schedule
    doc.addPage();
    this.addHeader(doc, 'INSTALLMENT SCHEDULE', customer.name);
    
    y = 50;
    y = this.addSectionHeader(doc, y, 'DETAILED INSTALLMENT BREAKDOWN', '📅');
    
    transactions.forEach(txn => {
      const schedule = generateInstallmentSchedule(txn);
      if (schedule.length === 0) return;
      
      // Project header
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`${txn.projectName || txn.name} - ${txn.plotNumber || txn.unit || ''}`, 20, y);
      y += 6;
      
      const scheduleData = schedule.map(inst => [
        `#${inst.number}`,
        formatDate(inst.dueDate),
        formatCurrency(inst.amount),
        formatCurrency(inst.paidAmount),
        formatCurrency(inst.remaining),
        inst.status === 'paid' ? 'PAID' : inst.status === 'partial' ? `PARTIAL (${Math.round(inst.paidAmount / inst.amount * 100)}%)` : inst.isOverdue ? `OVERDUE (${inst.aging})` : 'UPCOMING'
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['#', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status']],
        body: scheduleData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [71, 85, 105] },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const status = data.cell.raw;
            if (status === 'PAID') {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            } else if (status.includes('OVERDUE')) {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            } else if (status.includes('PARTIAL')) {
              data.cell.styles.textColor = [245, 158, 11];
            }
          }
        }
      });
      
      y = doc.lastAutoTable.finalY + 10;
      
      if (y > 250) {
        doc.addPage();
        this.addHeader(doc, 'INSTALLMENT SCHEDULE (CONT.)', customer.name);
        y = 50;
      }
    });
    
    // Page 3: Payment History
    doc.addPage();
    this.addHeader(doc, 'PAYMENT HISTORY', customer.name);
    
    y = 50;
    y = this.addSectionHeader(doc, y, 'RECEIPT HISTORY', '🧾');
    
    if (receipts.length > 0) {
      const receiptData = receipts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((r, idx) => [
          r.receiptNumber || `RCP-${String(idx + 1).padStart(4, '0')}`,
          formatDate(r.date),
          formatCurrency(r.amount),
          r.method?.toUpperCase() || 'CASH',
          r.reference || '-',
          r.notes || '-'
        ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Receipt #', 'Date', 'Amount', 'Method', 'Reference', 'Notes']],
        body: receiptData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42] },
        columnStyles: {
          2: { halign: 'right' }
        }
      });
      
      y = doc.lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('No payment records found.', 20, y + 10);
      y += 25;
    }
    
    // Interaction History
    if (y > 200) {
      doc.addPage();
      this.addHeader(doc, 'INTERACTION HISTORY', customer.name);
      y = 50;
    }
    
    y = this.addSectionHeader(doc, y, 'COMMUNICATION LOG', '💬');
    
    if (interactions.length > 0) {
      const interactionData = interactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20)
        .map(int => [
          formatDate(int.date),
          int.type?.toUpperCase() || '-',
          int.priority?.toUpperCase() || 'MEDIUM',
          int.notes?.substring(0, 40) + (int.notes?.length > 40 ? '...' : '') || '-',
          int.status?.toUpperCase().replace('_', ' ') || '-',
          int.nextFollowUp ? formatDate(int.nextFollowUp) : '-'
        ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Type', 'Priority', 'Notes', 'Status', 'Follow-up']],
        body: interactionData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42] }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('No interaction records found.', 20, y + 10);
    }
    
    this.addFooter(doc);
    return doc;
  }

  // ========== BROKER REPORT ==========
  static generateBrokerReport(data) {
    const { broker, transactions, customers, receipts } = data;
    const doc = new jsPDF();
    
    this.addHeader(doc, 'BROKER PERFORMANCE REPORT', broker.name);
    
    let y = 50;
    
    // Broker Info
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y, 180, 25, 3, 3, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(broker.name, 20, y + 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Phone: ${broker.phone || 'N/A'}  |  CNIC: ${broker.cnic || 'N/A'}  |  Status: ${broker.status?.toUpperCase() || 'ACTIVE'}`, 20, y + 18);
    
    y += 35;
    
    // Calculate broker stats
    let totalBrokered = 0, totalReceived = 0, totalCommission = 0;
    
    transactions.forEach(txn => {
      const sale = parseFloat(txn.sale) || parseFloat(txn.totalSale) || 0;
      totalBrokered += sale;
      totalReceived += parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
      
      // Use per-transaction commission rate (1% default)
      const rate = parseFloat(txn.brokerCommissionRate) || 1;
      totalCommission += sale * (rate / 100);
    });
    
    // KPIs
    this.addKPIBox(doc, 15, y, 42, 'Total Deals', transactions.length.toString(), [99, 102, 241]);
    this.addKPIBox(doc, 60, y, 45, 'Total Brokered', formatCurrency(totalBrokered), [16, 185, 129]);
    this.addKPIBox(doc, 108, y, 42, 'Recovered', formatCurrency(totalReceived), [245, 158, 11]);
    this.addKPIBox(doc, 153, y, 42, 'Commission', formatCurrency(totalCommission), [139, 92, 246]);
    
    y += 40;
    
    // Deals Table
    y = this.addSectionHeader(doc, y, 'BROKERED TRANSACTIONS', '🤝');
    
    const dealsData = transactions.map(txn => {
      const customer = customers.find(c => String(c.id) === String(txn.customerId));
      const schedule = generateInstallmentSchedule(txn);
      let overdue = 0;
      schedule.forEach(inst => {
        if (inst.isOverdue) overdue += inst.remaining;
      });
      
      return [
        customer?.name || 'Unknown',
        txn.projectName || txn.name || '-',
        txn.plotNumber || txn.unit || '-',
        formatCurrency(txn.sale || txn.totalSale || 0),
        formatCurrency(txn.received || txn.totalReceived || 0),
        formatCurrency(overdue),
        formatDate(txn.saleDate || txn.createdAt)
      ];
    });
    
    autoTable(doc, {
      startY: y,
      head: [['Customer', 'Project', 'Unit', 'Sale Value', 'Received', 'Overdue', 'Date']],
      body: dealsData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });
    
    y = doc.lastAutoTable.finalY + 15;
    
    // Aging Analysis
    if (y > 200) {
      doc.addPage();
      this.addHeader(doc, 'BROKER REPORT (CONT.)', broker.name);
      y = 50;
    }
    
    y = this.addSectionHeader(doc, y, 'RECEIVABLE AGING ANALYSIS', '⏰');
    
    const aging = calculateAging(transactions);
    
    const agingData = [
      ['Current (Not Due)', formatCurrency(aging.current), aging.total > 0 ? `${(aging.current / aging.total * 100).toFixed(1)}%` : '0%'],
      ['1-30 Days Overdue', formatCurrency(aging.days30), aging.total > 0 ? `${(aging.days30 / aging.total * 100).toFixed(1)}%` : '0%'],
      ['31-60 Days Overdue', formatCurrency(aging.days60), aging.total > 0 ? `${(aging.days60 / aging.total * 100).toFixed(1)}%` : '0%'],
      ['61-90 Days Overdue', formatCurrency(aging.days90), aging.total > 0 ? `${(aging.days90 / aging.total * 100).toFixed(1)}%` : '0%'],
      ['91-120 Days Overdue', formatCurrency(aging.days120), aging.total > 0 ? `${(aging.days120 / aging.total * 100).toFixed(1)}%` : '0%'],
      ['120+ Days Overdue', formatCurrency(aging.over120), aging.total > 0 ? `${(aging.over120 / aging.total * 100).toFixed(1)}%` : '0%'],
      ['TOTAL RECEIVABLE', formatCurrency(aging.total), '100%']
    ];
    
    autoTable(doc, {
      startY: y,
      head: [['Aging Bucket', 'Amount', 'Percentage']],
      body: agingData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 6) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [249, 250, 251];
        }
      }
    });
    
    this.addFooter(doc);
    return doc;
  }

  // ========== PROJECT MASTER REPORT ==========
  static generateProjectReport(data) {
    const { projectName, inventory, transactions, customers, receipts } = data;
    const doc = new jsPDF();
    
    this.addHeader(doc, 'PROJECT MASTER REPORT', projectName);
    
    let y = 50;
    
    // Calculate project stats
    const availableUnits = inventory.filter(i => i.status === 'available');
    const soldUnits = inventory.filter(i => i.status === 'sold');
    const reservedUnits = inventory.filter(i => i.status === 'reserved' || i.status === 'blocked');
    
    const totalInventoryValue = inventory.reduce((sum, i) => sum + (parseFloat(i.totalValue) || parseFloat(i.saleValue) || 0), 0);
    const availableValue = availableUnits.reduce((sum, i) => sum + (parseFloat(i.totalValue) || parseFloat(i.saleValue) || 0), 0);
    
    let totalSold = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0;
    transactions.forEach(txn => {
      totalSold += parseFloat(txn.sale) || parseFloat(txn.totalSale) || 0;
      totalReceived += parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
      
      const schedule = generateInstallmentSchedule(txn);
      schedule.forEach(inst => {
        if (inst.status !== 'paid') {
          if (inst.isOverdue) totalOverdue += inst.remaining;
          else totalFuture += inst.remaining;
        }
      });
    });
    
    // Project Summary KPIs
    this.addKPIBox(doc, 15, y, 42, 'Total Units', inventory.length.toString(), [99, 102, 241]);
    this.addKPIBox(doc, 60, y, 42, 'Available', availableUnits.length.toString(), [16, 185, 129]);
    this.addKPIBox(doc, 105, y, 42, 'Sold', soldUnits.length.toString(), [245, 158, 11]);
    this.addKPIBox(doc, 150, y, 45, 'Reserved', reservedUnits.length.toString(), [139, 92, 246]);
    
    y += 35;
    
    this.addKPIBox(doc, 15, y, 58, 'Total Inventory Value', formatCurrency(totalInventoryValue), [99, 102, 241]);
    this.addKPIBox(doc, 76, y, 58, 'Available Value', formatCurrency(availableValue), [16, 185, 129]);
    this.addKPIBox(doc, 137, y, 58, 'Sold Value', formatCurrency(totalSold), [245, 158, 11]);
    
    y += 40;
    
    // Inventory Status
    y = this.addSectionHeader(doc, y, 'INVENTORY STATUS', '📦');
    
    const inventoryData = inventory.slice(0, 30).map(item => [
      item.block || '-',
      item.unitShopNumber || item.unit || '-',
      item.unitType || '-',
      item.marlas ? `${item.marlas} M` : '-',
      formatCurrency(item.totalValue || item.saleValue || 0),
      item.status?.toUpperCase() || 'AVAILABLE'
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Block', 'Unit #', 'Type', 'Size', 'Value', 'Status']],
      body: inventoryData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        4: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const status = data.cell.raw;
          if (status === 'SOLD') {
            data.cell.styles.textColor = [239, 68, 68];
          } else if (status === 'AVAILABLE') {
            data.cell.styles.textColor = [16, 185, 129];
          } else {
            data.cell.styles.textColor = [245, 158, 11];
          }
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    
    // Page 2: Sales & Recovery
    doc.addPage();
    this.addHeader(doc, 'SALES & RECOVERY', projectName);
    
    y = 50;
    
    // Sales KPIs
    this.addKPIBox(doc, 15, y, 42, 'Total Sold', formatCurrency(totalSold), [99, 102, 241]);
    this.addKPIBox(doc, 60, y, 45, 'Received', formatCurrency(totalReceived), [16, 185, 129]);
    this.addKPIBox(doc, 108, y, 42, 'Overdue', formatCurrency(totalOverdue), [239, 68, 68]);
    this.addKPIBox(doc, 153, y, 42, 'Future Due', formatCurrency(totalFuture), [245, 158, 11]);
    
    y += 40;
    
    // Sales Table
    y = this.addSectionHeader(doc, y, 'SOLD UNITS & RECOVERY STATUS', '💰');
    
    const salesData = transactions.map(txn => {
      const customer = customers.find(c => String(c.id) === String(txn.customerId));
      const schedule = generateInstallmentSchedule(txn);
      const paidInst = schedule.filter(s => s.status === 'paid').length;
      let unitOverdue = 0;
      schedule.forEach(inst => {
        if (inst.isOverdue) unitOverdue += inst.remaining;
      });
      
      return [
        txn.plotNumber || txn.unit || '-',
        customer?.name || 'Unknown',
        formatCurrency(txn.sale || txn.totalSale || 0),
        formatCurrency(txn.received || txn.totalReceived || 0),
        `${paidInst}/${schedule.length || parseInt(txn.installments) || 4}`,
        formatCurrency(unitOverdue),
        txn.status?.toUpperCase() || 'ACTIVE'
      ];
    });
    
    autoTable(doc, {
      startY: y,
      head: [['Unit', 'Customer', 'Sale Value', 'Received', 'Inst.', 'Overdue', 'Status']],
      body: salesData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right' }
      }
    });
    
    y = doc.lastAutoTable.finalY + 15;
    
    // Aging Analysis
    y = this.addSectionHeader(doc, y, 'PROJECT AGING ANALYSIS', '⏰');
    
    const aging = calculateAging(transactions);
    
    // Visual aging bar
    const barWidth = 170;
    const barY = y + 5;
    
    doc.setFillColor(226, 232, 240);
    doc.rect(20, barY, barWidth, 12, 'F');
    
    let barX = 20;
    const colors = {
      current: [16, 185, 129],
      days30: [245, 158, 11],
      days60: [249, 115, 22],
      days90: [239, 68, 68],
      days120: [220, 38, 38],
      over120: [153, 27, 27]
    };
    
    Object.entries(aging).forEach(([key, value]) => {
      if (key !== 'total' && value > 0 && aging.total > 0) {
        const width = (value / aging.total) * barWidth;
        doc.setFillColor(...colors[key]);
        doc.rect(barX, barY, width, 12, 'F');
        barX += width;
      }
    });
    
    y += 25;
    
    // Aging legend
    const agingLegend = [
      { label: 'Current', value: aging.current, color: colors.current },
      { label: '1-30d', value: aging.days30, color: colors.days30 },
      { label: '31-60d', value: aging.days60, color: colors.days60 },
      { label: '61-90d', value: aging.days90, color: colors.days90 },
      { label: '91-120d', value: aging.days120, color: colors.days120 },
      { label: '120+d', value: aging.over120, color: colors.over120 }
    ];
    
    agingLegend.forEach((item, idx) => {
      const x = 20 + (idx * 30);
      doc.setFillColor(...item.color);
      doc.rect(x, y, 8, 4, 'F');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label, x + 10, y + 3);
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(item.value), x, y + 10);
    });
    
    this.addFooter(doc);
    return doc;
  }

  // ========== INVENTORY REPORT ==========
  static generateInventoryReport(data) {
    const { inventory, transactions, customers } = data;
    const doc = new jsPDF('landscape');
    
    this.addHeader(doc, 'INVENTORY MASTER REPORT', `Total: ${inventory.length} Units`);
    
    let y = 50;
    
    // Group by project
    const projectGroups = {};
    inventory.forEach(item => {
      const project = item.projectName || 'Unassigned';
      if (!projectGroups[project]) {
        projectGroups[project] = { available: [], sold: [], reserved: [] };
      }
      if (item.status === 'sold') {
        projectGroups[project].sold.push(item);
      } else if (item.status === 'reserved' || item.status === 'blocked') {
        projectGroups[project].reserved.push(item);
      } else {
        projectGroups[project].available.push(item);
      }
    });
    
    // Summary KPIs (landscape layout)
    const available = inventory.filter(i => i.status === 'available');
    const sold = inventory.filter(i => i.status === 'sold');
    const reserved = inventory.filter(i => i.status === 'reserved' || i.status === 'blocked');
    
    const totalValue = inventory.reduce((sum, i) => sum + (parseFloat(i.totalValue) || 0), 0);
    const availableValue = available.reduce((sum, i) => sum + (parseFloat(i.totalValue) || 0), 0);
    const soldValue = sold.reduce((sum, i) => sum + (parseFloat(i.totalValue) || 0), 0);
    
    this.addKPIBox(doc, 15, y, 55, 'Total Units', inventory.length.toString(), [99, 102, 241]);
    this.addKPIBox(doc, 75, y, 55, 'Available', `${available.length} (${formatCurrency(availableValue)})`, [16, 185, 129]);
    this.addKPIBox(doc, 135, y, 55, 'Sold', `${sold.length} (${formatCurrency(soldValue)})`, [245, 158, 11]);
    this.addKPIBox(doc, 195, y, 55, 'Reserved/Blocked', reserved.length.toString(), [139, 92, 246]);
    
    y += 40;
    
    // Detailed inventory table
    const inventoryData = inventory.map(item => {
      let customerName = '-';
      let receivedAmount = '-';
      
      if (item.status === 'sold' && item.transactionId) {
        const txn = transactions.find(t => t.id === item.transactionId);
        if (txn) {
          const customer = customers.find(c => String(c.id) === String(txn.customerId));
          customerName = customer?.name || 'Unknown';
          receivedAmount = formatCurrency(txn.received || txn.totalReceived || 0);
        }
      }
      
      return [
        item.projectName || '-',
        item.block || '-',
        item.unitShopNumber || item.unit || '-',
        item.unitType || '-',
        item.marlas ? `${item.marlas} M` : '-',
        formatCurrency(item.ratePerMarla || 0),
        formatCurrency(item.totalValue || item.saleValue || 0),
        item.status?.toUpperCase() || 'AVAILABLE',
        customerName,
        receivedAmount
      ];
    });
    
    autoTable(doc, {
      startY: y,
      head: [['Project', 'Block', 'Unit #', 'Type', 'Size', 'Rate/Marla', 'Value', 'Status', 'Customer', 'Received']],
      body: inventoryData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right' },
        9: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const status = data.cell.raw;
          if (status === 'SOLD') data.cell.styles.textColor = [239, 68, 68];
          else if (status === 'AVAILABLE') data.cell.styles.textColor = [16, 185, 129];
          else data.cell.styles.textColor = [245, 158, 11];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    
    this.addFooter(doc);
    return doc;
  }

  // ========== CONSOLIDATED FINANCIAL REPORT ==========
  static generateFinancialReport(data) {
    const { transactions, customers, receipts, inventory } = data;
    const doc = new jsPDF();
    
    this.addHeader(doc, 'CONSOLIDATED FINANCIAL REPORT', 'Executive Summary');
    
    let y = 50;
    
    // Calculate overall stats
    let totalSale = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0;
    
    transactions.forEach(txn => {
      totalSale += parseFloat(txn.sale) || parseFloat(txn.totalSale) || 0;
      totalReceived += parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
      
      const schedule = generateInstallmentSchedule(txn);
      schedule.forEach(inst => {
        if (inst.status !== 'paid') {
          if (inst.isOverdue) totalOverdue += inst.remaining;
          else totalFuture += inst.remaining;
        }
      });
    });
    
    const totalReceivable = totalSale - totalReceived;
    const collectionRate = totalSale > 0 ? (totalReceived / totalSale * 100) : 0;
    
    // Executive KPIs
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(15, y, 180, 50, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('PORTFOLIO OVERVIEW', 25, y + 12);
    
    const kpis = [
      { label: 'Total Portfolio', value: formatCurrency(totalSale), x: 25 },
      { label: 'Collected', value: formatCurrency(totalReceived), x: 70 },
      { label: 'Receivable', value: formatCurrency(totalReceivable), x: 115 },
      { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, x: 160 }
    ];
    
    kpis.forEach(kpi => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(kpi.label, kpi.x, y + 25);
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, kpi.x, y + 38);
    });
    
    y += 60;
    
    // Receivable breakdown
    this.addKPIBox(doc, 15, y, 58, 'Overdue Amount', formatCurrency(totalOverdue), [239, 68, 68]);
    this.addKPIBox(doc, 76, y, 58, 'Future Receivable', formatCurrency(totalFuture), [245, 158, 11]);
    this.addKPIBox(doc, 137, y, 58, 'Active Transactions', transactions.filter(t => t.status === 'active').length.toString(), [99, 102, 241]);
    
    y += 40;
    
    // Aging Analysis
    y = this.addSectionHeader(doc, y, 'AGING ANALYSIS', '⏰');
    
    const aging = calculateAging(transactions);
    
    const agingTableData = [
      ['Current (Not Due)', formatCurrency(aging.current), aging.total > 0 ? `${(aging.current / aging.total * 100).toFixed(1)}%` : '0%', 'Low Risk'],
      ['1-30 Days', formatCurrency(aging.days30), aging.total > 0 ? `${(aging.days30 / aging.total * 100).toFixed(1)}%` : '0%', 'Monitor'],
      ['31-60 Days', formatCurrency(aging.days60), aging.total > 0 ? `${(aging.days60 / aging.total * 100).toFixed(1)}%` : '0%', 'Follow-up'],
      ['61-90 Days', formatCurrency(aging.days90), aging.total > 0 ? `${(aging.days90 / aging.total * 100).toFixed(1)}%` : '0%', 'Escalate'],
      ['91-120 Days', formatCurrency(aging.days120), aging.total > 0 ? `${(aging.days120 / aging.total * 100).toFixed(1)}%` : '0%', 'High Priority'],
      ['120+ Days', formatCurrency(aging.over120), aging.total > 0 ? `${(aging.over120 / aging.total * 100).toFixed(1)}%` : '0%', 'Critical'],
      ['TOTAL', formatCurrency(aging.total), '100%', '-']
    ];
    
    autoTable(doc, {
      startY: y,
      head: [['Aging Bucket', 'Amount', 'Percentage', 'Action Required']],
      body: agingTableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.row.index === 6) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [249, 250, 251];
          }
          if (data.column.index === 3) {
            const actions = ['Low Risk', 'Monitor', 'Follow-up', 'Escalate', 'High Priority', 'Critical'];
            const colors = [[16, 185, 129], [59, 130, 246], [245, 158, 11], [249, 115, 22], [239, 68, 68], [153, 27, 27]];
            if (data.row.index < 6) {
              data.cell.styles.textColor = colors[data.row.index];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });
    
    y = doc.lastAutoTable.finalY + 15;
    
    // Top Debtors
    if (y > 200) {
      doc.addPage();
      this.addHeader(doc, 'FINANCIAL REPORT (CONT.)', 'Top Debtors');
      y = 50;
    }
    
    y = this.addSectionHeader(doc, y, 'TOP 10 DEBTORS', '👥');
    
    // Calculate customer totals
    const customerTotals = {};
    transactions.forEach(txn => {
      const customerId = txn.customerId;
      if (!customerTotals[customerId]) {
        customerTotals[customerId] = { receivable: 0, overdue: 0 };
      }
      const schedule = generateInstallmentSchedule(txn);
      schedule.forEach(inst => {
        if (inst.status !== 'paid') {
          customerTotals[customerId].receivable += inst.remaining;
          if (inst.isOverdue) customerTotals[customerId].overdue += inst.remaining;
        }
      });
    });
    
    const topDebtors = Object.entries(customerTotals)
      .sort((a, b) => b[1].receivable - a[1].receivable)
      .slice(0, 10)
      .map(([customerId, totals]) => {
        const customer = customers.find(c => String(c.id) === String(customerId));
        return [
          customer?.name || 'Unknown',
          formatCurrency(totals.receivable),
          formatCurrency(totals.overdue),
          totals.receivable > 0 ? `${(totals.overdue / totals.receivable * 100).toFixed(0)}%` : '0%'
        ];
      });
    
    autoTable(doc, {
      startY: y,
      head: [['Customer', 'Total Receivable', 'Overdue', 'Overdue %']],
      body: topDebtors,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    
    this.addFooter(doc);
    return doc;
  }
}

export default ReportGenerator;
export { formatCurrency, formatDate, calculateDaysBetween, generateInstallmentSchedule, calculateAging, calculateRiskScore };