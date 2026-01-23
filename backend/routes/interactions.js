import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all interactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM interactions ORDER BY date DESC, created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get interaction by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM interactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Interaction not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create interaction
router.post('/', async (req, res) => {
  try {
    const { 
      id, contactType, customerId, brokerId, type, status, priority, date, notes, nextFollowUp, contacts,
      subject, time, outcome, followUpDate, attachments, companyRepId, companyRepName
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO interactions (id, contact_type, customer_id, broker_id, type, status, priority, date, notes, next_follow_up, contacts,
                                subject, time, outcome, follow_up_date, attachments, company_rep_id, company_rep_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        id, contactType || 'customer', customerId, brokerId, type || 'call',
        status || 'follow_up', priority || 'medium', date, notes, nextFollowUp,
        JSON.stringify(contacts || []),
        subject || null, time || null, outcome || null, followUpDate || null,
        JSON.stringify(attachments || []), companyRepId || null, companyRepName || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update interaction
router.put('/:id', async (req, res) => {
  try {
    const { 
      contactType, customerId, brokerId, type, status, priority, date, notes, nextFollowUp, contacts,
      subject, time, outcome, followUpDate, attachments, companyRepId, companyRepName
    } = req.body;
    
    const result = await pool.query(
      `UPDATE interactions 
       SET contact_type = $1, customer_id = $2, broker_id = $3, type = $4, status = $5,
           priority = $6, date = $7, notes = $8, next_follow_up = $9, contacts = $10,
           subject = $11, time = $12, outcome = $13, follow_up_date = $14, attachments = $15,
           company_rep_id = $16, company_rep_name = $17, updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        contactType, customerId, brokerId, type, status, priority, date, notes, nextFollowUp,
        JSON.stringify(contacts || []),
        subject, time, outcome, followUpDate, JSON.stringify(attachments || []),
        companyRepId, companyRepName, req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Interaction not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete interaction
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM interactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Interaction not found' });
    }
    res.json({ success: true, message: 'Interaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create interactions
router.post('/bulk', async (req, res) => {
  try {
    const { interactions } = req.body;
    const results = [];
    
    for (const interaction of interactions) {
      const { 
        id, contactType, customerId, brokerId, type, status, priority, date, notes, nextFollowUp, contacts,
        subject, time, outcome, followUpDate, attachments, companyRepId, companyRepName
      } = interaction;
      try {
        const result = await pool.query(
          `INSERT INTO interactions (id, contact_type, customer_id, broker_id, type, status, priority, date, notes, next_follow_up, contacts,
                                    subject, time, outcome, follow_up_date, attachments, company_rep_id, company_rep_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
           contact_type = EXCLUDED.contact_type, customer_id = EXCLUDED.customer_id,
           broker_id = EXCLUDED.broker_id, type = EXCLUDED.type, status = EXCLUDED.status,
           priority = EXCLUDED.priority, date = EXCLUDED.date, notes = EXCLUDED.notes,
           next_follow_up = EXCLUDED.next_follow_up, contacts = EXCLUDED.contacts,
           subject = EXCLUDED.subject, time = EXCLUDED.time, outcome = EXCLUDED.outcome,
           follow_up_date = EXCLUDED.follow_up_date, attachments = EXCLUDED.attachments,
           company_rep_id = EXCLUDED.company_rep_id, company_rep_name = EXCLUDED.company_rep_name,
           updated_at = NOW()
           RETURNING *`,
          [
            id, contactType || 'customer', customerId, brokerId, type || 'call',
            status || 'follow_up', priority || 'medium', date, notes, nextFollowUp,
            JSON.stringify(contacts || []),
            subject || null, time || null, outcome || null, followUpDate || null,
            JSON.stringify(attachments || []), companyRepId || null, companyRepName || null
          ]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting interaction ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;