/**
 * File type validation by magic numbers (file signatures).
 *
 * Why magic numbers instead of relying on Content-Type?
 * The HTTP mimetype header can be spoofed by the client — anyone can send
 * a .exe file with Content-Type: image/png. Reading the actual first bytes
 * of the file is the only reliable way to verify the format.
 *
 * Supported types: JPEG, PNG, GIF (87a / 89a), WebP.
 * SVG is text-based (XML) and is intentionally excluded — it can contain
 * arbitrary JavaScript, so we don't allow it.
 */

import fs from 'fs';

/** Files we accept and their hex magic signatures (first N bytes). */
const MAGIC_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [
    Buffer.from([0xff, 0xd8, 0xff]),   // JPEG / JFIF / Exif
  ],
  'image/jpg': [
    Buffer.from([0xff, 0xd8, 0xff]),
  ],
  'image/png': [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG
  ],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ],
  'image/webp': [
    // WebP: "RIFF" at offset 0 + "WEBP" at offset 8
    // We handle this specially in the check function below.
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // "RIFF"
  ],
};

/** Number of bytes to read from the file (enough for the longest signature). */
const READ_BYTES = 12;

/**
 * Reads the first bytes of a file on disk and checks that they match the
 * expected magic signature for the declared MIME type.
 *
 * @param filePath  Absolute path to the saved file.
 * @param mimetype  MIME type declared by the client (e.g. "image/png").
 * @returns         `true` if the file bytes match, `false` otherwise.
 */
export function validateMagicNumbers(filePath: string, mimetype: string): boolean {
  // Read the first N bytes synchronously (tiny overhead — just 12 bytes)
  const buffer = Buffer.alloc(READ_BYTES);
  let fd: number | undefined;

  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, READ_BYTES, 0);
  } catch {
    return false; // File unreadable — reject
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }

  const signatures = MAGIC_SIGNATURES[mimetype];
  if (!signatures) return false; // Unknown MIME type — reject

  return signatures.some((sig) => {
    // For WebP, we also need "WEBP" starting at byte 8
    if (mimetype === 'image/webp') {
      const riff  = buffer.subarray(0, 4).equals(sig);
      const webp  = buffer.subarray(8, 12).equals(Buffer.from('WEBP'));
      return riff && webp;
    }
    return buffer.subarray(0, sig.length).equals(sig);
  });
}

/**
 * Returns a human-readable list of accepted MIME types.
 * Useful for error messages.
 */
export function acceptedMimeTypes(): string[] {
  return Object.keys(MAGIC_SIGNATURES);
}
