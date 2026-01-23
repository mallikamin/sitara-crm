import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const {
      id, customerId, brokerId, brokerCommissionRate, companyRepId, companyRepCommissionRate,
      name, unit, marlas, rate, sale, received, status, cycle, notes, installments,
      firstDueDate, nextDueDate, installmentCount, paymentCycle, ratePerMarla,
      projectName, unitNumber, inventoryId, block
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO projects (id, customer_id, broker_id, broker_commission_rate, company_rep_id, company_rep_commission_rate,
                             name, unit, marlas, rate, sale, received, status, cycle, notes, installments,
                             first_due_date, next_due_date, installment_count, payment_cycle, rate_per_marla,
                             project_name, unit_number, inventory_id, block)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       RETURNING *`,
      [
        id, customerId, brokerId, brokerCommissionRate || 1, companyRepId, companyRepCommissionRate || 1,
        name, unit, marlas || 0, rate || ratePerMarla || 0, sale || 0, received || 0,
        status || 'active', cycle || paymentCycle || 'bi_annual', notes, 
        JSON.stringify(installments || installmentCount || 4),
        firstDueDate || null, nextDueDate || null,
        installmentCount || (typeof installments === 'number' ? installments : 4),
        paymentCycle || cycle || 'bi_annual', ratePerMarla || rate || 0,
        projectName || null, unitNumber || unit || null, inventoryId || null, block || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const {
      customerId, brokerId, brokerCommissionRate, companyRepId, companyRepCommissionRate,
      name, unit, marlas, rate, sale, received, status, cycle, notes, installments,
      firstDueDate, nextDueDate, installmentCount, paymentCycle, ratePerMarla,
      projectName, unitNumber, inventoryId, block
    } = req.body;
    
    const result = await pool.query(
      `UPDATE projects 
       SET customer_id = $1, broker_id = $2, broker_commission_rate = $3, company_rep_id = $4, company_rep_commission_rate = $5,
           name = $6, unit = $7, marlas = $8, rate = $9, sale = $10, received = $11,
           status = $12, cycle = $13, notes = $14, installments = $15,
           first_due_date = $16, next_due_date = $17, installment_count = $18, payment_cycle = $19,
           rate_per_marla = $20, project_name = $21, unit_number = $22, inventory_id = $23, block = $24,
           updated_at = NOW()
       WHERE id = $25
       RETURNING *`,
      [
        customerId, brokerId, brokerCommissionRate, companyRepId, companyRepCommissionRate,
        name, unit, marlas, rate || ratePerMarla, sale, received, status, cycle || paymentCycle, notes,
        JSON.stringify(installments || installmentCount || 4),
        firstDueDate, nextDueDate, installmentCount, paymentCycle || cycle, ratePerMarla || rate,
        projectName, unitNumber, inventoryId, block,
        req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create projects
router.post('/bulk', async (req, res) => {
  try {
    const { projects } = req.body;
    const results = [];
    
    for (const project of projects) {
      const {
        id, customerId, brokerId, brokerCommissionRate, companyRepId, companyRepCommissionRate,
        name, unit, marlas, rate, sale, received, status, cycle, notes, installments,
        firstDueDate, nextDueDate, installmentCount, paymentCycle, ratePerMarla,
        projectName, unitNumber, inventoryId, block
      } = project;
      try {
        const result = await pool.query(
          `INSERT INTO projects (id, customer_id, broker_id, broker_commission_rate, company_rep_id, company_rep_commission_rate,
                                 name, unit, marlas, rate, sale, received, status, cycle, notes, installments,
                                 first_due_date, next_due_date, installment_count, payment_cycle, rate_per_marla,
                                 project_name, unit_number, inventory_id, block)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id, broker_id = EXCLUDED.broker_id,
           broker_commission_rate = EXCLUDED.broker_commission_rate,
           company_rep_id = EXCLUDED.company_rep_id, company_rep_commission_rate = EXCLUDED.company_rep_commission_rate,
           name = EXCLUDED.name, unit = EXCLUDED.unit, marlas = EXCLUDED.marlas, rate = EXCLUDED.rate,
           sale = EXCLUDED.sale, received = EXCLUDED.received, status = EXCLUDED.status,
           cycle = EXCLUDED.cycle, notes = EXCLUDED.notes, installments = EXCLUDED.installments,
           first_due_date = EXCLUDED.first_due_date, next_due_date = EXCLUDED.next_due_date,
           installment_count = EXCLUDED.installment_count, payment_cycle = EXCLUDED.payment_cycle,
           rate_per_marla = EXCLUDED.rate_per_marla, project_name = EXCLUDED.project_name,
           unit_number = EXCLUDED.unit_number, inventory_id = EXCLUDED.inventory_id, block = EXCLUDED.block,
           updated_at = NOW()
           RETURNING *`,
          [
            id, customerId, brokerId, brokerCommissionRate || 1, companyRepId, companyRepCommissionRate || 1,
            name, unit, marlas || 0, rate || ratePerMarla || 0, sale || 0, received || 0,
            status || 'active', cycle || paymentCycle || 'bi_annual', notes,
            JSON.stringify(installments || installmentCount || 4),
            firstDueDate || null, nextDueDate || null,
            installmentCount || (typeof installments === 'number' ? installments : 4),
            paymentCycle || cycle || 'bi_annual', ratePerMarla || rate || 0,
            projectName || null, unitNumber || unit || null, inventoryId || null, block || null
          ]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting project ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;