import fs from 'fs';
import path from 'path';

/**
 * Database monitoring utilities
 */

export function logDatabaseSize(dbPath: string): void {
  try {
    const stats = fs.statSync(dbPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`📊 Database size: ${sizeMB} MB`);
  } catch (error) {
    console.error('Error reading database size:', error);
  }
}

export function getDatabaseStats(dbPath: string): { sizeMB: number; sizeBytes: number } | null {
  try {
    const stats = fs.statSync(dbPath);
    return {
      sizeBytes: stats.size,
      sizeMB: parseFloat((stats.size / 1024 / 1024).toFixed(2))
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}

/**
 * VACUUM can be run manually when needed:
 * - Reclaims space from deleted records
 * - Defragments the database
 * - WARNING: Blocks all operations while running
 * 
 * Usage:
 *   import { db } from './database';
 *   db.exec('VACUUM');
 */
