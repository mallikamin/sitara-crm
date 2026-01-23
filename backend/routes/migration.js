import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all data (for migration from localStorage)
router.get('/all', async (req, res) => {
  try {
    const [customers, brokers, companyReps, projects, receipts, interactions, inventory, masterProjects, commissionPayments, settings] = await Promise.all([
      pool.query('SELECT * FROM customers'),
      pool.query('SELECT * FROM brokers'),
      pool.query('SELECT * FROM company_reps').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM projects'),
      pool.query('SELECT * FROM receipts'),
      pool.query('SELECT * FROM interactions'),
      pool.query('SELECT * FROM inventory'),
      pool.query('SELECT * FROM master_projects'),
      pool.query('SELECT * FROM commission_payments'),
      pool.query('SELECT key, value FROM settings')
    ]);

    const settingsObj = {};
    settings.rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });

    const data = {
      version: '4.0',
      customers: customers.rows.map(c => ({
        ...c,
        linkedBrokerId: c.linked_broker_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })),
      brokers: brokers.rows.map(b => ({
        ...b,
        commissionRate: parseFloat(b.commission_rate) || 1,
        bankDetails: b.bank_details,
        linkedCustomerId: b.linked_customer_id,
        createdAt: b.created_at,
        updatedAt: b.updated_at
      })),
      companyReps: companyReps.rows.map(r => ({
        ...r,
        commissionRate: parseFloat(r.commission_rate) || 1,
        bankDetails: r.bank_details,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      commissionPayments: commissionPayments.rows.map(cp => ({
        ...cp,
        projectId: cp.project_id,
        recipientId: cp.recipient_id,
        recipientType: cp.recipient_type,
        recipientName: cp.recipient_name,
        paidAmount: parseFloat(cp.paid_amount) || 0,
        remainingAmount: parseFloat(cp.remaining_amount) || 0,
        paymentDate: cp.payment_date,
        paymentMethod: cp.payment_method,
        paymentReference: cp.payment_reference,
        createdAt: cp.created_at,
        updatedAt: cp.updated_at
      })),
      projects: projects.rows.map(p => ({
        ...p,
        customerId: p.customer_id,
        brokerId: p.broker_id,
        brokerCommissionRate: parseFloat(p.broker_commission_rate) || 1,
        companyRepId: p.company_rep_id,
        companyRepCommissionRate: parseFloat(p.company_rep_commission_rate) || 1,
        installments: typeof p.installments === 'string' ? JSON.parse(p.installments) : p.installments,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })),
      receipts: receipts.rows.map(r => ({
        ...r,
        customerId: r.customer_id,
        projectId: r.project_id,
        installmentId: r.installment_id,
        receiptNumber: r.receipt_number,
        customerName: r.customer_name,
        projectName: r.project_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      interactions: interactions.rows.map(i => ({
        ...i,
        contactType: i.contact_type,
        customerId: i.customer_id,
        brokerId: i.broker_id,
        nextFollowUp: i.next_follow_up,
        contacts: typeof i.contacts === 'string' ? JSON.parse(i.contacts) : i.contacts,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })),
      inventory: inventory.rows.map(inv => ({
        ...inv,
        projectName: inv.project_name,
        unitShopNumber: inv.unit_shop_number,
        unitType: inv.unit_type,
        ratePerMarla: parseFloat(inv.rate_per_marla) || 0,
        totalValue: parseFloat(inv.total_value) || 0,
        saleValue: parseFloat(inv.sale_value) || 0,
        plotFeatures: typeof inv.plot_features === 'string' ? JSON.parse(inv.plot_features) : inv.plot_features,
        plotFeature: inv.plot_feature,
        transactionId: inv.transaction_id,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at
      })),
      masterProjects: masterProjects.rows.map(mp => ({
        ...mp,
        totalUnits: mp.total_units,
        availableUnits: mp.available_units,
        soldUnits: mp.sold_units,
        reservedUnits: mp.reserved_units,
        blockedUnits: mp.blocked_units,
        totalSaleValue: parseFloat(mp.total_sale_value) || 0,
        totalReceived: parseFloat(mp.total_received) || 0,
        totalReceivable: parseFloat(mp.total_receivable) || 0,
        totalOverdue: parseFloat(mp.total_overdue) || 0,
        totalBrokerCommission: parseFloat(mp.total_broker_commission) || 0,
        totalBrokerCommissionPaid: parseFloat(mp.total_broker_commission_paid) || 0,
        totalCompanyRepCommission: parseFloat(mp.total_company_rep_commission) || 0,
        totalCompanyRepCommissionPaid: parseFloat(mp.total_company_rep_commission_paid) || 0,
        createdAt: mp.created_at,
        updatedAt: mp.updated_at
      })),
      settings: settingsObj,
      lastUpdated: new Date().toISOString()
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Migration /all error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;