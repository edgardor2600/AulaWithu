import Database from 'better-sqlite3';
import path from 'path';

// Resolve path from project root, not from current file
const projectRoot = path.join(__dirname, '../../..');
const dbPath = process.env.DATABASE_PATH 
  ? path.join(projectRoot, process.env.DATABASE_PATH)
  : path.join(projectRoot, 'database/aula.db');

let db: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints
  }
  return db;
};

// Helper: Run a query (INSERT, UPDATE, DELETE)
export const runQuery = (sql: string, params: any[] = []): Database.RunResult => {
  try {
    const db = getDb();
    return db.prepare(sql).run(...params);
  } catch (error: any) {
    console.error('Database error (runQuery):', error.message);
    throw error;
  }
};

// Helper: Get a single row
export const getOne = <T>(sql: string, params: any[] = []): T | undefined => {
  try {
    const db = getDb();
    return db.prepare(sql).get(...params) as T | undefined;
  } catch (error: any) {
    console.error('Database error (getOne):', error.message);
    throw error;
  }
};

// Helper: Get multiple rows
export const getAll = <T>(sql: string, params: any[] = []): T[] => {
  try {
    const db = getDb();
    return db.prepare(sql).all(...params) as T[];
  } catch (error: any) {
    console.error('Database error (getAll):', error.message);
    throw error;
  }
};

// Helper: Execute transaction
export const transaction = <T>(callback: () => T): T => {
  const db = getDb();
  const txn = db.transaction(callback);
  return txn();
};

// Close database connection
export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
