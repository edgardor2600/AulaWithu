import bcrypt from 'bcrypt';

/**
 * Password utilities for secure authentication
 * Uses bcrypt for password hashing with industry-standard practices
 */

// Salt rounds for bcrypt (10 is the recommended minimum)
// Higher values = more secure but slower (10 = ~100ms, 12 = ~400ms)
const SALT_ROUNDS = 10;

// Minimum password length requirement
const MIN_PASSWORD_LENGTH = 6;

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if password is invalid or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plaintext password with a hashed password
 * @param password - The plaintext password to verify
 * @param hash - The hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 * @throws Error if comparison fails
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Validate inputs
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Maximum length (bcrypt has a limit of 72 bytes)
  if (password.length > 72) {
    errors.push('Password is too long (max 72 characters)');
  }

  // Optional: Add more strength requirements here
  // For MVP, we keep it simple - just length requirements

  return {
    isValid: errors.length === 0,
    errors,
  };
}
