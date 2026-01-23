import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all receipts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM receipts ORDER BY date DESC, created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create receipt
router.post('/', async (req, res) => {
  try {
    const { id, customerId, projectId, installmentId, amount, date, method, reference, notes, receiptNumber, customerName, projectName } = req.body;
    
    // Update project received amount
    if (projectId && amount) {
      await pool.query(
        'UPDATE projects SET received = received + $1 WHERE id = $2',
        [amount, projectId]
      );
    }
    
    const result = await pool.query(
      `INSERT INTO receipts (id, customer_id, project_id, installment_id, amount, date, method, reference, notes, receipt_number, customer_name, project_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [id, customerId, projectId, installmentId, amount, date, method || 'cash', reference, notes, receiptNumber, customerName, projectName]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update receipt
router.put('/:id', async (req, res) => {
  try {
    const { customerId, projectId, installmentId, amount, date, method, reference, notes, receiptNumber, customerName, projectName } = req.body;
    
    // Get old receipt to adjust project amount
    const oldReceipt = await pool.query('SELECT amount, project_id FROM receipts WHERE id = $1', [req.params.id]);
    
    if (oldReceipt.rows.length > 0 && oldReceipt.rows[0].project_id) {
      const oldAmount = parseFloat(oldReceipt.rows[0].amount) || 0;
      const newAmount = parseFloat(amount) || 0;
      const difference = newAmount - oldAmount;
      
      if (difference !== 0) {
        await pool.query(
          'UPDATE projects SET received = received + $1 WHERE id = $2',
          [difference, oldReceipt.rows[0].project_id]
        );
      }
    }
    
    const result = await pool.query(
      `UPDATE receipts 
       SET customer_id = $1, project_id = $2, installment_id = $3, amount = $4, date = $5,
           method = $6, reference = $7, notes = $8, receipt_number = $9, customer_name = $10, project_name = $11
       WHERE id = $12
       RETURNING *`,
      [customerId, projectId, installmentId, amount, date, method, reference, notes, receiptNumber, customerName, projectName, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete receipt
router.delete('/:id', async (req, res) => {
  try {
    // Get receipt to adjust project amount
    const receipt = await pool.query('SELECT amount, project_id FROM receipts WHERE id = $1', [req.params.id]);
    
    if (receipt.rows.length > 0 && receipt.rows[0].project_id) {
      const amount = parseFloat(receipt.rows[0].amount) || 0;
      await pool.query(
        'UPDATE projects SET received = received - $1 WHERE id = $2',
        [amount, receipt.rows[0].project_id]
      );
    }
    
    const result = await pool.query('DELETE FROM receipts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }
    res.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create receipts
router.post('/bulk', async (req, res) => {
  try {
    const { receipts } = req.body;
    const results = [];
    
    for (const receipt of receipts) {
      const { id, customerId, projectId, installmentId, amount, date, method, reference, notes, receiptNumber, customerName, projectName } = receipt;
      try {
        // Update project received amount
        if (projectId && amount) {
          await pool.query(
            'UPDATE projects SET received = received + $1 WHERE id = $2',
            [amount, projectId]
          );
        }
        
        const result = await pool.query(
          `INSERT INTO receipts (id, customer_id, project_id, installment_id, amount, date, method, reference, notes, receipt_number, customer_name, project_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id, project_id = EXCLUDED.project_id,
           installment_id = EXCLUDED.installment_id, amount = EXCLUDED.amount,
           date = EXCLUDED.date, method = EXCLUDED.method, reference = EXCLUDED.reference,
           notes = EXCLUDED.notes, receipt_number = EXCLUDED.receipt_number,
           customer_name = EXCLUDED.customer_name, project_name = EXCLUDED.project_name
           RETURNING *`,
          [id, customerId, projectId, installmentId, amount, date, method || 'cash', reference, notes, receiptNumber, customerName, projectName]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting receipt ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

