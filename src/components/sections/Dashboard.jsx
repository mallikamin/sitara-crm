import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContextAPI';

// ========== FORMATTING HELPERS ==========
const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  if (Math.abs(num) >= 10000000) return '₨' + (num / 10000000).toFixed(2) + ' Cr';
  if (Math.abs(num) >= 100000) return '₨' + (num / 100000).toFixed(2) + ' Lac';
  if (Math.abs(num) >= 1000) return '₨' + (num / 1000).toFixed(1) + 'K';
  return '₨' + num.toLocaleString('en-PK');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

const getDaysAgo = (date) => {
  if (!date) return 999;
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return formatDate(date);
};

const getMonthName = (monthIndex) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
};

// ========== MAIN COMPONENT ==========
const Dashboard = () => {
  const { 
    customers = [], 
    brokers = [],
    projects = [], 
    receipts = [], 
    inventory = [],
    interactions = [],
    commissionPayments = []
  } = useData();

  // Forecast view toggle
  const [forecastView, setForecastView] = useState('monthly'); // 'monthly' | 'quarterly'
  const [expandedCustomer, setExpandedCustomer] = useState(null); // For overdue section

  // ========== FINANCIAL METRICS ==========
  const financials = useMemo(() => {
    let totalSale = 0, totalReceived = 0;
    let totalBrokerCommission = 0;
    let brokerDealsCount = 0;

    projects.forEach(p => {
      const sale = parseFloat(p.sale) || parseFloat(p.saleValue) || parseFloat(p.totalSale) || 0;
      const received = parseFloat(p.received) || parseFloat(p.totalReceived) || 0;
      totalSale += sale;
      totalReceived += received;

      // Calculate broker commission owed (based on sale value)
      if (p.brokerId) {
        brokerDealsCount++;
        // Use per-transaction commission rate, fallback to 1%
        const rate = parseFloat(p.brokerCommissionRate) || 1;
        totalBrokerCommission += (sale * rate) / 100;
      }
    });

    // Get ACTUAL commission payments made to brokers
    const brokerPayments = (commissionPayments || []).filter(p => p.recipientType === 'broker');
    const paidBrokerCommission = brokerPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return { 
      totalSale, 
      totalReceived, 
      totalReceivable: totalSale - totalReceived,
      totalBrokerCommission,           // Total commission OWED
      paidBrokerCommission,            // Commission actually PAID
      pendingBrokerCommission: totalBrokerCommission - paidBrokerCommission,  // Still pending
      brokerDealsCount,
      collectionRate: totalSale > 0 ? (totalReceived / totalSale * 100) : 0
    };
  }, [projects, commissionPayments]);

  // ========== OVERDUE ANALYSIS - FIXED FOR JSONB INSTALLMENTS ==========
  const overdueMetrics = useMemo(() => {
    let overdueAmount = 0, futureAmount = 0, overdueCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getCycleMonths = (cycle) => {
      const cycles = { monthly: 1, quarterly: 3, bi_annual: 6, biannual: 6, semi_annual: 6, annual: 12, yearly: 12 };
      return cycles[cycle] || 6;
    };

    projects.forEach(project => {
      const sale = parseFloat(project.sale) || parseFloat(project.saleValue) || 0;
      const received = parseFloat(project.received) || parseFloat(project.totalReceived) || 0;
      const totalReceivable = sale - received;

      if (totalReceivable <= 0) return;

      // Get installments - handle both JSON string and array
      let installments = project.installments;
      if (typeof installments === 'string') {
        try {
          installments = JSON.parse(installments);
        } catch {
          installments = null;
        }
      }

      // If installments is an array with due dates, use it directly
      if (Array.isArray(installments) && installments.length > 0 && installments[0]?.dueDate) {
        let projectHasOverdue = false;

        installments.forEach(inst => {
          const dueDate = inst.dueDate || inst.due_date;
          if (!dueDate) return;

          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);

          const amount = parseFloat(inst.amount) || 0;
          const paid = inst.paid === true || inst.paid === 'true';
          const partialPaid = parseFloat(inst.partialPaid || inst.partial_paid) || 0;
          const remaining = paid ? 0 : (amount - partialPaid);

          if (remaining > 0) {
            if (due < today) {
              overdueAmount += remaining;
              projectHasOverdue = true;
            } else {
              futureAmount += remaining;
            }
          }
        });

        if (projectHasOverdue) overdueCount++;
      } else {
        // Use first_due_date + installment_count + cycle to calculate schedule
        const firstDue = project.first_due_date || project.firstDueDate || project.nextDue || project.nextDueDate;
        
        if (!firstDue) {
          // No due date info, treat full receivable as future
          futureAmount += totalReceivable;
          return;
        }

        const installmentCount = parseInt(project.installment_count) || parseInt(project.installmentCount) || 
                                 (typeof installments === 'number' ? installments : 4);
        const cycleMonths = getCycleMonths(project.payment_cycle || project.paymentCycle || project.cycle);
        const installmentAmount = sale / installmentCount;
        let remaining = received;
        let hasOverdue = false;

        for (let i = 0; i < installmentCount; i++) {
          const dueDate = new Date(firstDue);
          dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
          dueDate.setHours(0, 0, 0, 0);

          const paid = Math.min(remaining, installmentAmount);
          remaining -= paid;
          const due = installmentAmount - paid;

          if (due > 0) {
            if (dueDate <= today) { overdueAmount += due; hasOverdue = true; }
            else { futureAmount += due; }
          }
        }
        if (hasOverdue) overdueCount++;
      }
    });

    return { overdueAmount, futureAmount, overdueCount };
  }, [projects]);

  // ========== OVERDUE BY CUSTOMER - DETAILED TRACKING ==========
  const overdueByCustomer = useMemo(() => {
    const customerOverdue = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getCycleMonths = (cycle) => {
      const cycles = { monthly: 1, quarterly: 3, bi_annual: 6, biannual: 6, semi_annual: 6, annual: 12, yearly: 12 };
      return cycles[cycle] || 6;
    };

    projects.forEach(project => {
      const customerId = project.customerId || project.customer_id;
      if (!customerId) return;

      const sale = parseFloat(project.sale) || parseFloat(project.saleValue) || 0;
      const received = parseFloat(project.received) || parseFloat(project.totalReceived) || 0;
      const totalReceivable = sale - received;

      if (totalReceivable <= 0) return;

      // Initialize customer entry if not exists
      if (!customerOverdue[customerId]) {
        const customer = customers.find(c => String(c.id) === String(customerId));
        customerOverdue[customerId] = {
          customerId,
          customerName: customer?.name || project.customerName || 'Unknown',
          customerPhone: customer?.phone || '',
          totalOverdue: 0,
          overdueInstallments: [],
          projectCount: 0
        };
      }

      // Get installments
      let installments = project.installments;
      if (typeof installments === 'string') {
        try { installments = JSON.parse(installments); } catch { installments = null; }
      }

      // Track overdue from JSONB array OR generated schedule
      if (Array.isArray(installments) && installments.length > 0 && installments[0]?.dueDate) {
        installments.forEach((inst, idx) => {
          const dueDate = inst.dueDate || inst.due_date;
          if (!dueDate) return;

          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);

          const amount = parseFloat(inst.amount) || 0;
          const paid = inst.paid === true || inst.paid === 'true';
          const partialPaid = parseFloat(inst.partialPaid || inst.partial_paid) || 0;
          const remaining = paid ? 0 : (amount - partialPaid);

          if (remaining > 0 && due < today) {
            customerOverdue[customerId].totalOverdue += remaining;
            customerOverdue[customerId].overdueInstallments.push({
              projectId: project.id,
              projectName: project.name || project.projectName,
              unit: project.unit || project.unitNumber,
              installmentNumber: idx + 1,
              dueDate: dueDate,
              amount: remaining,
              daysOverdue: Math.floor((today - due) / (1000 * 60 * 60 * 24))
            });
          }
        });
      } else {
        // Generate schedule from first_due_date
        const firstDue = project.first_due_date || project.firstDueDate || project.nextDue || project.nextDueDate;
        if (!firstDue) return;

        const installmentCount = parseInt(project.installment_count) || parseInt(project.installmentCount) || 
                                 (typeof installments === 'number' ? installments : 4);
        const cycleMonths = getCycleMonths(project.payment_cycle || project.paymentCycle || project.cycle);
        const installmentAmount = sale / installmentCount;
        let remaining = received;

        for (let i = 0; i < installmentCount; i++) {
          const dueDate = new Date(firstDue);
          dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));
          dueDate.setHours(0, 0, 0, 0);

          const paid = Math.min(remaining, installmentAmount);
          remaining -= paid;
          const dueAmount = installmentAmount - paid;

          if (dueAmount > 0 && dueDate < today) {
            customerOverdue[customerId].totalOverdue += dueAmount;
            customerOverdue[customerId].overdueInstallments.push({
              projectId: project.id,
              projectName: project.name || project.projectName,
              unit: project.unit || project.unitNumber,
              installmentNumber: i + 1,
              dueDate: dueDate.toISOString().split('T')[0],
              amount: dueAmount,
              daysOverdue: Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
            });
          }
        }
      }

      if (customerOverdue[customerId].overdueInstallments.length > 0) {
        customerOverdue[customerId].projectCount++;
      }
    });

    // Convert to array, filter out those with no overdue, sort by total overdue desc
    return Object.values(customerOverdue)
      .filter(c => c.totalOverdue > 0)
      .sort((a, b) => b.totalOverdue - a.totalOverdue);
  }, [projects, customers]);

  // ========== EXPECTED RECEIVABLES FORECAST ==========
  const receivablesForecast = useMemo(() => {
    const today = new Date();
    const monthlyData = {};
    const quarterlyData = {};

    const getCycleMonths = (cycle) => {
      const cycles = { monthly: 1, quarterly: 3, bi_annual: 6, biannual: 6, semi_annual: 6, annual: 12, yearly: 12 };
      return cycles[cycle] || 6;
    };

    projects.forEach(project => {
      const sale = parseFloat(project.sale) || parseFloat(project.saleValue) || 0;
      const received = parseFloat(project.received) || parseFloat(project.totalReceived) || 0;
      const totalReceivable = sale - received;

      if (totalReceivable <= 0) return;

      // Get installments
      let installments = project.installments;
      if (typeof installments === 'string') {
        try {
          installments = JSON.parse(installments);
        } catch {
          installments = null;
        }
      }

      // If installments is an array with due dates, use it directly
      if (Array.isArray(installments) && installments.length > 0 && installments[0]?.dueDate) {
        installments.forEach(inst => {
          const dueDate = inst.dueDate || inst.due_date;
          if (!dueDate) return;

          const due = new Date(dueDate);
          const amount = parseFloat(inst.amount) || 0;
          const paid = inst.paid === true || inst.paid === 'true';
          const partialPaid = parseFloat(inst.partialPaid || inst.partial_paid) || 0;
          const remaining = paid ? 0 : (amount - partialPaid);

          if (remaining <= 0) return;

          // Monthly key
          const monthKey = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { amount: 0, count: 0, year: due.getFullYear(), month: due.getMonth(), isPast: due < today };
          }
          monthlyData[monthKey].amount += remaining;
          monthlyData[monthKey].count++;

          // Quarterly key
          const quarter = Math.ceil((due.getMonth() + 1) / 3);
          const quarterKey = `${due.getFullYear()}-Q${quarter}`;
          if (!quarterlyData[quarterKey]) {
            quarterlyData[quarterKey] = { amount: 0, count: 0, year: due.getFullYear(), quarter, isPast: due < today };
          }
          quarterlyData[quarterKey].amount += remaining;
          quarterlyData[quarterKey].count++;
        });
      } else {
        // Generate schedule from first_due_date + cycle
        const firstDue = project.first_due_date || project.firstDueDate || project.nextDue || project.nextDueDate;
        if (!firstDue) return;

        const installmentCount = parseInt(project.installment_count) || parseInt(project.installmentCount) || 
                                 (typeof installments === 'number' ? installments : 4);
        const cycleMonths = getCycleMonths(project.payment_cycle || project.paymentCycle || project.cycle);
        const installmentAmount = sale / installmentCount;
        let remaining = received;

        for (let i = 0; i < installmentCount; i++) {
          const dueDate = new Date(firstDue);
          dueDate.setMonth(dueDate.getMonth() + (i * cycleMonths));

          const paid = Math.min(remaining, installmentAmount);
          remaining -= paid;
          const dueAmount = installmentAmount - paid;

          if (dueAmount <= 0) continue;

          // Monthly key
          const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { amount: 0, count: 0, year: dueDate.getFullYear(), month: dueDate.getMonth(), isPast: dueDate < today };
          }
          monthlyData[monthKey].amount += dueAmount;
          monthlyData[monthKey].count++;

          // Quarterly key
          const quarter = Math.ceil((dueDate.getMonth() + 1) / 3);
          const quarterKey = `${dueDate.getFullYear()}-Q${quarter}`;
          if (!quarterlyData[quarterKey]) {
            quarterlyData[quarterKey] = { amount: 0, count: 0, year: dueDate.getFullYear(), quarter, isPast: dueDate < today };
          }
          quarterlyData[quarterKey].amount += dueAmount;
          quarterlyData[quarterKey].count++;
        }
      }
    });

    // Sort and return - ONLY FUTURE DATES
    const sortedMonths = Object.entries(monthlyData)
      .filter(([key, data]) => !data.isPast) // Only future
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12);

    const sortedQuarters = Object.entries(quarterlyData)
      .filter(([key, data]) => !data.isPast) // Only future
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 8);

    return { monthly: sortedMonths, quarterly: sortedQuarters };
  }, [projects]);

  // ========== CUSTOMER STATS ==========
  const customerStats = useMemo(() => {
    const actual = customers.filter(c => c.type !== 'broker');
    const active = actual.filter(c => c.status === 'active' || !c.status).length;
    const withDeals = new Set(projects.map(p => p.customerId)).size;
    return { total: actual.length, active, withDeals };
  }, [customers, projects]);

  // ========== BROKER STATS ==========
  const brokerStats = useMemo(() => {
    const active = brokers.filter(b => b.status === 'active' || !b.status).length;
    const withDeals = new Set(projects.filter(p => p.brokerId).map(p => p.brokerId)).size;
    
    // Top performing brokers
    const brokerPerformance = brokers.map(broker => {
      const deals = projects.filter(p => String(p.brokerId) === String(broker.id));
      const totalSales = deals.reduce((sum, p) => sum + (parseFloat(p.sale) || 0), 0);
      const totalReceived = deals.reduce((sum, p) => sum + (parseFloat(p.received) || 0), 0);
      const rate = broker.commissionRate || 1;
      return {
        ...broker,
        dealsCount: deals.length,
        totalSales,
        totalReceived,
        commission: (totalSales * rate) / 100,
        earnedCommission: (totalReceived * rate) / 100
      };
    }).filter(b => b.dealsCount > 0).sort((a, b) => b.totalSales - a.totalSales);

    return { 
      total: brokers.length, 
      active, 
      withDeals,
      topPerformers: brokerPerformance.slice(0, 3)
    };
  }, [brokers, projects]);

  // ========== INVENTORY STATS ==========
  const inventoryStats = useMemo(() => {
    const available = inventory.filter(i => i.status === 'available').length;
    const sold = inventory.filter(i => i.status === 'sold').length;
    const reserved = inventory.filter(i => ['reserved', 'blocked'].includes(i.status)).length;
    const availableValue = inventory
      .filter(i => i.status === 'available')
      .reduce((sum, i) => sum + (parseFloat(i.totalValue) || parseFloat(i.saleValue) || 0), 0);
    
    // Project-wise breakdown of available inventory
    const projectBreakdown = {};
    inventory.filter(i => i.status === 'available').forEach(item => {
      const projectName = item.projectName || item.project_name || 'Unassigned';
      if (!projectBreakdown[projectName]) {
        projectBreakdown[projectName] = {
          name: projectName,
          units: 0,
          totalMarlas: 0,
          totalValue: 0
        };
      }
      projectBreakdown[projectName].units++;
      projectBreakdown[projectName].totalMarlas += parseFloat(item.marlas) || 0;
      projectBreakdown[projectName].totalValue += parseFloat(item.totalValue) || parseFloat(item.saleValue) || 0;
    });

    // Calculate averages and convert to array
    const byProject = Object.values(projectBreakdown).map(p => ({
      ...p,
      avgMarlas: p.units > 0 ? (p.totalMarlas / p.units).toFixed(2) : 0,
      avgValue: p.units > 0 ? (p.totalValue / p.units) : 0
    })).sort((a, b) => b.units - a.units);

    return { total: inventory.length, available, sold, reserved, availableValue, byProject };
  }, [inventory]);

  // ========== RECENT ACTIVITIES - OPTIMIZED ==========
  const recentActivities = useMemo(() => {
    const activities = [];

    // Recent receipts (payments)
    receipts.slice(-10).forEach(r => {
      const customer = customers.find(c => String(c.id) === String(r.customerId));
      const project = projects.find(p => String(p.id) === String(r.projectId));
      activities.push({
        id: `receipt_${r.id}`,
        type: 'payment',
        icon: '💰',
        color: '#10b981',
        bgColor: '#ecfdf5',
        title: 'Payment Received',
        subtitle: customer?.name || 'Unknown Customer',
        detail: project?.name || project?.projectName,
        amount: r.amount,
        date: r.date || r.createdAt,
        timestamp: new Date(r.date || r.createdAt).getTime()
      });
    });

    // Recent customer interactions
    interactions.filter(i => i.customerId && !i.brokerId).slice(-10).forEach(i => {
      const customer = customers.find(c => String(c.id) === String(i.customerId));
      if (customer) {
        const typeIcons = { call: '📞', whatsapp: '💬', sms: '📱', email: '📧', meeting: '🤝', site_visit: '🏗️', other: '📝' };
        activities.push({
          id: `int_cust_${i.id}`,
          type: 'customer_interaction',
          icon: typeIcons[i.type] || '💬',
          color: '#3b82f6',
          bgColor: '#eff6ff',
          title: `${(i.type || 'interaction').charAt(0).toUpperCase() + (i.type || 'interaction').slice(1)} with Customer`,
          subtitle: customer.name,
          detail: i.subject || i.notes?.substring(0, 50),
          status: i.outcome || i.status,
          date: i.date || i.createdAt,
          timestamp: new Date(i.date || i.createdAt).getTime()
        });
      }
    });

    // Recent BROKER interactions - FIXED
    interactions.filter(i => i.brokerId).slice(-10).forEach(i => {
      const broker = brokers.find(b => String(b.id) === String(i.brokerId));
      if (broker) {
        const typeIcons = { call: '📞', whatsapp: '💬', sms: '📱', email: '📧', meeting: '🤝', site_visit: '🏗️', other: '📝' };
        activities.push({
          id: `int_broker_${i.id}`,
          type: 'broker_interaction',
          icon: typeIcons[i.type] || '🤝',
          color: '#8b5cf6',
          bgColor: '#f5f3ff',
          title: `${(i.type || 'interaction').charAt(0).toUpperCase() + (i.type || 'interaction').slice(1)} with Broker`,
          subtitle: broker.name,
          detail: i.subject || i.notes?.substring(0, 50),
          status: i.outcome || i.status,
          badge: 'Broker',
          badgeColor: '#8b5cf6',
          date: i.date || i.createdAt,
          timestamp: new Date(i.date || i.createdAt).getTime()
        });
      }
    });

    // Check interactions with contacts array (multi-party interactions)
    interactions.filter(i => i.contacts && Array.isArray(i.contacts)).slice(-10).forEach(i => {
      const brokerContacts = i.contacts.filter(c => c.type === 'broker');
      brokerContacts.forEach(contact => {
        const broker = brokers.find(b => String(b.id) === String(contact.id));
        if (broker) {
          const typeIcons = { call: '📞', whatsapp: '💬', sms: '📱', email: '📧', meeting: '🤝', site_visit: '🏗️', other: '📝' };
          activities.push({
            id: `int_contact_${i.id}_${contact.id}`,
            type: 'broker_interaction',
            icon: typeIcons[i.type] || '🤝',
            color: '#8b5cf6',
            bgColor: '#f5f3ff',
            title: `${(i.type || 'interaction').charAt(0).toUpperCase() + (i.type || 'interaction').slice(1)} with Broker`,
            subtitle: broker.name || contact.name,
            detail: i.subject || i.notes?.substring(0, 50),
            status: i.outcome || i.status,
            badge: 'Broker',
            badgeColor: '#8b5cf6',
            date: i.date || i.createdAt,
            timestamp: new Date(i.date || i.createdAt).getTime()
          });
        }
      });
    });

    // Recent transactions/projects
    projects.slice(-5).forEach(p => {
      const customer = customers.find(c => String(c.id) === String(p.customerId));
      const broker = p.brokerId ? brokers.find(b => String(b.id) === String(p.brokerId)) : null;
      activities.push({
        id: `proj_${p.id}`,
        type: 'transaction',
        icon: '📋',
        color: '#0891b2',
        bgColor: '#ecfeff',
        title: 'New Transaction',
        subtitle: customer?.name || 'Unknown',
        detail: p.name || p.projectName,
        amount: parseFloat(p.sale) || parseFloat(p.saleValue),
        badge: broker ? broker.name : null,
        badgeColor: broker ? '#8b5cf6' : null,
        date: p.createdAt,
        timestamp: new Date(p.createdAt).getTime()
      });
    });

    // Sort by timestamp descending and take top 8
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [receipts, interactions, customers, brokers, projects]);

  // ========== RENDER ==========
  return (
    <div style={styles.container}>
      {/* Executive Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Executive Dashboard</h1>
          <p style={styles.subtitle}>Real-time portfolio intelligence & performance metrics</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.headerBadges}>
            <span style={styles.liveBadge}>● LIVE</span>
            <span style={styles.timeBadge}>{new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div style={styles.quickStats}>
            <span style={styles.quickStat}>
              <span style={styles.quickStatIcon}>👥</span>
              {customerStats.total} customers
            </span>
            <span style={styles.quickStatDivider}>|</span>
            <span style={styles.quickStat}>
              <span style={styles.quickStatIcon}>🤝</span>
              {brokerStats.total} brokers
            </span>
            <span style={styles.quickStatDivider}>|</span>
            <span style={styles.quickStat}>
              <span style={styles.quickStatIcon}>📋</span>
              {projects.length} deals
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>
            <span style={styles.kpiMainIcon}>📊</span>
          </div>
          <div style={styles.kpiContent}>
            <span style={styles.kpiLabel}>TOTAL PORTFOLIO</span>
            <span style={styles.kpiValue}>{formatCurrency(financials.totalSale)}</span>
            <span style={styles.kpiMeta}>{projects.length} active transactions</span>
          </div>
          <div style={{...styles.kpiAccent, backgroundColor: '#6366f1'}}></div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: '#ecfdf5'}}>
            <span style={styles.kpiMainIcon}>✓</span>
          </div>
          <div style={styles.kpiContent}>
            <span style={styles.kpiLabel}>COLLECTED</span>
            <span style={{...styles.kpiValue, color: '#059669'}}>{formatCurrency(financials.totalReceived)}</span>
            <div style={styles.kpiProgress}>
              <div style={{...styles.kpiProgressFill, width: `${financials.collectionRate}%`}}></div>
            </div>
            <span style={styles.kpiMeta}>{financials.collectionRate.toFixed(1)}% collection rate</span>
          </div>
          <div style={{...styles.kpiAccent, backgroundColor: '#10b981'}}></div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: '#fef3c7'}}>
            <span style={styles.kpiMainIcon}>⏳</span>
          </div>
          <div style={styles.kpiContent}>
            <span style={styles.kpiLabel}>RECEIVABLE</span>
            <span style={{...styles.kpiValue, color: '#d97706'}}>{formatCurrency(financials.totalReceivable)}</span>
            <span style={styles.kpiMeta}>{(100 - financials.collectionRate).toFixed(1)}% pending</span>
          </div>
          <div style={{...styles.kpiAccent, backgroundColor: '#f59e0b'}}></div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: '#fee2e2'}}>
            <span style={styles.kpiMainIcon}>⚠️</span>
          </div>
          <div style={styles.kpiContent}>
            <span style={styles.kpiLabel}>OVERDUE</span>
            <span style={{...styles.kpiValue, color: '#dc2626'}}>{formatCurrency(overdueMetrics.overdueAmount)}</span>
            <span style={styles.kpiMeta}>{overdueMetrics.overdueCount} transactions at risk</span>
          </div>
          <div style={{...styles.kpiAccent, backgroundColor: '#ef4444'}}></div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: '#dbeafe'}}>
            <span style={styles.kpiMainIcon}>📆</span>
          </div>
          <div style={styles.kpiContent}>
            <span style={styles.kpiLabel}>FUTURE RECEIVABLE</span>
            <span style={{...styles.kpiValue, color: '#2563eb'}}>{formatCurrency(overdueMetrics.futureAmount)}</span>
            <span style={styles.kpiMeta}>Not yet due</span>
          </div>
          <div style={{...styles.kpiAccent, backgroundColor: '#3b82f6'}}></div>
        </div>
      </div>

      {/* Broker Commission Card - Prominent */}
      <div style={styles.brokerCommissionCard}>
        <div style={styles.brokerCommissionHeader}>
          <div style={styles.brokerCommissionTitle}>
            <span style={styles.brokerIcon}>🤝</span>
            <div>
              <h3 style={styles.brokerCardTitle}>Broker Network Performance</h3>
              <p style={styles.brokerCardSubtitle}>{brokerStats.total} brokers • {brokerStats.withDeals} active in deals</p>
            </div>
          </div>
          <div style={styles.brokerCommissionTotal}>
            <span style={styles.brokerTotalLabel}>Total Commission</span>
            <span style={styles.brokerTotalValue}>{formatCurrency(financials.totalBrokerCommission)}</span>
          </div>
        </div>
        
        <div style={styles.brokerMetricsGrid}>
          <div style={styles.brokerMetric}>
            <span style={styles.brokerMetricValue}>{financials.brokerDealsCount}</span>
            <span style={styles.brokerMetricLabel}>Brokered Deals</span>
          </div>
          <div style={styles.brokerMetric}>
            <span style={{...styles.brokerMetricValue, color: '#10b981'}}>{formatCurrency(financials.paidBrokerCommission)}</span>
            <span style={styles.brokerMetricLabel}>Paid Commission</span>
          </div>
          <div style={styles.brokerMetric}>
            <span style={{...styles.brokerMetricValue, color: '#f59e0b'}}>{formatCurrency(financials.pendingBrokerCommission)}</span>
            <span style={styles.brokerMetricLabel}>Pending Commission</span>
          </div>
          <div style={styles.brokerMetric}>
            <span style={styles.brokerMetricValue}>{brokerStats.active}/{brokerStats.total}</span>
            <span style={styles.brokerMetricLabel}>Active Brokers</span>
          </div>
        </div>

        {/* Top Performing Brokers */}
        {brokerStats.topPerformers.length > 0 && (
          <div style={styles.topBrokersSection}>
            <h4 style={styles.topBrokersTitle}>Top Performing Brokers</h4>
            <div style={styles.topBrokersList}>
              {brokerStats.topPerformers.map((broker, idx) => (
                <div key={broker.id} style={styles.topBrokerItem}>
                  <div style={styles.topBrokerRank}>{idx + 1}</div>
                  <div style={styles.topBrokerInfo}>
                    <span style={styles.topBrokerName}>{broker.name}</span>
                    <span style={styles.topBrokerDeals}>{broker.dealsCount} deals</span>
                  </div>
                  <div style={styles.topBrokerStats}>
                    <span style={styles.topBrokerSales}>{formatCurrency(broker.totalSales)}</span>
                    <span style={styles.topBrokerCommission}>Commission: {formatCurrency(broker.commission)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div style={styles.contentGrid}>
        {/* Recent Activity - Enhanced */}
        <div style={styles.activityCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Recent Activity</h3>
            <span style={styles.cardBadge}>{recentActivities.length} items</span>
          </div>
          
          {recentActivities.length > 0 ? (
            <div style={styles.activityList}>
              {recentActivities.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={{...styles.activityIcon, backgroundColor: activity.bgColor, color: activity.color}}>
                    {activity.icon}
                  </div>
                  <div style={styles.activityContent}>
                    <div style={styles.activityHeader}>
                      <span style={styles.activityTitle}>{activity.title}</span>
                      {activity.badge && (
                        <span style={{...styles.activityBadge, backgroundColor: `${activity.badgeColor}15`, color: activity.badgeColor}}>
                          {activity.badge}
                        </span>
                      )}
                    </div>
                    <span style={styles.activitySubtitle}>{activity.subtitle}</span>
                    {activity.detail && <span style={styles.activityDetail}>{activity.detail}</span>}
                  </div>
                  <div style={styles.activityMeta}>
                    {activity.amount && (
                      <span style={{...styles.activityAmount, color: activity.color}}>
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                    <span style={styles.activityDate}>{getDaysAgo(activity.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📋</span>
              <p style={styles.emptyText}>No recent activity</p>
              <p style={styles.emptySubtext}>Activities will appear here as they happen</p>
            </div>
          )}
        </div>

        {/* Portfolio Health */}
        <div style={styles.healthCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Portfolio Health</h3>
          </div>

          {/* Collection Progress */}
          <div style={styles.healthSection}>
            <div style={styles.healthLabel}>
              <span>Collection Progress</span>
              <span style={styles.healthPercent}>{financials.collectionRate.toFixed(1)}%</span>
            </div>
            <div style={styles.healthBar}>
              <div style={{...styles.healthFill, width: `${financials.collectionRate}%`, backgroundColor: '#10b981'}}></div>
            </div>
            <div style={styles.healthLegend}>
              <span style={styles.healthLegendItem}>
                <span style={{...styles.legendDot, backgroundColor: '#10b981'}}></span>
                Received: {formatCurrency(financials.totalReceived)}
              </span>
              <span style={styles.healthLegendItem}>
                <span style={{...styles.legendDot, backgroundColor: '#e5e7eb'}}></span>
                Pending: {formatCurrency(financials.totalReceivable)}
              </span>
            </div>
          </div>

          {/* Aging Breakdown */}
          <div style={styles.agingSection}>
            <h4 style={styles.agingSectionTitle}>Receivables Aging</h4>
            <div style={styles.agingBars}>
              <div style={styles.agingItem}>
                <div style={styles.agingHeader}>
                  <span style={styles.agingLabel}>Current/Future</span>
                  <span style={styles.agingValue}>{formatCurrency(overdueMetrics.futureAmount)}</span>
                </div>
                <div style={styles.agingBar}>
                  <div style={{...styles.agingFill, backgroundColor: '#10b981', width: `${financials.totalReceivable > 0 ? (overdueMetrics.futureAmount / financials.totalReceivable * 100) : 0}%`}}></div>
                </div>
              </div>
              <div style={styles.agingItem}>
                <div style={styles.agingHeader}>
                  <span style={{...styles.agingLabel, color: '#dc2626'}}>Overdue</span>
                  <span style={{...styles.agingValue, color: '#dc2626'}}>{formatCurrency(overdueMetrics.overdueAmount)}</span>
                </div>
                <div style={styles.agingBar}>
                  <div style={{...styles.agingFill, backgroundColor: '#ef4444', width: `${financials.totalReceivable > 0 ? (overdueMetrics.overdueAmount / financials.totalReceivable * 100) : 0}%`}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Expected Receivables Forecast */}
          <div style={styles.forecastSection}>
            <div style={styles.forecastHeader}>
              <h4 style={styles.forecastTitle}>📅 Expected Receivables</h4>
              <div style={styles.forecastToggle}>
                <button 
                  style={{...styles.toggleBtn, ...(forecastView === 'monthly' ? styles.toggleBtnActive : {})}}
                  onClick={() => setForecastView('monthly')}
                >
                  Monthly
                </button>
                <button 
                  style={{...styles.toggleBtn, ...(forecastView === 'quarterly' ? styles.toggleBtnActive : {})}}
                  onClick={() => setForecastView('quarterly')}
                >
                  Quarterly
                </button>
              </div>
            </div>
            <div style={styles.forecastList}>
              {forecastView === 'monthly' ? (
                receivablesForecast.monthly.length > 0 ? (
                  receivablesForecast.monthly.slice(0, 6).map(([key, data]) => (
                    <div key={key} style={{...styles.forecastItem, ...(data.isPast ? styles.forecastItemOverdue : {})}}>
                      <div style={styles.forecastPeriod}>
                        <span style={styles.forecastMonth}>{getMonthName(data.month)}</span>
                        <span style={styles.forecastYear}>{data.year}</span>
                      </div>
                      <div style={styles.forecastRight}>
                        <span style={{...styles.forecastAmount, color: data.isPast ? '#dc2626' : '#0f172a'}}>
                          {formatCurrency(data.amount)}
                        </span>
                        <span style={styles.forecastCount}>{data.count} inst.</span>
                        {data.isPast && <span style={styles.overdueTag}>OVERDUE</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.forecastEmpty}>No scheduled installments</div>
                )
              ) : (
                receivablesForecast.quarterly.length > 0 ? (
                  receivablesForecast.quarterly.slice(0, 4).map(([key, data]) => (
                    <div key={key} style={{...styles.forecastItem, ...(data.isPast ? styles.forecastItemOverdue : {})}}>
                      <div style={styles.forecastPeriod}>
                        <span style={styles.forecastMonth}>Q{data.quarter}</span>
                        <span style={styles.forecastYear}>{data.year}</span>
                      </div>
                      <div style={styles.forecastRight}>
                        <span style={{...styles.forecastAmount, color: data.isPast ? '#dc2626' : '#0f172a'}}>
                          {formatCurrency(data.amount)}
                        </span>
                        <span style={styles.forecastCount}>{data.count} inst.</span>
                        {data.isPast && <span style={styles.overdueTag}>OVERDUE</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.forecastEmpty}>No scheduled installments</div>
                )
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={styles.quickStatsGrid}>
            <div style={styles.quickStatCard}>
              <span style={styles.quickStatValue}>{customerStats.withDeals}</span>
              <span style={styles.quickStatLabel}>Active Customers</span>
            </div>
            <div style={styles.quickStatCard}>
              <span style={styles.quickStatValue}>{inventoryStats.available}</span>
              <span style={styles.quickStatLabel}>Available Units</span>
            </div>
            <div style={styles.quickStatCard}>
              <span style={styles.quickStatValue}>{interactions.length}</span>
              <span style={styles.quickStatLabel}>Total Interactions</span>
            </div>
            <div style={styles.quickStatCard}>
              <span style={styles.quickStatValue}>{inventoryStats.sold}</span>
              <span style={styles.quickStatLabel}>Units Sold</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue by Customer Section */}
      {overdueByCustomer.length > 0 && (
        <div style={styles.overdueSection}>
          <div style={styles.overdueHeader}>
            <div style={styles.overdueTitleGroup}>
              <span style={styles.overdueIcon}>⚠️</span>
              <h3 style={styles.overdueTitle}>Overdue by Customer</h3>
              <span style={styles.overdueCount}>{overdueByCustomer.length} customers</span>
            </div>
            <span style={styles.overdueTotalAmount}>{formatCurrency(overdueByCustomer.reduce((s, c) => s + c.totalOverdue, 0))}</span>
          </div>
          <div style={styles.overdueList}>
            {overdueByCustomer.slice(0, 5).map((customer, idx) => (
              <div 
                key={customer.customerId} 
                style={{
                  ...styles.overdueCustomer,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setExpandedCustomer(expandedCustomer === customer.customerId ? null : customer.customerId)}
              >
                <div style={styles.overdueCustomerMain}>
                  <div style={styles.overdueCustomerInfo}>
                    <span style={styles.overdueRank}>{idx + 1}</span>
                    <div style={styles.overdueCustomerDetails}>
                      <span style={styles.overdueCustomerName}>{customer.customerName}</span>
                      <span style={styles.overdueCustomerPhone}>{customer.customerPhone || 'No phone'}</span>
                    </div>
                  </div>
                  <div style={styles.overdueCustomerStats}>
                    <span style={styles.overdueCustomerAmount}>{formatCurrency(customer.totalOverdue)}</span>
                    <span style={styles.overdueCustomerMeta}>
                      {customer.overdueInstallments.length} installment{customer.overdueInstallments.length > 1 ? 's' : ''} • {customer.projectCount} project{customer.projectCount > 1 ? 's' : ''}
                      <span style={{ marginLeft: '8px' }}>{expandedCustomer === customer.customerId ? '▲' : '▼'}</span>
                    </span>
                  </div>
                </div>
                {expandedCustomer === customer.customerId && (
                  <div style={styles.overdueInstallmentsList}>
                    {customer.overdueInstallments.map((inst, instIdx) => (
                      <div key={instIdx} style={styles.overdueInstallmentItem}>
                        <span style={styles.overdueInstProject}>{inst.projectName} - Unit {inst.unit}</span>
                        <span style={styles.overdueInstDetails}>
                          Inst #{inst.installmentNumber} • Due {formatDate(inst.dueDate)} • <span style={styles.daysOverdue}>{inst.daysOverdue} days overdue</span>
                        </span>
                        <span style={styles.overdueInstAmount}>{formatCurrency(inst.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {overdueByCustomer.length > 5 && (
            <div style={styles.overdueFooter}>
              Showing top 5 of {overdueByCustomer.length} customers with overdue payments
            </div>
          )}
        </div>
      )}

      {/* Bottom Summary Cards */}
      <div style={styles.bottomGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <span style={styles.summaryIcon}>👥</span>
            <h4 style={styles.summaryTitle}>Customer Portfolio</h4>
          </div>
          <div style={styles.summaryStats}>
            <div style={styles.summaryStat}>
              <span style={{...styles.summaryStatValue, color: '#3b82f6'}}>{customerStats.total}</span>
              <span style={styles.summaryStatLabel}>Total</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={{...styles.summaryStatValue, color: '#10b981'}}>{customerStats.active}</span>
              <span style={styles.summaryStatLabel}>Active</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={{...styles.summaryStatValue, color: '#f59e0b'}}>{customerStats.withDeals}</span>
              <span style={styles.summaryStatLabel}>With Deals</span>
            </div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <span style={styles.summaryIcon}>📦</span>
            <h4 style={styles.summaryTitle}>Inventory Status</h4>
          </div>
          <div style={styles.summaryStats}>
            <div style={styles.summaryStat}>
              <span style={{...styles.summaryStatValue, color: '#10b981'}}>{inventoryStats.available}</span>
              <span style={styles.summaryStatLabel}>Available</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={{...styles.summaryStatValue, color: '#6366f1'}}>{inventoryStats.sold}</span>
              <span style={styles.summaryStatLabel}>Sold</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={{...styles.summaryStatValue, color: '#f59e0b'}}>{inventoryStats.reserved}</span>
              <span style={styles.summaryStatLabel}>Reserved</span>
            </div>
          </div>
          {/* Project-wise breakdown */}
          {inventoryStats.byProject && inventoryStats.byProject.length > 0 && (
            <div style={styles.projectBreakdown}>
              <div style={styles.projectBreakdownTitle}>Available by Project</div>
              {inventoryStats.byProject.slice(0, 3).map((proj, idx) => (
                <div key={idx} style={styles.projectBreakdownItem}>
                  <span style={styles.projectBreakdownName}>{proj.name}</span>
                  <span style={styles.projectBreakdownDetails}>
                    {proj.units} units • Avg {proj.avgMarlas} marla • {formatCurrency(proj.avgValue)}/unit
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={styles.summaryFooter}>
            Total Available Value: {formatCurrency(inventoryStats.availableValue)}
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <span style={styles.summaryIcon}>📈</span>
            <h4 style={styles.summaryTitle}>Key Metrics</h4>
          </div>
          <div style={styles.metricsList}>
            <div style={styles.metricItem}>
              <span>Active Transactions</span>
              <span style={styles.metricValue}>{projects.filter(p => p.status === 'active' || !p.status).length}</span>
            </div>
            <div style={styles.metricItem}>
              <span>Broker Transactions</span>
              <span style={styles.metricValue}>{financials.brokerDealsCount}</span>
            </div>
            <div style={styles.metricItem}>
              <span>Avg. Deal Size</span>
              <span style={styles.metricValue}>{projects.length > 0 ? formatCurrency(financials.totalSale / projects.length) : '₨0'}</span>
            </div>
            <div style={styles.metricItem}>
              <span>Avg. Marla/Deal</span>
              <span style={styles.metricValue}>
                {projects.length > 0 
                  ? (projects.reduce((sum, p) => sum + (parseFloat(p.marlas) || 0), 0) / projects.length).toFixed(2)
                  : '0'} marla
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  headerLeft: {},
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  headerRight: {
    textAlign: 'right',
  },
  headerBadges: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginBottom: '8px',
  },
  liveBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  timeBadge: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  quickStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#64748b',
  },
  quickStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  quickStatIcon: {
    fontSize: '12px',
  },
  quickStatDivider: {
    color: '#e2e8f0',
    margin: '0 4px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
  },
  kpiIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiMainIcon: {
    fontSize: '22px',
  },
  kpiContent: {
    flex: 1,
    minWidth: 0,
  },
  kpiLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  kpiValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: '1.2',
  },
  kpiMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  kpiProgress: {
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  kpiProgressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  brokerCommissionCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e9d5ff',
    background: 'linear-gradient(135deg, #faf5ff 0%, #fff 50%)',
  },
  brokerCommissionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  brokerCommissionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brokerIcon: {
    fontSize: '32px',
  },
  brokerCardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  brokerCardSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '2px 0 0',
  },
  brokerCommissionTotal: {
    textAlign: 'right',
  },
  brokerTotalLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#7c3aed',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  brokerTotalValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#7c3aed',
  },
  brokerMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    padding: '20px',
    backgroundColor: '#faf5ff',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  brokerMetric: {
    textAlign: 'center',
  },
  brokerMetricValue: {
    display: 'block',
    fontSize: '22px',
    fontWeight: '700',
    color: '#7c3aed',
  },
  brokerMetricLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  topBrokersSection: {
    borderTop: '1px solid #e9d5ff',
    paddingTop: '20px',
  },
  topBrokersTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    margin: '0 0 12px 0',
  },
  topBrokersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  topBrokerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #f3e8ff',
  },
  topBrokerRank: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: '#f3e8ff',
    color: '#7c3aed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
  },
  topBrokerInfo: {
    flex: 1,
  },
  topBrokerName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  topBrokerDeals: {
    fontSize: '12px',
    color: '#64748b',
  },
  topBrokerStats: {
    textAlign: 'right',
  },
  topBrokerSales: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  topBrokerCommission: {
    fontSize: '11px',
    color: '#7c3aed',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
  },
  cardBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    transition: 'background-color 0.2s ease',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  },
  activityTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
  },
  activityBadge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  activitySubtitle: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
  },
  activityDetail: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  activityMeta: {
    textAlign: 'right',
    flexShrink: 0,
  },
  activityAmount: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
  },
  activityDate: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    margin: 0,
  },
  emptySubtext: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  healthSection: {
    marginBottom: '24px',
  },
  healthLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#475569',
    marginBottom: '8px',
  },
  healthPercent: {
    fontWeight: '700',
    color: '#10b981',
  },
  healthBar: {
    height: '10px',
    backgroundColor: '#e5e7eb',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.5s ease',
  },
  healthLegend: {
    display: 'flex',
    gap: '20px',
    marginTop: '12px',
  },
  healthLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  agingSection: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  agingSectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    margin: '0 0 16px 0',
  },
  agingBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  agingItem: {},
  agingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '6px',
  },
  agingLabel: {
    color: '#64748b',
    fontWeight: '500',
  },
  agingValue: {
    fontWeight: '600',
    color: '#0f172a',
  },
  agingBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  agingFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  quickStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  quickStatCard: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  quickStatValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a',
  },
  quickStatLabel: {
    fontSize: '11px',
    color: '#64748b',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  summaryIcon: {
    fontSize: '20px',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
  },
  summaryStats: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  summaryStat: {
    textAlign: 'center',
  },
  summaryStatValue: {
    display: 'block',
    fontSize: '22px',
    fontWeight: '700',
  },
  summaryStatLabel: {
    fontSize: '11px',
    color: '#64748b',
  },
  summaryFooter: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
    fontSize: '12px',
    textAlign: 'center',
    color: '#64748b',
    fontWeight: '600',
  },
  metricsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b',
  },
  metricValue: {
    fontWeight: '600',
    color: '#0f172a',
  },
  // ========== FORECAST STYLES ==========
  forecastSection: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  forecastHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  forecastTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    margin: 0,
  },
  forecastToggle: {
    display: 'flex',
    backgroundColor: '#e2e8f0',
    borderRadius: '6px',
    padding: '2px',
  },
  toggleBtn: {
    padding: '4px 10px',
    border: 'none',
    background: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  forecastList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  forecastItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  forecastItemOverdue: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  forecastPeriod: {
    display: 'flex',
    flexDirection: 'column',
  },
  forecastMonth: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
  },
  forecastYear: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  forecastRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  forecastAmount: {
    fontSize: '14px',
    fontWeight: '700',
  },
  forecastCount: {
    fontSize: '10px',
    color: '#94a3b8',
  },
  overdueTag: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  forecastEmpty: {
    textAlign: 'center',
    padding: '20px',
    color: '#94a3b8',
    fontSize: '12px',
  },

  // ========== OVERDUE BY CUSTOMER STYLES ==========
  overdueSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #fecaca',
  },
  overdueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #fee2e2',
  },
  overdueTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  overdueIcon: {
    fontSize: '24px',
  },
  overdueTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#dc2626',
    margin: 0,
  },
  overdueCount: {
    fontSize: '12px',
    color: '#f87171',
    backgroundColor: '#fef2f2',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '500',
  },
  overdueTotalAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#dc2626',
  },
  overdueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  overdueCustomer: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #fecaca',
  },
  overdueCustomerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  overdueCustomerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  overdueRank: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
  },
  overdueCustomerDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  overdueCustomerName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  overdueCustomerPhone: {
    fontSize: '12px',
    color: '#64748b',
  },
  overdueCustomerStats: {
    textAlign: 'right',
  },
  overdueCustomerAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#dc2626',
    display: 'block',
  },
  overdueCustomerMeta: {
    fontSize: '11px',
    color: '#64748b',
  },
  overdueInstallmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '10px',
    borderTop: '1px dashed #fca5a5',
  },
  overdueInstallmentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
  },
  overdueInstProject: {
    fontWeight: '600',
    color: '#1e293b',
    flex: '1',
  },
  overdueInstDetails: {
    color: '#64748b',
    flex: '2',
    textAlign: 'center',
  },
  daysOverdue: {
    color: '#dc2626',
    fontWeight: '600',
  },
  overdueInstAmount: {
    fontWeight: '600',
    color: '#dc2626',
    flex: '1',
    textAlign: 'right',
  },
  moreInstallments: {
    fontSize: '11px',
    color: '#f87171',
    textAlign: 'center',
    padding: '6px',
    fontStyle: 'italic',
  },
  overdueFooter: {
    marginTop: '12px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // ========== PROJECT BREAKDOWN STYLES ==========
  projectBreakdown: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  projectBreakdownTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  projectBreakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  projectBreakdownName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  projectBreakdownDetails: {
    fontSize: '11px',
    color: '#64748b',
  },
};

export default Dashboard;