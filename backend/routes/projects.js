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
      name, unit, marlas, rate, sale, received, status, cycle, notes, installments
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO projects (id, customer_id, broker_id, broker_commission_rate, company_rep_id, company_rep_commission_rate,
                             name, unit, marlas, rate, sale, received, status, cycle, notes, installments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id, customerId, brokerId, brokerCommissionRate || 1, companyRepId, companyRepCommissionRate || 1,
        name, unit, marlas || 0, rate || 0, sale || 0, received || 0,
        status || 'active', cycle || 'bi_annual', notes, JSON.stringify(installments || [])
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
      name, unit, marlas, rate, sale, received, status, cycle, notes, installments
    } = req.body;
    
    const result = await pool.query(
      `UPDATE projects 
       SET customer_id = $1, broker_id = $2, broker_commission_rate = $3, company_rep_id = $4, company_rep_commission_rate = $5,
           name = $6, unit = $7, marlas = $8, rate = $9, sale = $10, received = $11,
           status = $12, cycle = $13, notes = $14, installments = $15
       WHERE id = $16
       RETURNING *`,
      [
        customerId, brokerId, brokerCommissionRate, companyRepId, companyRepCommissionRate,
        name, unit, marlas, rate, sale, received, status, cycle, notes,
        JSON.stringify(installments || []), req.params.id
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
        name, unit, marlas, rate, sale, received, status, cycle, notes, installments
      } = project;
      try {
        const result = await pool.query(
          `INSERT INTO projects (id, customer_id, broker_id, broker_commission_rate, company_rep_id, company_rep_commission_rate,
                                 name, unit, marlas, rate, sale, received, status, cycle, notes, installments)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id, broker_id = EXCLUDED.broker_id,
           broker_commission_rate = EXCLUDED.broker_commission_rate,
           company_rep_id = EXCLUDED.company_rep_id, company_rep_commission_rate = EXCLUDED.company_rep_commission_rate,
           name = EXCLUDED.name, unit = EXCLUDED.unit, marlas = EXCLUDED.marlas, rate = EXCLUDED.rate,
           sale = EXCLUDED.sale, received = EXCLUDED.received, status = EXCLUDED.status,
           cycle = EXCLUDED.cycle, notes = EXCLUDED.notes, installments = EXCLUDED.installments
           RETURNING *`,
          [
            id, customerId, brokerId, brokerCommissionRate || 1, companyRepId, companyRepCommissionRate || 1,
            name, unit, marlas || 0, rate || 0, sale || 0, received || 0,
            status || 'active', cycle || 'bi_annual', notes, JSON.stringify(installments || [])
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

