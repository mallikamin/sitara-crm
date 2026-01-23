import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all company reps
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_reps ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get company rep by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_reps WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company rep not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create company rep
router.post('/', async (req, res) => {
  try {
    const { id, name, phone, email, designation, commissionRate, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO company_reps (id, name, phone, email, designation, commission_rate, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id, 
        name, 
        phone || null, 
        email || null, 
        designation || null, 
        commissionRate || 1, 
        status || 'active', 
        notes || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update company rep
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, designation, commissionRate, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE company_reps 
       SET name = $1, phone = $2, email = $3, designation = $4, 
           commission_rate = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, phone, email, designation, commissionRate, status, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company rep not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete company rep
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM company_reps WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company rep not found' });
    }
    res.json({ success: true, message: 'Company rep deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create company reps
router.post('/bulk', async (req, res) => {
  try {
    const { companyReps } = req.body;
    const results = [];
    
    for (const rep of companyReps) {
      const { id, name, phone, email, designation, commissionRate, status, notes } = rep;
      try {
        const result = await pool.query(
          `INSERT INTO company_reps (id, name, phone, email, designation, commission_rate, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email,
           designation = EXCLUDED.designation, commission_rate = EXCLUDED.commission_rate,
           status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            id, 
            name, 
            phone || null, 
            email || null, 
            designation || null, 
            commissionRate || 1, 
            status || 'active', 
            notes || null
          ]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting company rep ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;