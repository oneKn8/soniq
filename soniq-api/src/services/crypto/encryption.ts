/**
 * Application-level encryption for sensitive data (OAuth tokens, PINs, etc.)
 * Uses AES-256-GCM with a per-value random salt and per-value random IV.
 *
 * Fail-closed: ENCRYPTION_KEY (>= 32 chars) is REQUIRED in every environment.
 * When it is missing or too short, encrypt/decrypt THROW rather than silently
 * returning plaintext. This guarantees sensitive values are never persisted or
 * returned unprotected.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

// Legacy static salt - kept ONLY so values encrypted before the per-value-salt
// change can still be decrypted. New values never use it.
const LEGACY_SALT = "soniq-encryption-salt";

const ENCRYPTED_PREFIX = "enc:";
const V2_MARKER = "v2";

/**
 * Return the raw ENCRYPTION_KEY, failing closed if it is unset or too weak.
 */
function getKeyMaterial(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY must be set (>= 32 chars) for encryption/decryption",
    );
  }
  return key;
}

/**
 * Derive an AES-256 key from the master key and a per-value salt.
 */
function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getKeyMaterial(), salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string. Returns prefixed, versioned ciphertext:
 *   enc:v2:<saltHex>:<ivHex>:<authTagHex>:<ciphertextHex>
 * Throws if ENCRYPTION_KEY is missing/weak (never returns plaintext).
 */
export function encrypt(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${ENCRYPTED_PREFIX}${V2_MARKER}:${salt.toString("hex")}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string.
 * - Genuinely unprefixed values (never encrypted) are returned unchanged so
 *   reads of legacy un-encrypted columns don't crash.
 * - Prefixed values require a valid ENCRYPTION_KEY; if it is missing/weak this
 *   THROWS (fail closed) instead of returning ciphertext.
 */
export function decrypt(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

  const stripped = value.slice(ENCRYPTED_PREFIX.length);
  const parts = stripped.split(":");

  // Versioned format: v2:<salt>:<iv>:<authTag>:<ciphertext>
  if (parts[0] === V2_MARKER) {
    const [, saltHex, ivHex, authTagHex, encrypted] = parts;
    if (!saltHex || !ivHex || !authTagHex || !encrypted) {
      throw new Error("Invalid encrypted value format");
    }
    const key = deriveKey(Buffer.from(saltHex, "hex"));
    return decryptWith(key, ivHex, authTagHex, encrypted);
  }

  // Legacy format (no version marker): <iv>:<authTag>:<ciphertext> with the
  // old static salt. Kept for backward compatibility only.
  const [ivHex, authTagHex, encrypted] = parts;
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted value format");
  }
  const key = scryptSync(getKeyMaterial(), LEGACY_SALT, KEY_LENGTH);
  return decryptWith(key, ivHex, authTagHex, encrypted);
}

function decryptWith(
  key: Buffer,
  ivHex: string,
  authTagHex: string,
  encrypted: string,
): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
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
 * Returns null for empty input (nothing to protect).
 */
export function encryptIfNeeded(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}
