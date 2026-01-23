import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all commission payments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM commission_payments ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get commission payment by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM commission_payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Commission payment not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create commission payment
router.post('/', async (req, res) => {
  try {
    const {
      id, projectId, recipientId, recipientType, recipientName, amount,
      paidAmount, remainingAmount, paymentDate, paymentMethod, paymentReference,
      notes, status
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO commission_payments (id, project_id, recipient_id, recipient_type, recipient_name, amount,
                                         paid_amount, remaining_amount, payment_date, payment_method,
                                         payment_reference, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id, projectId, recipientId, recipientType, recipientName, amount,
        paidAmount || 0, remainingAmount || amount, paymentDate, paymentMethod,
        paymentReference, notes, status || 'pending'
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update commission payment
router.put('/:id', async (req, res) => {
  try {
    const {
      projectId, recipientId, recipientType, recipientName, amount,
      paidAmount, remainingAmount, paymentDate, paymentMethod, paymentReference,
      notes, status
    } = req.body;
    
    const result = await pool.query(
      `UPDATE commission_payments 
       SET project_id = $1, recipient_id = $2, recipient_type = $3, recipient_name = $4,
           amount = $5, paid_amount = $6, remaining_amount = $7, payment_date = $8,
           payment_method = $9, payment_reference = $10, notes = $11, status = $12
       WHERE id = $13
       RETURNING *`,
      [
        projectId, recipientId, recipientType, recipientName, amount,
        paidAmount, remainingAmount, paymentDate, paymentMethod,
        paymentReference, notes, status, req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Commission payment not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete commission payment
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM commission_payments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Commission payment not found' });
    }
    res.json({ success: true, message: 'Commission payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create commission payments
router.post('/bulk', async (req, res) => {
  try {
    const { commissionPayments } = req.body;
    const results = [];
    
    for (const payment of commissionPayments) {
      const {
        id, projectId, recipientId, recipientType, recipientName, amount,
        paidAmount, remainingAmount, paymentDate, paymentMethod, paymentReference,
        notes, status
      } = payment;
      try {
        const result = await pool.query(
          `INSERT INTO commission_payments (id, project_id, recipient_id, recipient_type, recipient_name, amount,
                                             paid_amount, remaining_amount, payment_date, payment_method,
                                             payment_reference, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
           project_id = EXCLUDED.project_id, recipient_id = EXCLUDED.recipient_id,
           recipient_type = EXCLUDED.recipient_type, recipient_name = EXCLUDED.recipient_name,
           amount = EXCLUDED.amount, paid_amount = EXCLUDED.paid_amount,
           remaining_amount = EXCLUDED.remaining_amount, payment_date = EXCLUDED.payment_date,
           payment_method = EXCLUDED.payment_method, payment_reference = EXCLUDED.payment_reference,
           notes = EXCLUDED.notes, status = EXCLUDED.status
           RETURNING *`,
          [
            id, projectId, recipientId, recipientType, recipientName, amount,
            paidAmount || 0, remainingAmount || amount, paymentDate, paymentMethod,
            paymentReference, notes, status || 'pending'
          ]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting commission payment ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

