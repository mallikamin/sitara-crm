import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import customersRoutes from './routes/customers.js';
import brokersRoutes from './routes/brokers.js';
import companyRepsRoutes from './routes/companyReps.js';
import projectsRoutes from './routes/projects.js';
import receiptsRoutes from './routes/receipts.js';
import interactionsRoutes from './routes/interactions.js';
import inventoryRoutes from './routes/inventory.js';
import masterProjectsRoutes from './routes/masterProjects.js';
import commissionPaymentsRoutes from './routes/commissionPayments.js';
import settingsRoutes from './routes/settings.js';
import backupRoutes from './routes/backup.js';
import migrationRoutes from './routes/migration.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// API Routes
app.use('/api/customers', customersRoutes);
app.use('/api/brokers', brokersRoutes);
app.use('/api/company-reps', companyRepsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/master-projects', masterProjectsRoutes);
app.use('/api/commission-payments', commissionPaymentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/migration', migrationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

export default app;