/**
 * 🐘 DATABASE CONNECTION - POSTGRESQL
 * 
 * Migrated from SQLite to PostgreSQL (Supabase)
 * Date: 2026-01-23
 * 
 * Changes:
 * - better-sqlite3 → pg (PostgreSQL driver)
 * - Synchronous → Asynchronous (all functions now return Promises)
 * - Prepare statements → Query with $1, $2, $3 placeholders
 * - result.changes → result.rowCount
 */

import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export const getDb = (): Pool => {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error(' Unexpected PostgreSQL error:', err);
    });

    console.log('✅ PostgreSQL connection pool created');
  }

  return pool;
};

/**
 * Run a query (INSERT, UPDATE, DELETE)
 * Returns the query result with rowCount
 */
export const runQuery = async (sql: string, params: any[] = []): Promise<QueryResult> => {
  try {
    const db = getDb();
    const result = await db.query(sql, params);
    return result;
  } catch (error: any) {
    console.error('❌ Database error (runQuery):');
    console.error('   SQL:', sql);
    console.error('   Params:', params);
    console.error('   Error:', error.message);
    throw error;
  }
};

/**
 * Get a single row
 * Returns the first row or undefined
 */
export const getOne = async <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  try {
    const db = getDb();
    const result = await db.query(sql, params);
    return result.rows[0] as T | undefined;
  } catch (error: any) {
    console.error('❌ Database error (getOne):');
    console.error('   SQL:', sql);
    console.error('   Params:', params);
    console.error('   Error:', error.message);
    throw error;
  }
};

/**
 * Get multiple rows
 * Returns array of rows
 */
export const getAll = async <T>(sql: string, params: any[] = []): Promise<T[]> => {
  try {
    const db = getDb();
    const result = await db.query(sql, params);
    return result.rows as T[];
  } catch (error: any) {
    console.error('❌ Database error (getAll):');
    console.error('   SQL:', sql);
    console.error('   Params:', params);
    console.error('   Error:', error.message);
    throw error;
  }
};

/**
 * Execute transaction
 * PostgreSQL: Uses BEGIN/COMMIT/ROLLBACK
 */
export const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const db = getDb();
  const client = await db.connect();
  
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
};

/**
 * Close database connection pool
 */
export const closeDb = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
};

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const db = getDb();
    const result = await db.query('SELECT NOW() as time');
    console.log(`✅ Database connected at: ${result.rows[0].time}`);
    return true;
  } catch (error: any) {
    console.error(' Database connection failed:', error.message);
    return false;
  }
};
