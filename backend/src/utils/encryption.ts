import crypto from 'crypto';
import { logger } from './logger';

/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment or generate one
 * In production, this should be stored securely (e.g., AWS Secrets Manager)
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    logger.warn('ENCRYPTION_KEY not set in environment. Using derived key from JWT_SECRET. This is not recommended for production!');
    
    // Derive a key from JWT_SECRET as fallback (not ideal but better than nothing)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('Neither ENCRYPTION_KEY nor JWT_SECRET is set in environment variables');
    }
    
    // Use PBKDF2 to derive a proper key
    return crypto.pbkdf2Sync(jwtSecret, 'encryption-salt', 100000, KEY_LENGTH, 'sha256');
  }
  
  // Decode the base64 encoded key
  const key = Buffer.from(keyString, 'base64');
  
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits). Got ${key.length} bytes.`);
  }
  
  return key;
}

/**
 * Generate a random encryption key
 * Use this to generate ENCRYPTION_KEY for your .env file
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('base64');
}

/**
 * Encrypt a string value
 * Returns a base64 encoded string containing: salt + iv + authTag + encrypted data
 */
export function encrypt(plainText: string): string {
  try {
    if (!plainText) {
      return '';
    }

    const key = getEncryptionKey();
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the auth tag for GCM mode
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * Expects a base64 encoded string containing: salt + iv + authTag + encrypted data
 */
export function decrypt(encryptedData: string): string {
  try {
    if (!encryptedData) {
      return '';
    }

    const key = getEncryptionKey();
    
    // Decode the base64 combined data
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a value (one-way encryption)
 * Useful for storing sensitive data that doesn't need to be decrypted
 */
export function hash(value: string): string {
  try {
    if (!value) {
      return '';
    }

    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  } catch (error) {
    logger.error('Hashing failed:', error);
    throw new Error('Failed to hash data');
  }
}

/**
 * Compare a plain text value with a hashed value
 */
export function compareHash(plainText: string, hashedValue: string): boolean {
  try {
    const newHash = hash(plainText);
    return crypto.timingSafeEqual(
      Buffer.from(newHash),
      Buffer.from(hashedValue)
    );
  } catch (error) {
    logger.error('Hash comparison failed:', error);
    return false;
  }
}

/**
 * Encrypt object fields
 * Useful for encrypting specific fields in a document
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const encrypted = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field] as string) as T[keyof T];
    }
  }
  
  return encrypted;
}

/**
 * Decrypt object fields
 * Useful for decrypting specific fields in a document
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const decrypted = { ...obj };
  
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decrypt(decrypted[field] as string) as T[keyof T];
      } catch (error) {
        logger.error(`Failed to decrypt field ${String(field)}:`, error);
        // Leave the field as is if decryption fails
      }
    }
  }
  
  return decrypted;
}
