import multer from 'multer';
import path from 'path';
import { generateId } from '../utils/id-generator';
import { ValidationError } from '../utils/AppError';

// Uploads directory
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../../uploads');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-uuid-originalname
    const uniqueSuffix = `${Date.now()}-${generateId()}`;
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const filename = `${uniqueSuffix}-${nameWithoutExt}${ext}`;
    cb(null, filename);
  },
});

// File filter - only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed mime types
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Single file upload middleware
export const uploadSingle = upload.single('file');
