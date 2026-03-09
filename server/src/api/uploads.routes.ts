import { Router } from 'express';
import { param } from 'express-validator';
import { UploadService } from '../services/upload.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { uploadSingle } from '../config/multer.config';
import { validateMagicNumbers } from '../utils/file-type';
import path from 'path';
import fs from 'fs';
import { ValidationError } from '../utils/AppError';

const router = Router();

// POST /api/uploads - Upload file
router.post(
  '/',
  authMiddleware,
  uploadSingle,
  asyncHandler(async (req: any, res: any) => {
    // Check if file was uploaded
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const userId = req.user.userId;
    const file = req.file;
    const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../../uploads');
    const savedPath = path.join(uploadsDir, file.filename);

    // FIX-14: Validate actual file content by magic numbers.
    // This prevents spoofed Content-Type attacks (e.g. sending an .exe
    // disguised as image/png). We read the first 12 bytes from disk.
    const isValidFile = validateMagicNumbers(savedPath, file.mimetype);
    if (!isValidFile) {
      // Remove the invalid file before responding
      try { fs.unlinkSync(savedPath); } catch { /* ignore */ }
      throw new ValidationError(
        'File content does not match the declared type. Only real image files are accepted.'
      );
    }

    // Create upload record
    const upload = await UploadService.create({
      filename: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: userId,
      file_path: `/uploads/${file.filename}`,
    });

    res.status(201).json({
      success: true,
      upload: {
        id: upload.id,
        url: `/uploads/${upload.filename}`,
        filename: upload.filename,
        original_name: upload.original_name,
        mime_type: upload.mime_type,
        size_bytes: upload.size_bytes,
        uploaded_at: upload.uploaded_at,
      },
    });
  })
);


// GET /api/uploads/:filename - Get file
// FIX-SECURITY: Protección contra path traversal
// Un atacante podría enviar "../../../server/.env" para leer archivos fuera de uploads
router.get(
  '/:filename',
  [
    param('filename')
      .notEmpty().withMessage('Filename is required')
      // Capa 1: Solo permitir caracteres seguros. Bloquea ../, \, %2f y similares
      .matches(/^[\w\-. ]+$/).withMessage('Invalid filename'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { filename } = req.params;

    // Capa 2: Verificar matemáticamente que la ruta resuelta esté dentro de uploads
    // path.resolve elimina cualquier ".." que pueda haber escapado la validación anterior
    const uploadsDir = path.resolve(
      process.env.UPLOADS_DIR || path.join(__dirname, '../../../uploads')
    );
    const filePath = path.resolve(path.join(uploadsDir, filename));

    // Si la ruta final no comienza con uploadsDir, alguien intentó escapar del directorio
    if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
      throw new ValidationError('Access denied: invalid file path');
    }

    // Verificar que el archivo existe en la BD (previene enumerar archivos del disco)
    await UploadService.getByFilename(filename);

    res.sendFile(filePath);
  })
);

// DELETE /api/uploads/:id - Delete upload
router.delete(
  '/:id',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Upload ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    await UploadService.delete(id, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Upload deleted successfully',
    });
  })
);

// GET /api/uploads - Get all uploads (authenticated users)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const uploads = await UploadService.getAll();

    res.status(200).json({
      success: true,
      count: uploads.length,
      uploads,
    });
  })
);

export default router;
