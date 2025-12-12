import { UploadsRepository } from '../db/repositories';
import { Upload } from '../types/database';
import { NotFoundError, ForbiddenError } from '../utils/AppError';
import fs from 'fs';
import path from 'path';

export class UploadService {
  // Create upload record
  static async create(data: {
    filename: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    uploaded_by: string;
    file_path: string;
  }): Promise<Upload> {
    const upload = UploadsRepository.create(data);
    return upload;
  }

  // Get upload by ID
  static async getById(uploadId: string): Promise<Upload> {
    const upload = UploadsRepository.getById(uploadId);
    if (!upload) {
      throw new NotFoundError('Upload');
    }
    return upload;
  }

  // Get upload by filename
  static async getByFilename(filename: string): Promise<Upload> {
    const upload = UploadsRepository.getByFilename(filename);
    if (!upload) {
      throw new NotFoundError('Upload');
    }
    return upload;
  }

  // Get all uploads
  static async getAll(): Promise<Upload[]> {
    return UploadsRepository.getAll();
  }

  // Get uploads by user
  static async getByUser(userId: string): Promise<Upload[]> {
    return UploadsRepository.getByUser(userId);
  }

  // Delete upload (only uploader or admin)
  static async delete(uploadId: string, userId: string, userRole: string): Promise<void> {
    // Get upload
    const upload = UploadsRepository.getById(uploadId);
    if (!upload) {
      throw new NotFoundError('Upload');
    }

    // Check permission (owner or teacher can delete)
    if (upload.uploaded_by !== userId && userRole !== 'teacher') {
      throw new ForbiddenError('You can only delete your own uploads');
    }

    // Delete file from filesystem
    const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../../uploads');
    const filePath = path.join(uploadsDir, upload.filename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue even if file deletion fails
    }

    // Delete from database
    const deleted = UploadsRepository.delete(uploadId);
    if (!deleted) {
      throw new NotFoundError('Upload');
    }
  }

  // Get total storage used
  static async getTotalStorage(): Promise<number> {
    return UploadsRepository.getTotalSize();
  }

  // Get storage used by user
  static async getUserStorage(userId: string): Promise<number> {
    return UploadsRepository.getTotalSizeByUser(userId);
  }
}
