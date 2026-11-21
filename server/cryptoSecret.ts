import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getDerivedKey(secret?: string): Buffer {
  const rawSecret =
    secret ||
    process.env.APP_ENCRYPTION_KEY ||
    'orcacraft-seduc-pi-secret-master-key-2026-aes256';
  return crypto.createHash('sha256').update(rawSecret).digest();
}

/**
 * Criptografa uma chave ou segredo sensível usando AES-256-GCM (Node.js native crypto)
 */
export function encryptSecret(plainText: string, customSecret?: string): string {
  const key = getDerivedKey(customSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descriptografa um segredo criptografado com AES-256-GCM
 */
export function decryptSecret(cipherPayload: string, customSecret?: string): string {
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de segredo criptografado inválido.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey(customSecret);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}
