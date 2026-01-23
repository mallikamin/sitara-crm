import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all brokers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brokers ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get broker by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brokers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Broker not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create broker
router.post('/', async (req, res) => {
  try {
    const { id, name, phone, cnic, email, address, company, commissionRate, bankDetails, notes, status, linkedCustomerId } = req.body;
    const result = await pool.query(
      `INSERT INTO brokers (id, name, phone, cnic, email, address, company, commission_rate, bank_details, notes, status, linked_customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [id, name, phone, cnic, email, address, company, commissionRate || 1, bankDetails, notes, status || 'active', linkedCustomerId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update broker
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, cnic, email, address, company, commissionRate, bankDetails, notes, status, linkedCustomerId } = req.body;
    const result = await pool.query(
      `UPDATE brokers 
       SET name = $1, phone = $2, cnic = $3, email = $4, address = $5, company = $6,
           commission_rate = $7, bank_details = $8, notes = $9, status = $10, linked_customer_id = $11
       WHERE id = $12
       RETURNING *`,
      [name, phone, cnic, email, address, company, commissionRate, bankDetails, notes, status, linkedCustomerId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Broker not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete broker
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM brokers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Broker not found' });
    }
    res.json({ success: true, message: 'Broker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create brokers
router.post('/bulk', async (req, res) => {
  try {
    const { brokers } = req.body;
    const results = [];
    
    for (const broker of brokers) {
      const { id, name, phone, cnic, email, address, company, commissionRate, bankDetails, notes, status, linkedCustomerId } = broker;
      try {
        const result = await pool.query(
          `INSERT INTO brokers (id, name, phone, cnic, email, address, company, commission_rate, bank_details, notes, status, linked_customer_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, phone = EXCLUDED.phone, cnic = EXCLUDED.cnic,
           email = EXCLUDED.email, address = EXCLUDED.address, company = EXCLUDED.company,
           commission_rate = EXCLUDED.commission_rate, bank_details = EXCLUDED.bank_details,
           notes = EXCLUDED.notes, status = EXCLUDED.status, linked_customer_id = EXCLUDED.linked_customer_id
           RETURNING *`,
          [id, name, phone, cnic, email, address, company, commissionRate || 1, bankDetails, notes, status || 'active', linkedCustomerId]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting broker ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

