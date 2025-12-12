import { randomUUID } from 'crypto';

// Generate a UUID v4
export const generateId = (): string => {
  return randomUUID();
};
