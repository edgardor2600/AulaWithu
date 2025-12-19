import imageCompression from 'browser-image-compression';

/**
 * Compression options for canvas images
 * - maxWidthOrHeight: Match canvas width for optimal quality
 * - maxSizeMB: Keep files small to avoid memory issues
 * - useWebWorker: Use web worker for better performance
 * - fileType: Convert to WebP for better compression
 */
const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 1200, // Match canvas width
  maxSizeMB: 0.5, // 500KB max
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.85, // Good balance between quality and size
};

/**
 * Compress an image file for canvas use
 * @param file - Original image file from user
 * @returns Compressed image file
 */
export async function compressImageForCanvas(file: File): Promise<File> {
  try {
    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Compress the image
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Validate image file before upload
 * @param file - File to validate
 * @returns true if valid, throws error otherwise
 */
export function validateImageFile(file: File): boolean {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB límite aumentado
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 50MB.');
  }
  
  return true;
}
