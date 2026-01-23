import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create inventory item
router.post('/', async (req, res) => {
  try {
    const {
      id, projectName, block, unitShopNumber, unit, unitType, marlas, ratePerMarla,
      totalValue, saleValue, plotFeatures, plotFeature, status, transactionId
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO inventory (id, project_name, block, unit_shop_number, unit, unit_type, marlas, rate_per_marla,
                              total_value, sale_value, plot_features, plot_feature, status, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id, projectName, block, unitShopNumber, unit, unitType, marlas, ratePerMarla,
        totalValue || 0, saleValue || 0, JSON.stringify(plotFeatures || []), plotFeature,
        status || 'available', transactionId
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  try {
    const {
      projectName, block, unitShopNumber, unit, unitType, marlas, ratePerMarla,
      totalValue, saleValue, plotFeatures, plotFeature, status, transactionId
    } = req.body;
    
    const result = await pool.query(
      `UPDATE inventory 
       SET project_name = $1, block = $2, unit_shop_number = $3, unit = $4, unit_type = $5,
           marlas = $6, rate_per_marla = $7, total_value = $8, sale_value = $9,
           plot_features = $10, plot_feature = $11, status = $12, transaction_id = $13
       WHERE id = $14
       RETURNING *`,
      [
        projectName, block, unitShopNumber, unit, unitType, marlas, ratePerMarla,
        totalValue, saleValue, JSON.stringify(plotFeatures || []), plotFeature,
        status, transactionId, req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create inventory items
router.post('/bulk', async (req, res) => {
  try {
    const { inventory } = req.body;
    const results = [];
    
    for (const item of inventory) {
      const {
        id, projectName, block, unitShopNumber, unit, unitType, marlas, ratePerMarla,
        totalValue, saleValue, plotFeatures, plotFeature, status, transactionId
      } = item;
      try {
        const result = await pool.query(
          `INSERT INTO inventory (id, project_name, block, unit_shop_number, unit, unit_type, marlas, rate_per_marla,
                                  total_value, sale_value, plot_features, plot_feature, status, transaction_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
           project_name = EXCLUDED.project_name, block = EXCLUDED.block,
           unit_shop_number = EXCLUDED.unit_shop_number, unit = EXCLUDED.unit,
           unit_type = EXCLUDED.unit_type, marlas = EXCLUDED.marlas,
           rate_per_marla = EXCLUDED.rate_per_marla, total_value = EXCLUDED.total_value,
           sale_value = EXCLUDED.sale_value, plot_features = EXCLUDED.plot_features,
           plot_feature = EXCLUDED.plot_feature, status = EXCLUDED.status,
           transaction_id = EXCLUDED.transaction_id
           RETURNING *`,
          [
            id, projectName, block, unitShopNumber, unit, unitType, marlas, ratePerMarla,
            totalValue || 0, saleValue || 0, JSON.stringify(plotFeatures || []), plotFeature,
            status || 'available', transactionId
          ]
        );
        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting inventory item ${id}:`, err);
      }
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

