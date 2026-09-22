import fs from 'fs';
import path from 'path';
import { runQuery, getAll } from './database';
import { logger } from '../utils/logger';

export interface MigrationRecord {
  id: number;
  name: string;
  executed_at: string;
}

export class MigrationRunner {
  private static migrationsDir = process.env.MIGRATIONS_DIR || 
    path.resolve(__dirname, '../../../database/migrations-postgres');

  /**
   * Run all pending PostgreSQL migrations in sequential order.
   * Creates the _migrations table if it does not already exist.
   */
  static async run(): Promise<{ applied: string[]; alreadyUpToDate: boolean }> {
    const applied: string[] = [];

    try {
      // 1. Ensure control table exists
      await runQuery(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Validate migrations directory
      if (!fs.existsSync(this.migrationsDir)) {
        logger.warn(`[MigrationRunner] Migrations directory not found: ${this.migrationsDir}`);
        return { applied, alreadyUpToDate: true };
      }

      // 3. Read and sort migration files
      const files = fs
        .readdirSync(this.migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      // 4. Fetch already executed migrations
      const executedRows = await getAll<MigrationRecord>(
        'SELECT name FROM _migrations ORDER BY id ASC'
      );
      const executedNames = new Set(executedRows.map((r) => r.name));

      // 5. Execute pending migrations in sequence
      for (const file of files) {
        if (!executedNames.has(file)) {
          const filePath = path.join(this.migrationsDir, file);
          const sql = fs.readFileSync(filePath, 'utf-8');

          if (!sql.trim()) {
            continue;
          }

          logger.info(`[MigrationRunner] Applying migration: ${file}...`);

          // Execute the migration script
          await runQuery(sql);

          // Record as executed
          await runQuery('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          applied.push(file);

          logger.info(`[MigrationRunner] Applied successfully: ${file}`);
        }
      }

      if (applied.length === 0) {
        logger.info('[MigrationRunner] All migrations are up to date. (0 pending)');
        return { applied, alreadyUpToDate: true };
      } else {
        logger.info(`[MigrationRunner] Applied ${applied.length} pending migrations.`);
        return { applied, alreadyUpToDate: false };
      }
    } catch (error: any) {
      logger.error(`[MigrationRunner] Migration failed: ${error.message}`);
      throw error;
    }
  }
}
