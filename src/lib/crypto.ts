import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const MASTER_KEY = process.env.MASTER_KEY || '';

if (!MASTER_KEY) {
  console.warn('MASTER_KEY not set - do not use in production');
}

export function encrypt(text: string): string {
  const key = Buffer.from(MASTER_KEY, 'base64');
  if (key.length !== 32) throw new Error('MASTER_KEY must be 32 bytes (base64)');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encryptedB64] = payload.split(':');
  const key = Buffer.from(MASTER_KEY, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
