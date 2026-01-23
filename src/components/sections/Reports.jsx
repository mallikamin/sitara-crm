import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContextAPI';

// ========== ELITE COLOR SYSTEM ==========
const COLORS = {
  navy: { hex: '#0A1628', rgb: [10, 22, 40] },
  darkBlue: { hex: '#1E3A5F', rgb: [30, 58, 95] },
  royalBlue: { hex: '#2563EB', rgb: [37, 99, 235] },
  skyBlue: { hex: '#3B82F6', rgb: [59, 130, 246] },
  success: { hex: '#059669', rgb: [5, 150, 105] },
  warning: { hex: '#D97706', rgb: [217, 119, 6] },
  danger: { hex: '#DC2626', rgb: [220, 38, 38] },
  info: { hex: '#0891B2', rgb: [8, 145, 178] },
  dark: { hex: '#1F2937', rgb: [31, 41, 55] },
  gray: { hex: '#6B7280', rgb: [107, 114, 128] },
  lightGray: { hex: '#D1D5DB', rgb: [209, 213, 219] },
  light: { hex: '#F8FAFC', rgb: [248, 250, 252] },
  white: { hex: '#FFFFFF', rgb: [255, 255, 255] },
};

// ========== FORMATTING UTILITIES ==========
const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  if (Math.abs(num) >= 10000000) return '₨' + (num / 10000000).toFixed(2) + ' Cr';
  if (Math.abs(num) >= 100000) return '₨' + (num / 100000).toFixed(2) + ' Lac';
  if (Math.abs(num) >= 1000) return '₨' + (num / 1000).toFixed(1) + 'K';
  return '₨' + num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '-'; }
};

const formatPercentage = (value, decimals = 1) => (parseFloat(value) || 0).toFixed(decimals) + '%';

const getDaysFromNow = (date) => {
  if (!date) return 999;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  return Math.floor((now - target) / (1000 * 60 * 60 * 24));
};

// ========== FINANCIAL CALCULATIONS (Matching Dashboard.jsx Logic) ==========

// Helper to get cycle months from payment cycle string
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

// Calculate overdue and future for a single transaction (matching Dashboard logic)
const calculateTransactionMetrics = (txn) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalSale = parseFloat(txn.sale) || parseFloat(txn.saleValue) || parseFloat(txn.totalSale) || 0;
  const totalReceived = parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
  const totalReceivable = Math.max(0, totalSale - totalReceived);
  
  let overdueAmount = 0;
  let futureAmount = 0;
  let overdueCount = 0;
  let pendingCount = 0;
  
  // Check if transaction has installments array (new format) or uses firstDueDate (old format)
  const hasInstallmentsArray = Array.isArray(txn.installments) && txn.installments.length > 0 && txn.installments[0].dueDate;
  
  if (hasInstallmentsArray) {
    // NEW FORMAT: installments is an array of objects with dueDate, amount, paid, partialPaid
    txn.installments.forEach(inst => {
      if (inst.paid) return;
      const amount = parseFloat(inst.amount) || 0;
      const partialPaid = parseFloat(inst.partialPaid) || 0;
      const remaining = amount - partialPaid;
      
      if (remaining > 0) {
        const dueDate = new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate <= today) {
          overdueAmount += remaining;
          overdueCount++;
        } else {
          futureAmount += remaining;
          pendingCount++;
        }
      }
    });
  } else {
    // OLD FORMAT: Uses firstDueDate, installments count, and paymentCycle (Dashboard.jsx logic)
    const firstDueDate = txn.firstDueDate || txn.nextDue || txn.nextDueDate;
    
    if (!firstDueDate) {
      // No schedule, treat remaining as future
      if (totalReceivable > 0) {
        futureAmount = totalReceivable;
        pendingCount = 1;
      }
    } else {
      const installmentCount = parseInt(txn.installments) || parseInt(txn.installmentCount) || 4;
      const cycleMonths = getCycleMonths(txn.paymentCycle || txn.cycle);
      const installmentAmount = totalSale / installmentCount;
      
      let remainingPayment = totalReceived;
      
      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
        dueDate.setHours(0, 0, 0, 0);
        
        let paidAmount = 0;
        if (remainingPayment >= installmentAmount) {
          paidAmount = installmentAmount;
          remainingPayment -= installmentAmount;
        } else if (remainingPayment > 0) {
          paidAmount = remainingPayment;
          remainingPayment = 0;
        }
        
        const remaining = installmentAmount - paidAmount;
        if (remaining > 0) {
          if (dueDate <= today) {
            overdueAmount += remaining;
            overdueCount++;
          } else {
            futureAmount += remaining;
            pendingCount++;
          }
        }
      }
    }
  }
  
  return {
    totalSale,
    totalReceived,
    totalReceivable,
    overdueAmount,
    futureAmount,
    collectionRate: totalSale > 0 ? (totalReceived / totalSale * 100) : 0,
    overdueCount,
    pendingCount,
    hasOverdue: overdueAmount > 0,
  };
};

const calculateCustomerMetrics = (customer, projects, interactions) => {
  const customerProjects = projects.filter(p => String(p.customerId) === String(customer.id));
  // Fix: Filter interactions by contacts array OR customerId/contactId
  const customerInteractions = interactions.filter(i => 
    (i.contacts || []).some(c => String(c.id) === String(customer.id)) ||
    String(i.customerId) === String(customer.id) ||
    String(i.contactId) === String(customer.id)
  );

  let totalSale = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0;
  let overdueTransactions = 0;

  customerProjects.forEach(project => {
    const metrics = calculateTransactionMetrics(project);
    totalSale += metrics.totalSale;
    totalReceived += metrics.totalReceived;
    totalOverdue += metrics.overdueAmount;
    totalFuture += metrics.futureAmount;
    if (metrics.hasOverdue) overdueTransactions++;
  });

  const totalReceivable = Math.max(0, totalSale - totalReceived);

  let riskScore = 0;
  if (totalReceivable > 0) {
    riskScore += (totalOverdue / totalReceivable) * 40;
    if (customerProjects.length > 0) riskScore += (overdueTransactions / customerProjects.length) * 30;
    if (totalReceivable > 10000000) riskScore += 20;
    else if (totalReceivable > 5000000) riskScore += 15;
    else if (totalReceivable > 1000000) riskScore += 10;
    riskScore += (1 - (totalSale > 0 ? totalReceived / totalSale : 0)) * 10;
  }
  riskScore = Math.min(100, Math.round(riskScore));

  let lastInteractionDays = 999;
  if (customerInteractions.length > 0) {
    const dates = customerInteractions.map(i => getDaysFromNow(i.date || i.createdAt));
    lastInteractionDays = Math.min(...dates.filter(d => d >= 0));
  }

  return {
    transactionCount: customerProjects.length,
    interactionCount: customerInteractions.length,
    totalSale, totalReceived, totalReceivable, totalOverdue, totalFuture,
    collectionRate: totalSale > 0 ? (totalReceived / totalSale * 100) : 0,
    riskScore,
    riskLevel: riskScore >= 60 ? 'Critical' : riskScore >= 40 ? 'High' : riskScore >= 20 ? 'Medium' : 'Low',
    lastInteractionDays,
    engagementStatus: lastInteractionDays < 14 ? 'Active' : lastInteractionDays < 30 ? 'Recent' : lastInteractionDays < 90 ? 'Dormant' : 'Inactive',
  };
};

const calculateBrokerMetrics = (broker, projects, customers) => {
  const brokerProjects = projects.filter(p => String(p.brokerId) === String(broker.id));
  let totalSale = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0;
  let overdueTransactions = 0;
  const customerSet = new Set();

  brokerProjects.forEach(project => {
    const metrics = calculateTransactionMetrics(project);
    totalSale += metrics.totalSale;
    totalReceived += metrics.totalReceived;
    totalOverdue += metrics.overdueAmount;
    totalFuture += metrics.futureAmount;
    if (metrics.hasOverdue) overdueTransactions++;
    if (project.customerId) customerSet.add(String(project.customerId));
  });

  const totalReceivable = Math.max(0, totalSale - totalReceived);
  const commissionRate = parseFloat(broker.commissionRate) || 1;
  const totalCommission = (totalSale * commissionRate) / 100;
  const commissionEarned = (totalReceived * commissionRate) / 100;
  const performanceScore = totalSale > 0 ? Math.round((totalReceived / totalSale) * 100) : 0;

  return {
    transactionCount: brokerProjects.length,
    customerCount: customerSet.size,
    totalSale, totalReceived, totalReceivable, totalOverdue, totalFuture,
    collectionRate: totalSale > 0 ? (totalReceived / totalSale * 100) : 0,
    commissionRate, totalCommission, commissionEarned,
    commissionPending: totalCommission - commissionEarned,
    performanceScore,
    performanceLevel: performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : performanceScore >= 40 ? 'Fair' : 'Needs Improvement',
    overdueTransactions,
  };
};

const calculateAgingAnalysis = (projects) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const aging = {
    current: { amount: 0, count: 0 },      // Future (not yet due)
    days1_30: { amount: 0, count: 0 },     // 0-30 days overdue
    days31_60: { amount: 0, count: 0 },    // 31-60 days overdue
    days61_90: { amount: 0, count: 0 },    // 61-90 days overdue
    days91_120: { amount: 0, count: 0 },   // 91-120 days overdue
    over120: { amount: 0, count: 0 },      // 120+ days overdue
    total: { amount: 0, count: 0 },
  };

  projects.forEach(txn => {
    const totalSale = parseFloat(txn.sale) || parseFloat(txn.saleValue) || parseFloat(txn.totalSale) || 0;
    const totalReceived = parseFloat(txn.received) || parseFloat(txn.totalReceived) || 0;
    
    // Check if transaction has installments array (new format) or uses firstDueDate (old format)
    const hasInstallmentsArray = Array.isArray(txn.installments) && txn.installments.length > 0 && txn.installments[0]?.dueDate;
    
    if (hasInstallmentsArray) {
      // NEW FORMAT: installments is an array
      txn.installments.forEach(inst => {
        if (inst.paid) return;
        const remaining = (parseFloat(inst.amount) || 0) - (parseFloat(inst.partialPaid) || 0);
        if (remaining <= 0) return;
        
        const dueDate = new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        aging.total.amount += remaining;
        aging.total.count++;
        
        if (daysOverdue < 0) {
          aging.current.amount += remaining;
          aging.current.count++;
        } else if (daysOverdue <= 30) {
          aging.days1_30.amount += remaining;
          aging.days1_30.count++;
        } else if (daysOverdue <= 60) {
          aging.days31_60.amount += remaining;
          aging.days31_60.count++;
        } else if (daysOverdue <= 90) {
          aging.days61_90.amount += remaining;
          aging.days61_90.count++;
        } else if (daysOverdue <= 120) {
          aging.days91_120.amount += remaining;
          aging.days91_120.count++;
        } else {
          aging.over120.amount += remaining;
          aging.over120.count++;
        }
      });
    } else {
      // OLD FORMAT: Uses firstDueDate (Dashboard.jsx logic)
      const firstDueDate = txn.firstDueDate || txn.nextDue || txn.nextDueDate;
      
      if (!firstDueDate) {
        // No schedule - treat as future
        const receivable = totalSale - totalReceived;
        if (receivable > 0) {
          aging.current.amount += receivable;
          aging.current.count++;
          aging.total.amount += receivable;
          aging.total.count++;
        }
        return;
      }
      
      const installmentCount = parseInt(txn.installments) || parseInt(txn.installmentCount) || 4;
      const cycleMonths = getCycleMonths(txn.paymentCycle || txn.cycle);
      const installmentAmount = totalSale / installmentCount;
      
      let remainingPayment = totalReceived;
      
      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
        dueDate.setHours(0, 0, 0, 0);
        
        let paidAmount = 0;
        if (remainingPayment >= installmentAmount) {
          paidAmount = installmentAmount;
          remainingPayment -= installmentAmount;
        } else if (remainingPayment > 0) {
          paidAmount = remainingPayment;
          remainingPayment = 0;
        }
        
        const remaining = installmentAmount - paidAmount;
        if (remaining > 0) {
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          
          aging.total.amount += remaining;
          aging.total.count++;
          
          if (daysOverdue < 0) {
            aging.current.amount += remaining;
            aging.current.count++;
          } else if (daysOverdue <= 30) {
            aging.days1_30.amount += remaining;
            aging.days1_30.count++;
          } else if (daysOverdue <= 60) {
            aging.days31_60.amount += remaining;
            aging.days31_60.count++;
          } else if (daysOverdue <= 90) {
            aging.days61_90.amount += remaining;
            aging.days61_90.count++;
          } else if (daysOverdue <= 120) {
            aging.days91_120.amount += remaining;
            aging.days91_120.count++;
          } else {
            aging.over120.amount += remaining;
            aging.over120.count++;
          }
        }
      }
    }
  });

  return aging;
};

// ========== PDF GENERATOR ==========
const PDFGenerator = {
  addHeader: (doc, title, subtitle = '', pageNum = 1) => {
    const pageWidth = doc.internal.pageSize.width;
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 22);
    if (subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, 32);
    }
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${pageNum}`, pageWidth - 14, 22, { align: 'right' });
    doc.text('SITARA CRM', pageWidth - 14, 32, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString('en-PK')}`, 14, 42);
    return 55;
  },

  addSectionTitle: (doc, title, y) => {
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, y);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(14, y + 2, 80, y + 2);
    return y + 12;
  },

  addKPIRow: (doc, kpis, y) => {
    const cardWidth = 45;
    let x = 14;
    kpis.forEach((kpi) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, 28, 2, 2, 'F');
      const color = kpi.color || [37, 99, 235];
      doc.setDrawColor(...color);
      doc.setLineWidth(2);
      doc.line(x, y, x, y + 28);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label, x + 4, y + 8);
      doc.setFontSize(12);
      doc.setTextColor(...color);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + 4, y + 18);
      if (kpi.subtext) {
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.subtext, x + 4, y + 24);
      }
      x += cardWidth + 5;
    });
    return y + 35;
  },

  addTable: (doc, headers, rows, y, options = {}) => {
    const { fontSize = 9, rowHeight = 8, colWidths = null, maxRows = 50, wrapColumns = [] } = options;
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = pageWidth - 28;
    const cols = headers.length;
    const widths = colWidths || Array(cols).fill(tableWidth / cols);
    let currentY = y;

    // Helper function to wrap text
    const wrapText = (text, maxWidth) => {
      const words = String(text || '-').split(' ');
      const lines = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = doc.getTextWidth(testLine);
        if (testWidth > maxWidth - 4 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // Draw header
    doc.setFillColor(30, 58, 95);
    doc.rect(14, currentY, tableWidth, rowHeight + 2, 'F');
    doc.setFontSize(fontSize);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');

    let xPos = 14;
    headers.forEach((header, i) => {
      doc.text(String(header), xPos + 2, currentY + rowHeight - 1);
      xPos += widths[i];
    });
    currentY += rowHeight + 2;

    doc.setFont('helvetica', 'normal');
    rows.slice(0, maxRows).forEach((row, rowIndex) => {
      // Calculate row height based on wrapped text
      let maxLines = 1;
      const wrappedCells = row.map((cell, colIndex) => {
        if (wrapColumns.includes(colIndex)) {
          const lines = wrapText(cell, widths[colIndex]);
          maxLines = Math.max(maxLines, lines.length);
          return lines;
        }
        return [String(cell || '-').substring(0, Math.floor(widths[colIndex] / 2))];
      });
      
      const dynamicRowHeight = Math.max(rowHeight, maxLines * (fontSize * 0.4 + 2));
      
      // Check for page break
      if (currentY + dynamicRowHeight > doc.internal.pageSize.height - 30) {
        doc.addPage();
        currentY = 20;
      }
      
      // Draw row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY - 1, tableWidth, dynamicRowHeight + 2, 'F');
      }
      
      // Draw cell contents
      doc.setTextColor(31, 41, 55);
      xPos = 14;
      wrappedCells.forEach((lines, colIndex) => {
        lines.forEach((line, lineIndex) => {
          const lineY = currentY + (fontSize * 0.35) + (lineIndex * (fontSize * 0.4 + 2));
          doc.text(line, xPos + 2, lineY);
        });
        xPos += widths[colIndex];
      });
      
      currentY += dynamicRowHeight + 2;
    });

    if (rows.length > maxRows) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`... and ${rows.length - maxRows} more rows`, 14, currentY + 5);
      currentY += 10;
    }
    return currentY + 5;
  },

  addAgingChart: (doc, aging, y) => {
    const categories = [
      { key: 'current', label: 'Current', color: [5, 150, 105] },
      { key: 'days1_30', label: '1-30 Days', color: [37, 99, 235] },
      { key: 'days31_60', label: '31-60 Days', color: [217, 119, 6] },
      { key: 'days61_90', label: '61-90 Days', color: [234, 88, 12] },
      { key: 'days91_120', label: '91-120 Days', color: [220, 38, 38] },
      { key: 'over120', label: '120+ Days', color: [127, 29, 29] },
    ];
    const total = aging.total.amount || 1;
    let currentY = y;

    categories.forEach(cat => {
      const data = aging[cat.key];
      const width = (data.amount / total) * 150;
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(cat.label, 14, currentY + 8);
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(55, currentY, 150, 12, 2, 2, 'F');
      if (width > 0) {
        doc.setFillColor(...cat.color);
        doc.roundedRect(55, currentY, Math.max(width, 4), 12, 2, 2, 'F');
      }
      doc.setFontSize(9);
      doc.setTextColor(...cat.color);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(data.amount), 210, currentY + 8);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`${((data.amount / total) * 100).toFixed(1)}%`, 260, currentY + 8);
      currentY += 16;
    });

    doc.setDrawColor(209, 213, 219);
    doc.line(14, currentY, 280, currentY);
    currentY += 5;
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Receivable', 14, currentY + 5);
    doc.text(formatCurrency(aging.total.amount), 210, currentY + 5);
    return currentY + 15;
  },

  addFooter: (doc) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    doc.setDrawColor(209, 213, 219);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Confidential • SITARA CRM', 14, pageHeight - 8);
    doc.text('© 2024', pageWidth - 14, pageHeight - 8, { align: 'right' });
  },
};

// ========== MAIN COMPONENT ==========
const Reports = () => {
  const { customers = [], projects = [], receipts = [], inventory = [], interactions = [], brokers = [] } = useData();
  const [activeTab, setActiveTab] = useState('command-center');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState(null);

  const projectNames = useMemo(() => {
    const names = new Set();
    // Check inventory for project names
    inventory.forEach(i => {
      if (i.projectName) names.add(i.projectName);
      if (i.project) names.add(i.project);
    });
    // Check transactions for project names (NOT transaction name field)
    projects.forEach(p => {
      // Only use project/projectName fields, NOT the 'name' field which is often customer/transaction name
      if (p.project) names.add(p.project);
      if (p.projectName) names.add(p.projectName);
    });
    return Array.from(names).filter(n => n && n.trim()).sort();
  }, [inventory, projects]);

  // ========== MASTER PROJECT METRICS (NEW) ==========
  const masterProjectMetrics = useMemo(() => {
    if (!selectedProject) return null;
    
    // Get all transactions for this project (match on project or projectName only)
    const projectTransactions = projects.filter(p => 
      p.project === selectedProject || 
      p.projectName === selectedProject
    );
    
    // Calculate consolidated summary
    let totalSale = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0;
    
    projectTransactions.forEach(txn => {
      const metrics = calculateTransactionMetrics(txn);
      totalSale += metrics.totalSale;
      totalReceived += metrics.totalReceived;
      totalOverdue += metrics.overdueAmount;
      totalFuture += metrics.futureAmount;
    });
    
    const totalReceivable = Math.max(0, totalSale - totalReceived);
    
    // Group by customer
    const customerMap = {};
    projectTransactions.forEach(txn => {
      const customerId = txn.customerId;
      const customer = customers.find(c => c.id === customerId);
      const customerName = customer?.name || txn.customerName || 'Unknown Customer';
      
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          id: customerId,
          name: customerName,
          phone: customer?.phone || '',
          transactions: [],
          totalSale: 0,
          totalReceived: 0,
          totalOverdue: 0,
          totalFuture: 0,
          units: []
        };
      }
      
      const metrics = calculateTransactionMetrics(txn);
      customerMap[customerId].transactions.push(txn);
      customerMap[customerId].totalSale += metrics.totalSale;
      customerMap[customerId].totalReceived += metrics.totalReceived;
      customerMap[customerId].totalOverdue += metrics.overdueAmount;
      customerMap[customerId].totalFuture += metrics.futureAmount;
      customerMap[customerId].units.push(txn.unit || txn.unitNumber || txn.unitShopNumber || 'N/A');
    });
    
    // Convert to array and sort by receivable (descending)
    const customerBreakdown = Object.values(customerMap)
      .map(c => ({
        ...c,
        totalReceivable: Math.max(0, c.totalSale - c.totalReceived),
        collectionRate: c.totalSale > 0 ? (c.totalReceived / c.totalSale * 100) : 0,
        unitCount: c.units.length
      }))
      .sort((a, b) => b.totalReceivable - a.totalReceivable);
    
    return {
      projectName: selectedProject,
      transactionCount: projectTransactions.length,
      customerCount: Object.keys(customerMap).length,
      summary: {
        totalSale,
        totalReceived,
        totalReceivable,
        totalOverdue,       // Due Now
        totalFuture,        // Future Receivable
        collectionRate: totalSale > 0 ? (totalReceived / totalSale * 100) : 0,
      },
      customerBreakdown
    };
  }, [selectedProject, projects, customers]);

  const portfolioMetrics = useMemo(() => {
    let totalSale = 0, totalReceived = 0, totalOverdue = 0, totalFuture = 0, activeTransactions = 0;
    projects.forEach(project => {
      const metrics = calculateTransactionMetrics(project);
      totalSale += metrics.totalSale;
      totalReceived += metrics.totalReceived;
      totalOverdue += metrics.overdueAmount;
      totalFuture += metrics.futureAmount;
      if (metrics.totalReceivable > 0) activeTransactions++;
    });
    const totalReceivable = Math.max(0, totalSale - totalReceived);
    return {
      totalSale, totalReceived, totalReceivable, totalOverdue, totalFuture,
      collectionRate: totalSale > 0 ? (totalReceived / totalSale * 100) : 0,
      activeTransactions,
      overduePercentage: totalReceivable > 0 ? (totalOverdue / totalReceivable * 100) : 0,
    };
  }, [projects]);

  const aging = useMemo(() => calculateAgingAnalysis(projects), [projects]);

  const riskPortfolio = useMemo(() => {
    const customerMetrics = customers
      .filter(c => c.type !== 'broker')
      .map(customer => ({ customer, ...calculateCustomerMetrics(customer, projects, interactions) }))
      .filter(c => c.totalReceivable > 0)
      .sort((a, b) => b.riskScore - a.riskScore);
    return {
      all: customerMetrics,
      critical: customerMetrics.filter(c => c.riskLevel === 'Critical'),
      high: customerMetrics.filter(c => c.riskLevel === 'High'),
      medium: customerMetrics.filter(c => c.riskLevel === 'Medium'),
      low: customerMetrics.filter(c => c.riskLevel === 'Low'),
      topDebtors: customerMetrics.slice(0, 10),
    };
  }, [customers, projects, interactions]);

  const pipelineMetrics = useMemo(() => {
    const byProject = {};
    inventory.forEach(item => {
      const project = item.projectName || item.project || 'Uncategorized';
      if (!byProject[project]) byProject[project] = { total: 0, available: 0, sold: 0, reserved: 0, totalValue: 0, soldValue: 0 };
      byProject[project].total++;
      byProject[project].totalValue += parseFloat(item.totalValue || item.saleValue) || 0;
      if (item.status === 'available') byProject[project].available++;
      else if (item.status === 'sold') { byProject[project].sold++; byProject[project].soldValue += parseFloat(item.totalValue || item.saleValue) || 0; }
      else byProject[project].reserved++;
    });
    return {
      byProject,
      totalUnits: inventory.length,
      availableUnits: inventory.filter(i => i.status === 'available').length,
      soldUnits: inventory.filter(i => i.status === 'sold').length,
      reservedUnits: inventory.filter(i => ['reserved', 'blocked'].includes(i.status)).length,
    };
  }, [inventory]);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ========== REPORT GENERATORS ==========
  const generateCustomerReport = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const customer = customers.find(c => String(c.id) === String(selectedCustomer));
      if (!customer) throw new Error('Customer not found');

      const metrics = calculateCustomerMetrics(customer, projects, interactions);
      const customerProjects = projects.filter(p => String(p.customerId) === String(selectedCustomer));
      // Fix: Filter interactions by contacts array, not customerId
      const customerInteractions = interactions.filter(i => 
        (i.contacts || []).some(c => String(c.id) === String(selectedCustomer)) ||
        String(i.customerId) === String(selectedCustomer) ||
        String(i.contactId) === String(selectedCustomer)
      );

      let y = PDFGenerator.addHeader(doc, 'Customer Portfolio Report', customer.name);
      y = PDFGenerator.addSectionTitle(doc, 'Customer Profile', y);

      const infoItems = [['Name', customer.name || 'N/A'], ['Phone', customer.phone || 'N/A'], ['CNIC', customer.cnic || 'N/A'], ['Status', customer.status || 'Active']];
      doc.setFontSize(10);
      infoItems.forEach(([label, value]) => {
        doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal'); doc.text(label + ':', 14, y);
        doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold'); doc.text(String(value), 50, y);
        y += 7;
      });
      y += 10;

      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Portfolio Value', value: formatCurrency(metrics.totalSale), color: COLORS.darkBlue.rgb },
        { label: 'Collected', value: formatCurrency(metrics.totalReceived), color: COLORS.success.rgb },
        { label: 'Outstanding', value: formatCurrency(metrics.totalReceivable), color: COLORS.warning.rgb },
        { label: 'Overdue', value: formatCurrency(metrics.totalOverdue), color: COLORS.danger.rgb },
      ], y);

      y = PDFGenerator.addSectionTitle(doc, 'Risk Assessment', y);
      const riskColor = metrics.riskLevel === 'Critical' ? COLORS.danger.rgb : metrics.riskLevel === 'High' ? [234, 88, 12] : metrics.riskLevel === 'Medium' ? COLORS.warning.rgb : COLORS.success.rgb;
      doc.setFillColor(...riskColor);
      doc.roundedRect(14, y, 60, 20, 3, 3, 'F');
      doc.setFontSize(11); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      doc.text(`${metrics.riskLevel} Risk`, 20, y + 9);
      doc.setFontSize(9); doc.text(`Score: ${metrics.riskScore}/100`, 20, y + 16);
      doc.setFontSize(10); doc.setTextColor(31, 41, 55);
      doc.text(`Collection Rate: ${formatPercentage(metrics.collectionRate)}`, 85, y + 9);
      doc.text(`Transactions: ${metrics.transactionCount}`, 85, y + 16);
      y += 35;

      if (customerProjects.length > 0) {
        y = PDFGenerator.addSectionTitle(doc, 'Transaction Portfolio', y);
        const rows = customerProjects.map((p, i) => {
          const m = calculateTransactionMetrics(p);
          return [
            i + 1, 
            (p.name || p.projectName || p.project || 'N/A').substring(0, 22), 
            (p.unit || '-').substring(0, 10), 
            formatCurrency(m.totalSale), 
            formatCurrency(m.totalReceived), 
            formatCurrency(m.totalReceivable), 
            formatCurrency(m.overdueAmount)
          ];
        });
        y = PDFGenerator.addTable(doc, ['#', 'Project', 'Unit', 'Sale', 'Received', 'Receivable', 'Overdue'], rows, y, { colWidths: [10, 44, 22, 28, 28, 28, 28], fontSize: 8 });
      }

      doc.addPage();
      y = PDFGenerator.addHeader(doc, 'Installment Schedule', customer.name, 2);
      customerProjects.forEach(project => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
        doc.text(`${project.name || 'Project'} - ${project.unit || 'Unit'}`, 14, y);
        y += 8;
        
        const hasInstallmentsArray = Array.isArray(project.installments) && project.installments.length > 0 && project.installments[0]?.dueDate;
        
        if (hasInstallmentsArray) {
          // NEW FORMAT: installments is array of objects
          const rows = project.installments.map((inst, i) => {
            const remaining = (parseFloat(inst.amount) || 0) - (parseFloat(inst.partialPaid) || 0);
            const dueDate = new Date(inst.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isOverdue = dueDate <= today && !inst.paid && remaining > 0;
            return [inst.number || i + 1, formatDate(inst.dueDate), formatCurrency(inst.amount), formatCurrency(inst.partialPaid || 0), formatCurrency(remaining), inst.paid ? 'Paid' : isOverdue ? 'OVERDUE' : 'Pending'];
          });
          y = PDFGenerator.addTable(doc, ['#', 'Due Date', 'Amount', 'Paid', 'Remaining', 'Status'], rows, y, { colWidths: [15, 35, 35, 35, 35, 30], fontSize: 8 });
        } else {
          // OLD FORMAT: Generate schedule from firstDueDate
          const firstDueDate = project.firstDueDate || project.nextDue || project.nextDueDate;
          if (firstDueDate) {
            const installmentCount = parseInt(project.installments) || parseInt(project.installmentCount) || 4;
            const cycleMonths = getCycleMonths(project.paymentCycle || project.cycle);
            const totalSale = parseFloat(project.sale) || 0;
            const totalReceived = parseFloat(project.received) || 0;
            const installmentAmount = totalSale / installmentCount;
            let remainingPayment = totalReceived;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const rows = [];
            for (let i = 0; i < installmentCount; i++) {
              const dueDate = new Date(firstDueDate);
              dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
              dueDate.setHours(0, 0, 0, 0);
              
              let paidAmount = 0;
              if (remainingPayment >= installmentAmount) {
                paidAmount = installmentAmount;
                remainingPayment -= installmentAmount;
              } else if (remainingPayment > 0) {
                paidAmount = remainingPayment;
                remainingPayment = 0;
              }
              
              const remaining = installmentAmount - paidAmount;
              const isPaid = remaining <= 0;
              const isOverdue = dueDate <= today && !isPaid;
              
              rows.push([i + 1, formatDate(dueDate), formatCurrency(installmentAmount), formatCurrency(paidAmount), formatCurrency(remaining), isPaid ? 'Paid' : isOverdue ? 'OVERDUE' : 'Pending']);
            }
            y = PDFGenerator.addTable(doc, ['#', 'Due Date', 'Amount', 'Paid', 'Remaining', 'Status'], rows, y, { colWidths: [15, 35, 35, 35, 35, 30], fontSize: 8 });
          } else {
            doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.text('No installment schedule available', 14, y); y += 10;
          }
        }
        y += 5;
      });

      // Always add Communication History page
      doc.addPage();
      y = PDFGenerator.addHeader(doc, 'Communication History', customer.name, 3);
      
      if (customerInteractions.length > 0) {
        const intRows = customerInteractions
          .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
          .slice(0, 40)
          .map((int, i) => {
            // Get interaction type label (short)
            const typeLabels = {
              call: 'Call', whatsapp: 'WA', sms: 'SMS', 
              email: 'Email', meeting: 'Meet', site_visit: 'Visit', other: 'Other'
            };
            const typeLabel = typeLabels[int.type] || int.type || 'Note';
            
            // Format date and time together
            const dateStr = formatDate(int.date || int.createdAt);
            const timeStr = int.time ? ` ${int.time}` : '';
            const dateTime = `${dateStr}${timeStr}`;
            
            // Get full notes - combine subject, notes and outcome for complete picture (250+ chars)
            let fullNotes = '';
            if (int.subject) fullNotes = int.subject;
            if (int.notes) fullNotes = fullNotes ? `${fullNotes} - ${int.notes}` : int.notes;
            if (int.outcome && int.outcome !== int.notes) {
              fullNotes = fullNotes ? `${fullNotes} | Outcome: ${int.outcome}` : int.outcome;
            }
            fullNotes = fullNotes || 'No notes recorded';
            
            return [
              i + 1, 
              dateTime,
              typeLabel,
              fullNotes.substring(0, 300) // Allow up to 300 chars
            ];
          });
        // Column 3 (Notes, index 3) will be word-wrapped
        y = PDFGenerator.addTable(doc, ['#', 'Date/Time', 'Type', 'Notes'], intRows, y, { 
          colWidths: [10, 32, 18, 132], 
          fontSize: 7,
          wrapColumns: [3] // Enable word wrap for Notes column
        });
      } else {
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        doc.text('No communication history recorded for this customer.', 14, y);
        y += 20;
        doc.setFontSize(10);
        doc.text('Tip: Add interactions via the CRM to track customer communications.', 14, y);
      }

      PDFGenerator.addFooter(doc);
      doc.save(`Customer_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('Customer report generated successfully');
    } catch (error) {
      console.error(error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally { setIsGenerating(false); }
  };

  const generateBrokerReport = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const broker = brokers.find(b => String(b.id) === String(selectedBroker));
      if (!broker) throw new Error('Broker not found');

      const metrics = calculateBrokerMetrics(broker, projects, customers);
      const brokerProjects = projects.filter(p => String(p.brokerId) === String(selectedBroker));

      let y = PDFGenerator.addHeader(doc, 'Broker Performance Report', broker.name);
      y = PDFGenerator.addSectionTitle(doc, 'Broker Profile', y);

      const infoItems = [['Name', broker.name || 'N/A'], ['Phone', broker.phone || 'N/A'], ['Commission', `${metrics.commissionRate}%`]];
      doc.setFontSize(10);
      infoItems.forEach(([label, value]) => {
        doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal'); doc.text(label + ':', 14, y);
        doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold'); doc.text(String(value), 55, y);
        y += 7;
      });
      y += 10;

      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Total Sales', value: formatCurrency(metrics.totalSale), color: COLORS.darkBlue.rgb },
        { label: 'Collected', value: formatCurrency(metrics.totalReceived), color: COLORS.success.rgb },
        { label: 'Receivable', value: formatCurrency(metrics.totalReceivable), color: COLORS.warning.rgb },
        { label: 'Overdue', value: formatCurrency(metrics.totalOverdue), color: COLORS.danger.rgb },
      ], y);

      y = PDFGenerator.addSectionTitle(doc, 'Commission Summary', y);
      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Total Commission', value: formatCurrency(metrics.totalCommission), color: COLORS.royalBlue.rgb },
        { label: 'Earned', value: formatCurrency(metrics.commissionEarned), color: COLORS.success.rgb },
        { label: 'Pending', value: formatCurrency(metrics.commissionPending), color: COLORS.warning.rgb },
        { label: 'Performance', value: `${metrics.performanceScore}%`, subtext: metrics.performanceLevel, color: metrics.performanceScore >= 60 ? COLORS.success.rgb : COLORS.warning.rgb },
      ], y);

      if (brokerProjects.length > 0) {
        y = PDFGenerator.addSectionTitle(doc, 'Brokered Transactions', y);
        const rows = brokerProjects.map((p, i) => {
          const m = calculateTransactionMetrics(p);
          const customer = customers.find(c => String(c.id) === String(p.customerId));
          return [
            i + 1, 
            (customer?.name || 'Unknown').substring(0, 20), 
            (p.name || 'N/A').substring(0, 18), 
            formatCurrency(m.totalSale), 
            formatCurrency(m.totalReceived), 
            formatCurrency(m.totalReceivable), 
            m.collectionRate.toFixed(0) + '%'
          ];
        });
        y = PDFGenerator.addTable(doc, ['#', 'Customer', 'Project', 'Sale', 'Received', 'Due', '%'], rows, y, { colWidths: [12, 42, 38, 30, 30, 30, 20], fontSize: 8 });
      }

      // Add broker interactions history - check contacts array
      const brokerInteractions = interactions.filter(i => 
        (i.contacts || []).some(c => String(c.id) === String(selectedBroker)) ||
        String(i.brokerId) === String(selectedBroker) ||
        brokerProjects.some(p => 
          (i.contacts || []).some(c => String(c.id) === String(p.customerId)) ||
          String(i.customerId) === String(p.customerId)
        )
      );
      
      if (brokerInteractions.length > 0) {
        doc.addPage();
        y = PDFGenerator.addHeader(doc, 'Related Communications', broker.name, 2);
        const intRows = brokerInteractions
          .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
          .slice(0, 30)
          .map((int, i) => {
            // Get contact names from contacts array
            const contactNames = (int.contacts || []).map(c => c.name).join(', ') || 'Unknown';
            
            // Get type label (short)
            const typeLabels = {
              call: 'Call', whatsapp: 'WA', sms: 'SMS', 
              email: 'Email', meeting: 'Meet', site_visit: 'Visit', other: 'Other'
            };
            const typeLabel = typeLabels[int.type] || int.type || 'Note';
            
            // Format date and time
            const dateStr = formatDate(int.date || int.createdAt);
            const timeStr = int.time ? ` ${int.time}` : '';
            const dateTime = `${dateStr}${timeStr}`;
            
            // Get full notes (250+ chars)
            let fullNotes = '';
            if (int.subject) fullNotes = int.subject;
            if (int.notes) fullNotes = fullNotes ? `${fullNotes} - ${int.notes}` : int.notes;
            if (int.outcome && int.outcome !== int.notes) {
              fullNotes = fullNotes ? `${fullNotes} | Outcome: ${int.outcome}` : int.outcome;
            }
            fullNotes = fullNotes || 'No details';
            
            return [
              i + 1, 
              dateTime,
              contactNames.substring(0, 25),
              typeLabel, 
              fullNotes.substring(0, 300)
            ];
          });
        PDFGenerator.addTable(doc, ['#', 'Date/Time', 'Contact', 'Type', 'Notes'], intRows, y, { 
          colWidths: [10, 32, 40, 16, 94], 
          fontSize: 7,
          wrapColumns: [4] // Enable word wrap for Notes column
        });
      }

      PDFGenerator.addFooter(doc);
      doc.save(`Broker_${broker.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('Broker report generated successfully');
    } catch (error) {
      console.error(error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally { setIsGenerating(false); }
  };

  const generateProjectReport = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);
      
      // Use masterProjectMetrics if available
      if (!masterProjectMetrics) {
        showNotification('No project data available', 'error');
        setIsGenerating(false);
        return;
      }

      const { summary, customerBreakdown, transactionCount, customerCount } = masterProjectMetrics;

      // Header
      let y = PDFGenerator.addHeader(doc, 'Master Project Report', selectedProject);
      
      // Executive Summary Row
      y = PDFGenerator.addSectionTitle(doc, 'Executive Summary', y);
      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Transactions', value: String(transactionCount), color: COLORS.darkBlue.rgb },
        { label: 'Customers', value: String(customerCount), color: COLORS.info.rgb },
        { label: 'Collection Rate', value: summary.collectionRate.toFixed(1) + '%', color: COLORS.success.rgb },
      ], y);

      // Financial Summary
      y = PDFGenerator.addSectionTitle(doc, 'Financial Overview', y);
      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Total Sale', value: formatCurrency(summary.totalSale), color: COLORS.darkBlue.rgb },
        { label: 'Received', value: formatCurrency(summary.totalReceived), color: COLORS.success.rgb },
        { label: 'Receivable', value: formatCurrency(summary.totalReceivable), color: COLORS.warning.rgb },
      ], y);

      // Due Now vs Future Receivable Section
      y += 4;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
      
      // Due Now (Overdue) - Left side
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('DUE NOW (OVERDUE)', margin + 8, y + 8);
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38); // Red
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(summary.totalOverdue), margin + 8, y + 18);
      
      // Future Receivable - Right side
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont(undefined, 'normal');
      doc.text('FUTURE RECEIVABLE', margin + contentWidth/2 + 8, y + 8);
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(summary.totalFuture), margin + contentWidth/2 + 8, y + 18);
      
      // Divider line
      doc.setDrawColor(209, 213, 219);
      doc.line(margin + contentWidth/2, y + 4, margin + contentWidth/2, y + 20);
      
      doc.setFont(undefined, 'normal');
      y += 30;

      // Customer-wise Breakdown
      y = PDFGenerator.addSectionTitle(doc, 'Customer-wise Breakdown', y);
      
      // Simplified table with better column widths
      const colWidths = [8, 48, 12, 28, 28, 26, 26, 16]; // Total = 192 (fits in content width)
      const headers = ['#', 'Customer', 'Units', 'Sale', 'Received', 'Due Now', 'Future', '%'];
      
      // Table header
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(7);
      doc.setTextColor(55, 65, 81);
      doc.setFont(undefined, 'bold');
      
      let xPos = margin + 2;
      headers.forEach((header, i) => {
        doc.text(header, xPos, y + 5);
        xPos += colWidths[i];
      });
      y += 10;
      
      // Table rows
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      
      customerBreakdown.forEach((c, idx) => {
        // Check for page break
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        // Alternate row colors
        if (idx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(249, 250, 251);
        }
        doc.rect(margin, y - 4, contentWidth, 8, 'F');
        
        doc.setTextColor(31, 41, 55);
        xPos = margin + 2;
        
        // Row data - truncate customer name properly
        const customerName = (c.name || 'Unknown');
        const truncatedName = customerName.length > 28 ? customerName.substring(0, 26) + '..' : customerName;
        
        const rowData = [
          String(idx + 1),
          truncatedName,
          String(c.unitCount),
          formatCurrency(c.totalSale),
          formatCurrency(c.totalReceived),
          formatCurrency(c.totalOverdue),
          formatCurrency(c.totalFuture),
          c.collectionRate.toFixed(0) + '%'
        ];
        
        rowData.forEach((cell, i) => {
          // Color coding for Due Now
          if (i === 5 && c.totalOverdue > 0) {
            doc.setTextColor(220, 38, 38);
          } else if (i === 6) {
            doc.setTextColor(37, 99, 235);
          } else {
            doc.setTextColor(31, 41, 55);
          }
          doc.text(String(cell), xPos, y);
          xPos += colWidths[i];
        });
        y += 7;
      });

      // Totals row
      y += 2;
      doc.setFillColor(30, 58, 95);
      doc.rect(margin, y - 4, contentWidth, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      
      xPos = margin + 2;
      const totals = [
        '',
        'TOTAL',
        String(customerBreakdown.reduce((s, c) => s + c.unitCount, 0)),
        formatCurrency(summary.totalSale),
        formatCurrency(summary.totalReceived),
        formatCurrency(summary.totalOverdue),
        formatCurrency(summary.totalFuture),
        summary.collectionRate.toFixed(0) + '%'
      ];
      
      totals.forEach((cell, i) => {
        doc.text(cell, xPos, y + 1);
        xPos += colWidths[i];
      });

      PDFGenerator.addFooter(doc);
      doc.save(`Project_${selectedProject.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('Project report generated successfully');
    } catch (error) {
      console.error(error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally { setIsGenerating(false); }
  };

  const generateInventoryReport = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      let y = PDFGenerator.addHeader(doc, 'Complete Inventory Report', `${inventory.length} Total Units`);
      y = PDFGenerator.addSectionTitle(doc, 'Portfolio Overview', y);

      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Total Units', value: String(pipelineMetrics.totalUnits), color: COLORS.darkBlue.rgb },
        { label: 'Available', value: String(pipelineMetrics.availableUnits), color: COLORS.success.rgb },
        { label: 'Sold', value: String(pipelineMetrics.soldUnits), color: COLORS.warning.rgb },
        { label: 'Reserved', value: String(pipelineMetrics.reservedUnits), color: COLORS.info.rgb },
      ], y);

      y += 5;
      Object.entries(pipelineMetrics.byProject).forEach(([name, data]) => {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
        doc.text(name, 14, y); y += 8;
        doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
        doc.text(`Total: ${data.total} | Available: ${data.available} | Sold: ${data.sold} | Reserved: ${data.reserved}`, 14, y); y += 6;
        doc.text(`Value: ${formatCurrency(data.totalValue)} | Sold: ${formatCurrency(data.soldValue)}`, 14, y); y += 12;
      });

      PDFGenerator.addFooter(doc);
      doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('Inventory report generated successfully');
    } catch (error) {
      console.error(error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally { setIsGenerating(false); }
  };

  const generateFinancialReport = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      let y = PDFGenerator.addHeader(doc, 'Financial Portfolio Report', 'Executive Summary');
      y = PDFGenerator.addSectionTitle(doc, 'Portfolio Performance', y);

      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Portfolio Value', value: formatCurrency(portfolioMetrics.totalSale), color: COLORS.darkBlue.rgb },
        { label: 'Collected', value: formatCurrency(portfolioMetrics.totalReceived), color: COLORS.success.rgb },
        { label: 'Outstanding', value: formatCurrency(portfolioMetrics.totalReceivable), color: COLORS.warning.rgb },
        { label: 'Collection Rate', value: formatPercentage(portfolioMetrics.collectionRate), color: COLORS.royalBlue.rgb },
      ], y);

      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Overdue', value: formatCurrency(portfolioMetrics.totalOverdue), subtext: `${formatPercentage(portfolioMetrics.overduePercentage)} of receivable`, color: COLORS.danger.rgb },
        { label: 'Future Due', value: formatCurrency(portfolioMetrics.totalFuture), color: COLORS.info.rgb },
        { label: 'Active Txns', value: String(portfolioMetrics.activeTransactions), color: COLORS.darkBlue.rgb },
        { label: 'Customers', value: String(customers.length), color: COLORS.gray.rgb },
      ], y);

      y = PDFGenerator.addSectionTitle(doc, 'Aging Analysis', y);
      y = PDFGenerator.addAgingChart(doc, aging, y);

      doc.addPage();
      y = PDFGenerator.addHeader(doc, 'Risk Portfolio', 'Top Debtors', 2);

      y = PDFGenerator.addKPIRow(doc, [
        { label: 'Critical Risk', value: String(riskPortfolio.critical.length), color: COLORS.danger.rgb },
        { label: 'High Risk', value: String(riskPortfolio.high.length), color: [234, 88, 12] },
        { label: 'Medium Risk', value: String(riskPortfolio.medium.length), color: COLORS.warning.rgb },
        { label: 'Low Risk', value: String(riskPortfolio.low.length), color: COLORS.success.rgb },
      ], y);

      if (riskPortfolio.topDebtors.length > 0) {
        y = PDFGenerator.addSectionTitle(doc, 'Top 10 Debtors by Risk', y);
        const rows = riskPortfolio.topDebtors.map((d, i) => [i + 1, d.customer.name, d.customer.phone || '-', formatCurrency(d.totalReceivable), formatCurrency(d.totalOverdue), `${d.riskScore}/100`, d.riskLevel]);
        PDFGenerator.addTable(doc, ['#', 'Customer', 'Phone', 'Outstanding', 'Overdue', 'Score', 'Risk'], rows, y, { colWidths: [10, 50, 35, 35, 30, 25, 25] });
      }

      PDFGenerator.addFooter(doc);
      doc.save(`Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('Financial report generated successfully');
    } catch (error) {
      console.error(error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally { setIsGenerating(false); }
  };

  const handleGenerateReport = async (type) => {
    switch (type) {
      case 'Customer': if (!selectedCustomer) return showNotification('Select a customer first', 'error'); await generateCustomerReport(); break;
      case 'Broker': if (!selectedBroker) return showNotification('Select a broker first', 'error'); await generateBrokerReport(); break;
      case 'Project': if (!selectedProject) return showNotification('Select a project first', 'error'); await generateProjectReport(); break;
      case 'Inventory': await generateInventoryReport(); break;
      case 'Financial': await generateFinancialReport(); break;
      default: showNotification('Unknown report type', 'error');
    }
  };

  // ========== RENDER ==========
  return (
    <div style={styles.container}>
      {notification && (
        <div style={{ ...styles.notification, backgroundColor: notification.type === 'success' ? COLORS.success.hex : COLORS.danger.hex }}>
          {notification.type === 'success' ? '✓' : '⚠'} {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>Executive Command Center</h1>
            <p style={styles.subtitle}>Real-time portfolio intelligence for strategic decision-making</p>
          </div>
          <div style={styles.headerBadge}><span>⚡</span><span>Live Dashboard</span></div>
        </div>

        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}><span style={styles.kpiLabel}>Portfolio Value</span><span style={{ ...styles.kpiTrend, color: COLORS.success.hex }}>↗</span></div>
            <div style={styles.kpiValue}>{formatCurrency(portfolioMetrics.totalSale)}</div>
            <div style={styles.kpiProgress}><div style={{ ...styles.kpiProgressBar, width: `${portfolioMetrics.collectionRate}%`, backgroundColor: portfolioMetrics.collectionRate > 70 ? COLORS.success.hex : portfolioMetrics.collectionRate > 40 ? COLORS.warning.hex : COLORS.danger.hex }} /></div>
            <div style={styles.kpiMeta}>{formatPercentage(portfolioMetrics.collectionRate)} collected</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}><span style={styles.kpiLabel}>Outstanding Recovery</span><span style={{ ...styles.kpiTrend, color: COLORS.warning.hex }}>⚡</span></div>
            <div style={{ ...styles.kpiValue, color: COLORS.warning.hex }}>{formatCurrency(portfolioMetrics.totalReceivable)}</div>
            <div style={styles.kpiMeta}>{portfolioMetrics.activeTransactions} active transactions</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}><span style={styles.kpiLabel}>High-Risk Exposure</span><span style={{ ...styles.kpiTrend, color: COLORS.danger.hex }}>⚠</span></div>
            <div style={{ ...styles.kpiValue, color: COLORS.danger.hex }}>{formatCurrency(portfolioMetrics.totalOverdue)}</div>
            <div style={styles.kpiMeta}>{formatPercentage(portfolioMetrics.overduePercentage)} of receivable</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}><span style={styles.kpiLabel}>Future Pipeline</span><span style={{ ...styles.kpiTrend, color: COLORS.info.hex }}>→</span></div>
            <div style={{ ...styles.kpiValue, color: COLORS.info.hex }}>{formatCurrency(portfolioMetrics.totalFuture)}</div>
            <div style={styles.kpiMeta}>Expected collections</div>
          </div>
        </div>
      </div>

      <div style={styles.tabContainer}>
        {[
          { id: 'command-center', label: 'Command Center', icon: '🎯' },
          { id: 'customer', label: 'Customer Intel', icon: '👤' },
          { id: 'broker', label: 'Broker Analytics', icon: '🤝' },
          { id: 'project', label: 'Project Status', icon: '🏗️' },
          { id: 'inventory', label: 'Inventory', icon: '📦' },
          { id: 'financial', label: 'Financial', icon: '💰' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === 'command-center' && (
          <div style={styles.dashboardGrid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}><div style={styles.cardTitleGroup}><span style={styles.cardIcon}>📊</span><div><h3 style={styles.cardTitle}>What's Happening</h3><p style={styles.cardSubtitle}>Aging Analysis</p></div></div></div>
              <div style={styles.agingContainer}>
                {[
                  { label: 'Current', data: aging.current, color: COLORS.success.hex },
                  { label: '1-30 Days', data: aging.days1_30, color: COLORS.royalBlue.hex },
                  { label: '31-60 Days', data: aging.days31_60, color: COLORS.warning.hex },
                  { label: '61-90 Days', data: aging.days61_90, color: '#EA580C' },
                  { label: '91-120 Days', data: aging.days91_120, color: COLORS.danger.hex },
                  { label: '120+ Days', data: aging.over120, color: '#7F1D1D' },
                ].map(item => (
                  <div key={item.label} style={styles.agingRow}>
                    <div style={styles.agingLabel}><span style={{ ...styles.agingDot, backgroundColor: item.color }} /><span>{item.label}</span></div>
                    <div style={styles.agingBarContainer}><div style={{ ...styles.agingBar, width: `${aging.total.amount > 0 ? (item.data.amount / aging.total.amount * 100) : 0}%`, backgroundColor: item.color }} /></div>
                    <div style={styles.agingValue}>{formatCurrency(item.data.amount)}</div>
                    <div style={styles.agingCount}>{item.data.count}</div>
                  </div>
                ))}
                <div style={styles.agingTotal}><span style={styles.agingTotalLabel}>Total Receivable</span><span style={styles.agingTotalValue}>{formatCurrency(aging.total.amount)}</span></div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}><div style={styles.cardTitleGroup}><span style={styles.cardIcon}>⚠️</span><div><h3 style={styles.cardTitle}>Why It's Happening</h3><p style={styles.cardSubtitle}>Risk Portfolio</p></div></div></div>
              <div style={styles.riskGrid}>
                <div style={{ ...styles.riskCard, borderLeftColor: COLORS.danger.hex }}><div style={styles.riskCount}>{riskPortfolio.critical.length}</div><div style={styles.riskLabel}>Critical</div></div>
                <div style={{ ...styles.riskCard, borderLeftColor: '#EA580C' }}><div style={styles.riskCount}>{riskPortfolio.high.length}</div><div style={styles.riskLabel}>High</div></div>
                <div style={{ ...styles.riskCard, borderLeftColor: COLORS.warning.hex }}><div style={styles.riskCount}>{riskPortfolio.medium.length}</div><div style={styles.riskLabel}>Medium</div></div>
                <div style={{ ...styles.riskCard, borderLeftColor: COLORS.success.hex }}><div style={styles.riskCount}>{riskPortfolio.low.length}</div><div style={styles.riskLabel}>Low</div></div>
              </div>
              <div style={styles.debtorList}>
                {riskPortfolio.topDebtors.slice(0, 5).map((debtor, idx) => (
                  <div key={debtor.customer.id} style={styles.debtorRow}>
                    <div style={styles.debtorRank}>{idx + 1}</div>
                    <div style={styles.debtorInfo}><div style={styles.debtorName}>{debtor.customer.name}</div><div style={styles.debtorMeta}>{debtor.transactionCount} txns</div></div>
                    <div style={styles.debtorStats}>
                      <div style={styles.debtorAmount}>{formatCurrency(debtor.totalReceivable)}</div>
                      <div style={{ ...styles.debtorRiskBadge, backgroundColor: debtor.riskLevel === 'Critical' ? COLORS.danger.hex : debtor.riskLevel === 'High' ? '#EA580C' : debtor.riskLevel === 'Medium' ? COLORS.warning.hex : COLORS.success.hex }}>{debtor.riskLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}><div style={styles.cardTitleGroup}><span style={styles.cardIcon}>🚀</span><div><h3 style={styles.cardTitle}>Take Action</h3><p style={styles.cardSubtitle}>Generate Reports</p></div></div></div>
              <div style={styles.actionGrid}>
                <button onClick={() => handleGenerateReport('Financial')} disabled={isGenerating} style={styles.actionButton}><span style={styles.actionIcon}>💰</span><div style={styles.actionContent}><div style={styles.actionTitle}>Financial Report</div><div style={styles.actionDesc}>Complete portfolio analysis</div></div></button>
                <button onClick={() => handleGenerateReport('Inventory')} disabled={isGenerating} style={styles.actionButton}><span style={styles.actionIcon}>📦</span><div style={styles.actionContent}><div style={styles.actionTitle}>Inventory Report</div><div style={styles.actionDesc}>Project-wise breakdown</div></div></button>
                <button onClick={() => setActiveTab('customer')} style={styles.actionButton}><span style={styles.actionIcon}>👤</span><div style={styles.actionContent}><div style={styles.actionTitle}>Customer Report</div><div style={styles.actionDesc}>Individual portfolio</div></div></button>
                <button onClick={() => setActiveTab('broker')} style={styles.actionButton}><span style={styles.actionIcon}>🤝</span><div style={styles.actionContent}><div style={styles.actionTitle}>Broker Report</div><div style={styles.actionDesc}>Performance analysis</div></div></button>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}><div style={styles.cardTitleGroup}><span style={styles.cardIcon}>📈</span><div><h3 style={styles.cardTitle}>Pipeline Status</h3><p style={styles.cardSubtitle}>Inventory Overview</p></div></div></div>
              <div style={styles.pipelineGrid}>
                <div style={styles.pipelineStat}><div style={styles.pipelineValue}>{pipelineMetrics.totalUnits}</div><div style={styles.pipelineLabel}>Total Units</div></div>
                <div style={styles.pipelineStat}><div style={{ ...styles.pipelineValue, color: COLORS.success.hex }}>{pipelineMetrics.availableUnits}</div><div style={styles.pipelineLabel}>Available</div></div>
                <div style={styles.pipelineStat}><div style={{ ...styles.pipelineValue, color: COLORS.warning.hex }}>{pipelineMetrics.soldUnits}</div><div style={styles.pipelineLabel}>Sold</div></div>
                <div style={styles.pipelineStat}><div style={{ ...styles.pipelineValue, color: COLORS.info.hex }}>{pipelineMetrics.reservedUnits}</div><div style={styles.pipelineLabel}>Reserved</div></div>
              </div>
              <div style={styles.projectList}>
                {Object.entries(pipelineMetrics.byProject).slice(0, 4).map(([name, data]) => (
                  <div key={name} style={styles.projectRow}><div style={styles.projectName}>{name}</div><div style={styles.projectStats}><span style={{ color: COLORS.success.hex }}>{data.available}A</span> <span style={{ color: COLORS.warning.hex }}>{data.sold}S</span> <span style={{ color: COLORS.info.hex }}>{data.reserved}R</span></div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customer' && (
          <div style={styles.reportSection}>
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}><div style={styles.reportIconLarge}>👤</div><div><h2 style={styles.reportTitle}>Customer Portfolio Report</h2><p style={styles.reportDesc}>Comprehensive analysis with financial summary, transactions, installments, and risk assessment</p></div></div>
              <div style={styles.selectGroup}><label style={styles.selectLabel}>Select Customer</label><select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={styles.select}><option value="">-- Choose Customer --</option>{customers.filter(c => c.type !== 'broker').map(c => (<option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>))}</select></div>
              <div style={styles.reportIncludes}><h4 style={styles.includesTitle}>Report Contents:</h4><div style={styles.includesList}>{['Executive Summary', 'Transaction Portfolio', 'Installment Schedule', 'Payment History', 'Communication Log', 'Risk Assessment'].map(item => (<span key={item} style={styles.includeItem}>✓ {item}</span>))}</div></div>
              <button onClick={() => handleGenerateReport('Customer')} disabled={isGenerating || !selectedCustomer} style={{ ...styles.generateBtn, opacity: isGenerating || !selectedCustomer ? 0.5 : 1 }}>{isGenerating ? '⏳ Generating...' : '📥 Generate PDF Report'}</button>
            </div>
          </div>
        )}

        {activeTab === 'broker' && (
          <div style={styles.reportSection}>
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}><div style={styles.reportIconLarge}>🤝</div><div><h2 style={styles.reportTitle}>Broker Performance Report</h2><p style={styles.reportDesc}>Detailed analysis of brokered transactions, commission tracking, and performance metrics</p></div></div>
              <div style={styles.selectGroup}><label style={styles.selectLabel}>Select Broker</label><select value={selectedBroker} onChange={(e) => setSelectedBroker(e.target.value)} style={styles.select}><option value="">-- Choose Broker --</option>{brokers.map(b => (<option key={b.id} value={b.id}>{b.name} {b.phone ? `(${b.phone})` : ''}</option>))}</select></div>
              <div style={styles.reportIncludes}><h4 style={styles.includesTitle}>Report Contents:</h4><div style={styles.includesList}>{['Performance Summary', 'Commission Analysis', 'All Transactions', 'Recovery Status', 'Customer Portfolio', 'Performance Score'].map(item => (<span key={item} style={styles.includeItem}>✓ {item}</span>))}</div></div>
              <button onClick={() => handleGenerateReport('Broker')} disabled={isGenerating || !selectedBroker} style={{ ...styles.generateBtn, opacity: isGenerating || !selectedBroker ? 0.5 : 1 }}>{isGenerating ? '⏳ Generating...' : '📥 Generate PDF Report'}</button>
            </div>
          </div>
        )}

        {activeTab === 'project' && (
          <div style={styles.reportSection}>
            {/* Project Selector */}
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}>
                <div style={styles.reportIconLarge}>🏗️</div>
                <div>
                  <h2 style={styles.reportTitle}>Master Project Report</h2>
                  <p style={styles.reportDesc}>Consolidated financials with customer-wise breakdown</p>
                </div>
              </div>
              <div style={styles.selectGroup}>
                <label style={styles.selectLabel}>Select Project</label>
                <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={styles.select}>
                  <option value="">-- Choose Project --</option>
                  {projectNames.map(name => (<option key={name} value={name}>{name}</option>))}
                </select>
              </div>
            </div>

            {/* Master Project Dashboard - Only show when project selected */}
            {masterProjectMetrics && (
              <div style={styles.masterContainer}>
                {/* Project Header */}
                <div style={styles.masterHeaderRow}>
                  <div>
                    <h3 style={styles.masterProjectName}>{masterProjectMetrics.projectName}</h3>
                    <p style={styles.masterProjectMeta}>
                      {masterProjectMetrics.transactionCount} Transactions • {masterProjectMetrics.customerCount} Customers • {formatPercentage(masterProjectMetrics.summary.collectionRate)} Collection Rate
                    </p>
                  </div>
                  <button onClick={() => handleGenerateReport('Project')} disabled={isGenerating} style={styles.pdfBtn}>
                    {isGenerating ? '⏳' : '📥'} Download PDF
                  </button>
                </div>

                {/* Financial Summary - Full Width Cards Stacked */}
                <div style={styles.finSummaryGrid}>
                  <div style={styles.finSummaryCard}>
                    <span style={styles.finSummaryIcon}>💰</span>
                    <div style={styles.finSummaryContent}>
                      <span style={styles.finSummaryLabel}>Total Sale</span>
                      <span style={styles.finSummaryValue}>{formatCurrency(masterProjectMetrics.summary.totalSale)}</span>
                    </div>
                  </div>
                  <div style={styles.finSummaryCard}>
                    <span style={{...styles.finSummaryIcon, background: '#dcfce7'}}>✅</span>
                    <div style={styles.finSummaryContent}>
                      <span style={styles.finSummaryLabel}>Received</span>
                      <span style={{...styles.finSummaryValue, color: COLORS.success.hex}}>{formatCurrency(masterProjectMetrics.summary.totalReceived)}</span>
                    </div>
                    <span style={styles.finSummaryPercent}>{formatPercentage(masterProjectMetrics.summary.collectionRate)}</span>
                  </div>
                  <div style={styles.finSummaryCard}>
                    <span style={{...styles.finSummaryIcon, background: '#fee2e2'}}>⚠️</span>
                    <div style={styles.finSummaryContent}>
                      <span style={styles.finSummaryLabel}>Due Now (Overdue)</span>
                      <span style={{...styles.finSummaryValue, color: COLORS.danger.hex}}>{formatCurrency(masterProjectMetrics.summary.totalOverdue)}</span>
                    </div>
                  </div>
                  <div style={styles.finSummaryCard}>
                    <span style={{...styles.finSummaryIcon, background: '#dbeafe'}}>📅</span>
                    <div style={styles.finSummaryContent}>
                      <span style={styles.finSummaryLabel}>Future Receivable</span>
                      <span style={{...styles.finSummaryValue, color: COLORS.royalBlue.hex}}>{formatCurrency(masterProjectMetrics.summary.totalFuture)}</span>
                    </div>
                  </div>
                </div>

                {/* Total Receivable Banner */}
                <div style={styles.receivableBanner}>
                  <div style={styles.receivableBannerMain}>
                    <span style={styles.receivableBannerLabel}>Total Receivable</span>
                    <span style={styles.receivableBannerValue}>{formatCurrency(masterProjectMetrics.summary.totalReceivable)}</span>
                  </div>
                  <div style={styles.receivableBannerBreakdown}>
                    <div style={styles.receivableBannerItem}>
                      <div style={{...styles.receivableBannerBar, background: COLORS.danger.hex, width: `${masterProjectMetrics.summary.totalReceivable > 0 ? Math.min(100, (masterProjectMetrics.summary.totalOverdue / masterProjectMetrics.summary.totalReceivable * 100)) : 0}%`}} />
                      <span>⚠️ Overdue: {formatCurrency(masterProjectMetrics.summary.totalOverdue)}</span>
                    </div>
                    <div style={styles.receivableBannerItem}>
                      <div style={{...styles.receivableBannerBar, background: COLORS.royalBlue.hex, width: `${masterProjectMetrics.summary.totalReceivable > 0 ? Math.min(100, (masterProjectMetrics.summary.totalFuture / masterProjectMetrics.summary.totalReceivable * 100)) : 0}%`}} />
                      <span>📅 Future: {formatCurrency(masterProjectMetrics.summary.totalFuture)}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Breakdown Table */}
                <div style={styles.customerTableCard}>
                  <div style={styles.customerTableHeader}>
                    <h4 style={styles.customerTableTitle}>👥 Customer-wise Breakdown</h4>
                    <span style={styles.customerTableMeta}>{masterProjectMetrics.customerBreakdown.length} customers</span>
                  </div>
                  <div style={styles.customerTableWrapper}>
                    <table style={styles.customerTable}>
                      <thead>
                        <tr>
                          <th style={styles.custTh}>Customer</th>
                          <th style={styles.custThC}>Units</th>
                          <th style={styles.custThR}>Sale</th>
                          <th style={styles.custThR}>Received</th>
                          <th style={styles.custThR}>Due Now</th>
                          <th style={styles.custThR}>Future</th>
                          <th style={styles.custThR}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterProjectMetrics.customerBreakdown.map((customer, idx) => (
                          <tr key={customer.id || idx} style={idx % 2 === 0 ? styles.custTrEven : styles.custTrOdd}>
                            <td style={styles.custTd}>
                              <div style={styles.custName}>{customer.name}</div>
                              {customer.phone && <div style={styles.custPhone}>{customer.phone}</div>}
                            </td>
                            <td style={styles.custTdC}>{customer.unitCount}</td>
                            <td style={styles.custTdR}>{formatCurrency(customer.totalSale)}</td>
                            <td style={{...styles.custTdR, color: COLORS.success.hex}}>{formatCurrency(customer.totalReceived)}</td>
                            <td style={{...styles.custTdR, color: customer.totalOverdue > 0 ? COLORS.danger.hex : COLORS.gray.hex}}>{formatCurrency(customer.totalOverdue)}</td>
                            <td style={{...styles.custTdR, color: COLORS.royalBlue.hex}}>{formatCurrency(customer.totalFuture)}</td>
                            <td style={{...styles.custTdR, fontWeight: '600'}}>{formatCurrency(customer.totalReceivable)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={styles.custTfoot}>
                          <td style={styles.custTfTd}>TOTAL</td>
                          <td style={styles.custTfTdC}>{masterProjectMetrics.customerBreakdown.reduce((s, c) => s + c.unitCount, 0)}</td>
                          <td style={styles.custTfTdR}>{formatCurrency(masterProjectMetrics.summary.totalSale)}</td>
                          <td style={styles.custTfTdR}>{formatCurrency(masterProjectMetrics.summary.totalReceived)}</td>
                          <td style={styles.custTfTdR}>{formatCurrency(masterProjectMetrics.summary.totalOverdue)}</td>
                          <td style={styles.custTfTdR}>{formatCurrency(masterProjectMetrics.summary.totalFuture)}</td>
                          <td style={styles.custTfTdR}>{formatCurrency(masterProjectMetrics.summary.totalReceivable)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state when no project selected */}
            {!selectedProject && (
              <div style={styles.emptyProjectState}>
                <div style={styles.emptyIcon}>🏗️</div>
                <h3>Select a project to view details</h3>
                <p>Choose a project from the dropdown above to see consolidated financials and customer breakdown</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div style={styles.reportSection}>
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}><div style={styles.reportIconLarge}>📦</div><div><h2 style={styles.reportTitle}>Complete Inventory Report</h2><p style={styles.reportDesc}>Full inventory listing across all projects with valuations and status</p></div></div>
              <div style={styles.inventoryPreview}><div style={styles.previewStat}><div style={styles.previewValue}>{pipelineMetrics.totalUnits}</div><div style={styles.previewLabel}>Total</div></div><div style={styles.previewStat}><div style={{ ...styles.previewValue, color: COLORS.success.hex }}>{pipelineMetrics.availableUnits}</div><div style={styles.previewLabel}>Available</div></div><div style={styles.previewStat}><div style={{ ...styles.previewValue, color: COLORS.warning.hex }}>{pipelineMetrics.soldUnits}</div><div style={styles.previewLabel}>Sold</div></div><div style={styles.previewStat}><div style={{ ...styles.previewValue, color: COLORS.info.hex }}>{pipelineMetrics.reservedUnits}</div><div style={styles.previewLabel}>Reserved</div></div></div>
              <button onClick={() => handleGenerateReport('Inventory')} disabled={isGenerating} style={{ ...styles.generateBtn, opacity: isGenerating ? 0.5 : 1 }}>{isGenerating ? '⏳ Generating...' : '📥 Generate PDF Report'}</button>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div style={styles.reportSection}>
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}><div style={styles.reportIconLarge}>💰</div><div><h2 style={styles.reportTitle}>Consolidated Financial Report</h2><p style={styles.reportDesc}>Executive-level portfolio summary with aging analysis and risk assessment</p></div></div>
              <div style={styles.inventoryPreview}><div style={styles.previewStat}><div style={styles.previewValue}>{formatCurrency(portfolioMetrics.totalSale)}</div><div style={styles.previewLabel}>Portfolio</div></div><div style={styles.previewStat}><div style={{ ...styles.previewValue, color: COLORS.success.hex }}>{formatCurrency(portfolioMetrics.totalReceived)}</div><div style={styles.previewLabel}>Collected</div></div><div style={styles.previewStat}><div style={{ ...styles.previewValue, color: COLORS.danger.hex }}>{formatCurrency(portfolioMetrics.totalOverdue)}</div><div style={styles.previewLabel}>Overdue</div></div><div style={styles.previewStat}><div style={{ ...styles.previewValue, color: COLORS.royalBlue.hex }}>{formatPercentage(portfolioMetrics.collectionRate)}</div><div style={styles.previewLabel}>Rate</div></div></div>
              <button onClick={() => handleGenerateReport('Financial')} disabled={isGenerating} style={{ ...styles.generateBtn, opacity: isGenerating ? 0.5 : 1 }}>{isGenerating ? '⏳ Generating...' : '📥 Generate PDF Report'}</button>
            </div>
          </div>
        )}
      </div>

      {isGenerating && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}><div style={styles.loadingSpinner}>⏳</div><h3 style={styles.loadingTitle}>Generating Executive Report</h3><p style={styles.loadingText}>Compiling comprehensive analysis...</p></div>
        </div>
      )}
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: { padding: '24px', backgroundColor: COLORS.light.hex, minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  notification: { position: 'fixed', top: '20px', right: '20px', padding: '12px 20px', borderRadius: '8px', color: COLORS.white.hex, fontWeight: '500', fontSize: '14px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  header: { background: `linear-gradient(135deg, ${COLORS.navy.hex} 0%, ${COLORS.darkBlue.hex} 100%)`, borderRadius: '16px', padding: '28px', marginBottom: '24px', color: COLORS.white.hex },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0 },
  subtitle: { fontSize: '14px', opacity: 0.8, marginTop: '4px' },
  headerBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: '500' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  kpiCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', backdropFilter: 'blur(10px)' },
  kpiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  kpiLabel: { fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff' },
  kpiTrend: { fontSize: '14px', fontWeight: '600' },
  kpiValue: { fontSize: '20px', fontWeight: '700', marginBottom: '6px', color: '#fff' },
  kpiProgress: { height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', marginBottom: '6px', overflow: 'hidden' },
  kpiProgressBar: { height: '100%', borderRadius: '2px', transition: 'width 0.5s ease' },
  kpiMeta: { fontSize: '10px', opacity: 0.7, color: '#fff' },
  tabContainer: { display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: COLORS.white.hex, border: `1px solid ${COLORS.lightGray.hex}`, borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: COLORS.gray.hex, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' },
  tabActive: { backgroundColor: COLORS.darkBlue.hex, borderColor: COLORS.darkBlue.hex, color: COLORS.white.hex, boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)' },
  content: { minHeight: '500px' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  card: { backgroundColor: COLORS.white.hex, borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: `1px solid ${COLORS.lightGray.hex}`, overflow: 'hidden' },
  cardHeader: { marginBottom: '16px' },
  cardTitleGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardIcon: { fontSize: '24px' },
  cardTitle: { fontSize: '15px', fontWeight: '600', color: COLORS.dark.hex, margin: 0 },
  cardSubtitle: { fontSize: '11px', color: COLORS.gray.hex, margin: 0 },
  agingContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
  agingRow: { display: 'grid', gridTemplateColumns: '90px 1fr 80px 30px', alignItems: 'center', gap: '8px' },
  agingLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: COLORS.dark.hex },
  agingDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  agingBarContainer: { height: '6px', backgroundColor: COLORS.lightGray.hex, borderRadius: '3px', overflow: 'hidden' },
  agingBar: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  agingValue: { fontSize: '12px', fontWeight: '600', color: COLORS.dark.hex, textAlign: 'right' },
  agingCount: { fontSize: '10px', color: COLORS.gray.hex, textAlign: 'right' },
  agingTotal: { display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px solid ${COLORS.lightGray.hex}`, marginTop: '6px' },
  agingTotalLabel: { fontSize: '13px', fontWeight: '600', color: COLORS.dark.hex },
  agingTotalValue: { fontSize: '14px', fontWeight: '700', color: COLORS.darkBlue.hex },
  riskGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' },
  riskCard: { padding: '10px', backgroundColor: COLORS.light.hex, borderRadius: '8px', borderLeft: '3px solid', textAlign: 'center' },
  riskCount: { fontSize: '18px', fontWeight: '700', color: COLORS.dark.hex },
  riskLabel: { fontSize: '10px', color: COLORS.gray.hex, marginTop: '2px' },
  debtorList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  debtorRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: COLORS.light.hex, borderRadius: '8px' },
  debtorRank: { width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white.hex, borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: COLORS.gray.hex },
  debtorInfo: { flex: 1, minWidth: 0 },
  debtorName: { fontSize: '12px', fontWeight: '600', color: COLORS.dark.hex, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  debtorMeta: { fontSize: '10px', color: COLORS.gray.hex },
  debtorStats: { textAlign: 'right', flexShrink: 0 },
  debtorAmount: { fontSize: '12px', fontWeight: '600', color: COLORS.dark.hex },
  debtorRiskBadge: { fontSize: '9px', fontWeight: '600', color: COLORS.white.hex, padding: '2px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  actionButton: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: COLORS.white.hex, border: `1px solid ${COLORS.lightGray.hex}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left' },
  actionIcon: { fontSize: '20px' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: '12px', fontWeight: '600', color: COLORS.dark.hex },
  actionDesc: { fontSize: '10px', color: COLORS.gray.hex },
  pipelineGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' },
  pipelineStat: { textAlign: 'center', padding: '10px', backgroundColor: COLORS.light.hex, borderRadius: '8px' },
  pipelineValue: { fontSize: '18px', fontWeight: '700', color: COLORS.dark.hex },
  pipelineLabel: { fontSize: '11px', color: COLORS.gray.hex, marginTop: '2px' },
  projectList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  projectRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: COLORS.light.hex, borderRadius: '8px' },
  projectName: { fontSize: '13px', fontWeight: '500', color: COLORS.dark.hex },
  projectStats: { fontSize: '12px', fontWeight: '500', display: 'flex', gap: '8px' },
  reportSection: { display: 'flex', justifyContent: 'center' },
  reportCard: { backgroundColor: COLORS.white.hex, borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  reportHeader: { display: 'flex', gap: '20px', marginBottom: '28px' },
  reportIconLarge: { fontSize: '48px' },
  reportTitle: { fontSize: '22px', fontWeight: '700', color: COLORS.dark.hex, margin: 0 },
  reportDesc: { fontSize: '14px', color: COLORS.gray.hex, marginTop: '8px', lineHeight: '1.5' },
  selectGroup: { marginBottom: '24px' },
  selectLabel: { display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.dark.hex, marginBottom: '8px' },
  select: { width: '100%', padding: '12px 16px', fontSize: '15px', border: `1px solid ${COLORS.lightGray.hex}`, borderRadius: '10px', backgroundColor: COLORS.white.hex, color: COLORS.dark.hex, cursor: 'pointer' },
  reportIncludes: { backgroundColor: COLORS.light.hex, borderRadius: '12px', padding: '20px', marginBottom: '24px' },
  includesTitle: { fontSize: '14px', fontWeight: '600', color: COLORS.dark.hex, marginBottom: '12px' },
  includesList: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  includeItem: { fontSize: '13px', color: COLORS.success.hex },
  generateBtn: { width: '100%', padding: '16px', backgroundColor: COLORS.darkBlue.hex, color: COLORS.white.hex, border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' },
  inventoryPreview: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  previewStat: { textAlign: 'center', padding: '16px', backgroundColor: COLORS.light.hex, borderRadius: '10px' },
  previewValue: { fontSize: '18px', fontWeight: '700', color: COLORS.dark.hex },
  previewLabel: { fontSize: '12px', color: COLORS.gray.hex, marginTop: '4px' },
  loadingOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  loadingContent: { textAlign: 'center' },
  loadingSpinner: { fontSize: '48px', marginBottom: '16px' },
  loadingTitle: { fontSize: '18px', fontWeight: '600', color: COLORS.dark.hex, marginBottom: '8px' },
  loadingText: { fontSize: '14px', color: COLORS.gray.hex },
  
  // ========== MASTER PROJECT STYLES - VERTICAL LAYOUT ==========
  masterContainer: { marginTop: '16px' },
  masterHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: COLORS.white.hex, borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  masterProjectName: { fontSize: '24px', fontWeight: '700', color: COLORS.navy.hex, margin: '0 0 8px 0' },
  masterProjectMeta: { fontSize: '14px', color: COLORS.gray.hex, margin: 0 },
  pdfBtn: { padding: '12px 20px', background: `linear-gradient(135deg, ${COLORS.navy.hex}, ${COLORS.darkBlue.hex})`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },

  finSummaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' },
  finSummaryCard: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: COLORS.white.hex, borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  finSummaryIcon: { width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  finSummaryContent: { flex: 1 },
  finSummaryLabel: { display: 'block', fontSize: '12px', color: COLORS.gray.hex, marginBottom: '4px' },
  finSummaryValue: { display: 'block', fontSize: '20px', fontWeight: '700', color: COLORS.dark.hex },
  finSummaryPercent: { fontSize: '14px', fontWeight: '600', color: COLORS.success.hex, background: '#dcfce7', padding: '4px 10px', borderRadius: '6px' },

  receivableBanner: { backgroundColor: COLORS.navy.hex, borderRadius: '12px', padding: '20px', marginBottom: '16px', color: '#fff' },
  receivableBannerMain: { marginBottom: '16px' },
  receivableBannerLabel: { display: 'block', fontSize: '13px', opacity: 0.8, marginBottom: '4px' },
  receivableBannerValue: { fontSize: '32px', fontWeight: '700' },
  receivableBannerBreakdown: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  receivableBannerItem: { },
  receivableBannerBar: { height: '8px', borderRadius: '4px', marginBottom: '8px' },

  customerTableCard: { backgroundColor: COLORS.white.hex, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  customerTableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  customerTableTitle: { fontSize: '16px', fontWeight: '600', color: COLORS.dark.hex, margin: 0 },
  customerTableMeta: { fontSize: '13px', color: COLORS.gray.hex },
  customerTableWrapper: { overflowX: 'auto' },
  customerTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  custTh: { padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: COLORS.dark.hex, borderBottom: `2px solid ${COLORS.lightGray.hex}`, backgroundColor: '#f8fafc' },
  custThC: { padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: COLORS.dark.hex, borderBottom: `2px solid ${COLORS.lightGray.hex}`, backgroundColor: '#f8fafc' },
  custThR: { padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: COLORS.dark.hex, borderBottom: `2px solid ${COLORS.lightGray.hex}`, backgroundColor: '#f8fafc' },
  custTrEven: { backgroundColor: '#fff' },
  custTrOdd: { backgroundColor: '#fafbfc' },
  custTd: { padding: '12px 16px', borderBottom: `1px solid #f1f5f9` },
  custTdC: { padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid #f1f5f9` },
  custTdR: { padding: '12px 16px', textAlign: 'right', borderBottom: `1px solid #f1f5f9`, fontWeight: '500' },
  custName: { fontWeight: '600', color: COLORS.dark.hex },
  custPhone: { fontSize: '11px', color: COLORS.gray.hex, marginTop: '2px' },
  custTfoot: { backgroundColor: COLORS.navy.hex, color: '#fff' },
  custTfTd: { padding: '14px 16px', fontWeight: '700' },
  custTfTdC: { padding: '14px 16px', textAlign: 'center', fontWeight: '600' },
  custTfTdR: { padding: '14px 16px', textAlign: 'right', fontWeight: '600' },

  emptyProjectState: { textAlign: 'center', padding: '60px 20px', backgroundColor: COLORS.white.hex, borderRadius: '12px', marginTop: '16px', border: `2px dashed ${COLORS.lightGray.hex}` },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },
};

export default Reports;