/**
 * Application-level encryption for sensitive data (OAuth tokens, PINs, etc.)
 * Uses AES-256-GCM with per-value random IVs.
 *
 * Requires ENCRYPTION_KEY env var to be set. When not set, encrypt/decrypt
 * operations are skipped gracefully (for development/migration periods).
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT = "soniq-encryption-salt";
const ENCRYPTED_PREFIX = "enc:";

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;
  cachedKey = scryptSync(key, SALT, 32);
  return cachedKey;
}

/**
 * Encrypt a plaintext string. Returns prefixed ciphertext.
 * If ENCRYPTION_KEY is not set, returns the plaintext unchanged.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string. Handles both encrypted and plaintext inputs.
 * If the value is not encrypted (no prefix), returns it unchanged.
 */
export function decrypt(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

  const key = getEncryptionKey();
  if (!key) {
    console.warn("[CRYPTO] ENCRYPTION_KEY not set, cannot decrypt value");
    return value;
  }

  const stripped = value.slice(ENCRYPTED_PREFIX.length);
  const [ivHex, authTagHex, encrypted] = stripped.split(":");

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted value format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Check if a value is already encrypted.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt a value only if it's not already encrypted.
 */
export function encryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}
