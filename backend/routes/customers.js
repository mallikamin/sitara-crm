import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { id, name, cnic, phone, email, company, address, type, status, linkedBrokerId } = req.body;
    const result = await pool.query(
      `INSERT INTO customers (id, name, cnic, phone, email, company, address, type, status, linked_broker_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, name, cnic, phone, email, company, address, type || 'customer', status || 'active', linkedBrokerId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, cnic, phone, email, company, address, type, status, linkedBrokerId } = req.body;
    const result = await pool.query(
      `UPDATE customers 
       SET name = $1, cnic = $2, phone = $3, email = $4, company = $5, address = $6, 
           type = $7, status = $8, linked_broker_id = $9
       WHERE id = $10
       RETURNING *`,
      [name, cnic, phone, email, company, address, type, status, linkedBrokerId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create customers
router.post('/bulk', async (req, res) => {
  try {
    const { customers } = req.body;
    const results = [];
    
    for (const customer of customers) {
      const { id, name, cnic, phone, email, company, address, type, status, linkedBrokerId } = customer;
      try {
        const result = await pool.query(
          `INSERT INTO customers (id, name, cnic, phone, email, company, address, type, status, linked_broker_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, cnic = EXCLUDED.cnic, phone = EXCLUDED.phone,
           email = EXCLUDED.email, company = EXCLUDED.company, address = EXCLUDED.address,
           type = EXCLUDED.type, status = EXCLUDED.status, linked_broker_id = EXCLUDED.linked_broker_id
           RETURNING *`,
          [id, name, cnic, phone, email, company, address, type || 'customer', status || 'active', linkedBrokerId]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting customer ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

