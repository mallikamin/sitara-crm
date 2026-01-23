import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all master projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM master_projects ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get master project by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM master_projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Master project not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create master project
router.post('/', async (req, res) => {
  try {
    const {
      id, name, description, location, totalUnits, availableUnits, soldUnits,
      reservedUnits, blockedUnits, totalSaleValue, totalReceived, totalReceivable,
      totalOverdue, totalBrokerCommission, totalBrokerCommissionPaid,
      totalCompanyRepCommission, totalCompanyRepCommissionPaid
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO master_projects (id, name, description, location, total_units, available_units, sold_units,
                                     reserved_units, blocked_units, total_sale_value, total_received, total_receivable,
                                     total_overdue, total_broker_commission, total_broker_commission_paid,
                                     total_company_rep_commission, total_company_rep_commission_paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        id, name, description, location, totalUnits || 0, availableUnits || 0, soldUnits || 0,
        reservedUnits || 0, blockedUnits || 0, totalSaleValue || 0, totalReceived || 0,
        totalReceivable || 0, totalOverdue || 0, totalBrokerCommission || 0,
        totalBrokerCommissionPaid || 0, totalCompanyRepCommission || 0, totalCompanyRepCommissionPaid || 0
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update master project
router.put('/:id', async (req, res) => {
  try {
    const {
      name, description, location, totalUnits, availableUnits, soldUnits,
      reservedUnits, blockedUnits, totalSaleValue, totalReceived, totalReceivable,
      totalOverdue, totalBrokerCommission, totalBrokerCommissionPaid,
      totalCompanyRepCommission, totalCompanyRepCommissionPaid
    } = req.body;
    
    const result = await pool.query(
      `UPDATE master_projects 
       SET name = $1, description = $2, location = $3, total_units = $4, available_units = $5,
           sold_units = $6, reserved_units = $7, blocked_units = $8, total_sale_value = $9,
           total_received = $10, total_receivable = $11, total_overdue = $12,
           total_broker_commission = $13, total_broker_commission_paid = $14,
           total_company_rep_commission = $15, total_company_rep_commission_paid = $16
       WHERE id = $17
       RETURNING *`,
      [
        name, description, location, totalUnits, availableUnits, soldUnits,
        reservedUnits, blockedUnits, totalSaleValue, totalReceived, totalReceivable,
        totalOverdue, totalBrokerCommission, totalBrokerCommissionPaid,
        totalCompanyRepCommission, totalCompanyRepCommissionPaid, req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Master project not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete master project
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM master_projects WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Master project not found' });
    }
    res.json({ success: true, message: 'Master project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

