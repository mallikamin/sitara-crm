import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Production-ready pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://sitara_user:sitara_password_2024@localhost:5432/sitara_crm',
  
  // Connection pool settings
  max: 20,                        // Maximum connections in pool
  min: 2,                         // Minimum connections to maintain
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Timeout for new connections (5s)
  
  // Statement timeout (prevent long-running queries)
  statement_timeout: 30000,       // 30 second query timeout
  
  // For SSL in production (uncomment if needed)
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const pool = new Pool(poolConfig);

// Connection event handlers
pool.on('connect', (client) => {
  console.log('📦 Database connection established');
  
  // Set session parameters for each connection
  client.query("SET timezone = 'UTC'");
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err.message);
  
  // Don't exit on transient errors in production
  if (process.env.NODE_ENV !== 'production') {
    // In development, exit on persistent errors
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Is PostgreSQL running?');
    }
  }
});

pool.on('remove', () => {
  console.log('📤 Database connection removed from pool');
});

// Health check function
export async function checkDatabaseHealth() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as time, current_database() as database');
    return {
      healthy: true,
      timestamp: result.rows[0].time,
      database: result.rows[0].database,
      poolSize: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

// Retry wrapper for database operations
export async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      const nonRetryableErrors = [
        '23505', // unique_violation
        '23503', // foreign_key_violation
        '22P02', // invalid_text_representation
        '42P01', // undefined_table
      ];
      
      if (nonRetryableErrors.includes(error.code)) {
        throw error;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Transaction helper
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closePool() {
  console.log('🔄 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

export default pool;