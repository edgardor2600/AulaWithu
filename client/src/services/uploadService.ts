import api from './api';
import { compressImageForCanvas, validateImageFile } from '../utils/imageCompression';

export interface UploadResponse {
  id: string;
  url: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
}

/**
 * Upload an image file to the server
 * Automatically compresses the image before uploading
 * @param file - Image file to upload
 * @returns Upload response with URL
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  try {
    // Validate file
    validateImageFile(file);
    
    // Compress image
    const compressedFile = await compressImageForCanvas(file);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', compressedFile);
    
    // Upload to server
    const response = await api.post<{ success: boolean; upload: UploadResponse }>(
      '/uploads',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    // ✅ CRÍTICO: Construir URL absoluta para que Fabric.js pueda cargar la imagen
    // El servidor retorna una URL relativa (/uploads/filename)
    // Necesitamos convertirla a URL absoluta (http://localhost:3002/uploads/filename)
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
    const serverBaseURL = baseURL.replace('/api', ''); // Remove /api suffix
    
    const uploadData = response.data.upload;
    
    // Construir URL absoluta
    const absoluteURL = uploadData.url.startsWith('http') 
      ? uploadData.url 
      : `${serverBaseURL}${uploadData.url}`;
    
    return {
      ...uploadData,
      url: absoluteURL, // Override with absolute URL
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
}

/**
 * Delete an uploaded image
 * @param uploadId - ID of the upload to delete
 */
export async function deleteUpload(uploadId: string): Promise<void> {
  try {
    await api.delete(`/uploads/${uploadId}`);
  } catch (error) {
    console.error('Error deleting upload:', error);
    throw new Error('Failed to delete upload');
  }
}
