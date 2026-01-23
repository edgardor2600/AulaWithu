import { runQuery, getOne, getAll } from '../database';
import { Upload } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class UploadsRepository {
  // Create upload record
  static async create(data: { 
    filename: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    uploaded_by: string;
    file_path: string;
  }): Promise<Upload> {
    const id = generateId();
    
    await runQuery(
      `INSERT INTO uploads (id, filename, original_name, mime_type, size_bytes, uploaded_by, file_path) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.filename, data.original_name, data.mime_type, data.size_bytes, data.uploaded_by, data.file_path]
    );
    
    const upload = await this.getById(id);
    if (!upload) throw new Error('Failed to create upload record');
    return upload;
  }

  // Get upload by ID
  static async getById(id: string): Promise<Upload | undefined> {
    return await getOne<Upload>(`SELECT * FROM uploads WHERE id = $1`, [id]);
  }

  // Get upload by filename
  static async getByFilename(filename: string): Promise<Upload | undefined> {
    return await getOne<Upload>(`SELECT * FROM uploads WHERE filename = $1`, [filename]);
  }

  // Get all uploads
  static async getAll(): Promise<Upload[]> {
    return await getAll<Upload>(`SELECT * FROM uploads ORDER BY uploaded_at DESC`);
  }

  // Get uploads by user
  static async getByUser(userId: string): Promise<Upload[]> {
    return await getAll<Upload>(
      `SELECT * FROM uploads WHERE uploaded_by = $1 ORDER BY uploaded_at DESC`,
      [userId]
    );
  }

  // Get uploads with user info
  static async getAllWithUserInfo(): Promise<any[]> {
    return await getAll(`
      SELECT u.*, us.name as uploader_name, us.role as uploader_role
      FROM uploads u
      JOIN users us ON u.uploaded_by = us.id
      ORDER BY u.uploaded_at DESC
    `);
  }

  // Delete upload
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(`DELETE FROM uploads WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Get total storage used by user
  static async getTotalSizeByUser(userId: string): Promise<number> {
    const result = await getOne<{ total: string | number | null }>(
      `SELECT SUM(size_bytes) as total FROM uploads WHERE uploaded_by = $1`,
      [userId]
    );
    return Number(result?.total) || 0;
  }

  // Get total storage used
  static async getTotalSize(): Promise<number> {
    const result = await getOne<{ total: string | number | null }>(
      `SELECT SUM(size_bytes) as total FROM uploads`
    );
    return Number(result?.total) || 0;
  }
}
