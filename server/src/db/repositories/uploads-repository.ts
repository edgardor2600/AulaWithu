import { runQuery, getOne, getAll } from '../database';
import { Upload } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class UploadsRepository {
  // Create upload record
  static create(data: { 
    filename: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    uploaded_by: string;
    file_path: string;
  }): Upload {
    const id = generateId();
    
    runQuery(
      `INSERT INTO uploads (id, filename, original_name, mime_type, size_bytes, uploaded_by, file_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.filename, data.original_name, data.mime_type, data.size_bytes, data.uploaded_by, data.file_path]
    );
    
    return this.getById(id)!;
  }

  // Get upload by ID
  static getById(id: string): Upload | undefined {
    return getOne<Upload>(`SELECT * FROM uploads WHERE id = ?`, [id]);
  }

  // Get upload by filename
  static getByFilename(filename: string): Upload | undefined {
    return getOne<Upload>(`SELECT * FROM uploads WHERE filename = ?`, [filename]);
  }

  // Get all uploads
  static getAll(): Upload[] {
    return getAll<Upload>(`SELECT * FROM uploads ORDER BY uploaded_at DESC`);
  }

  // Get uploads by user
  static getByUser(userId: string): Upload[] {
    return getAll<Upload>(
      `SELECT * FROM uploads WHERE uploaded_by = ? ORDER BY uploaded_at DESC`,
      [userId]
    );
  }

  // Get uploads with user info
  static getAllWithUserInfo(): any[] {
    return getAll(`
      SELECT u.*, us.name as uploader_name, us.role as uploader_role
      FROM uploads u
      JOIN users us ON u.uploaded_by = us.id
      ORDER BY u.uploaded_at DESC
    `);
  }

  // Delete upload
  static delete(id: string): boolean {
    const result = runQuery(`DELETE FROM uploads WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  // Get total storage used by user
  static getTotalSizeByUser(userId: string): number {
    const result = getOne<{ total: number | null }>(
      `SELECT SUM(size_bytes) as total FROM uploads WHERE uploaded_by = ?`,
      [userId]
    );
    return result?.total || 0;
  }

  // Get total storage used
  static getTotalSize(): number {
    const result = getOne<{ total: number | null }>(
      `SELECT SUM(size_bytes) as total FROM uploads`
    );
    return result?.total || 0;
  }
}
