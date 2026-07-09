import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encrypt,
  decrypt,
  isEncrypted,
  encryptIfNeeded,
} from "./encryption.js";

const VALID_KEY = "0123456789abcdef0123456789abcdef"; // 32 chars

describe("crypto/encryption", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = savedKey;
  });

  it("round-trips encrypt -> decrypt back to the original plaintext", () => {
    const plaintext = "super-secret-oauth-token-value";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.startsWith("enc:v2:")).toBe(true);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("round-trips unicode and long content", () => {
    for (const s of ["hello", "café ☕ 日本語", "a".repeat(1000), " "]) {
      expect(decrypt(encrypt(s))).toBe(s);
    }
  });

  it("cannot round-trip an empty string (empty ciphertext body is rejected)", () => {
    // Documents actual behavior: an empty plaintext yields an empty ciphertext
    // segment, which decrypt treats as malformed. encryptIfNeeded short-circuits
    // empty input to null before this can happen (covered below).
    expect(() => decrypt(encrypt(""))).toThrow(/Invalid encrypted value format/);
  });

  it("produces different ciphertext for the same plaintext (random salt + IV)", () => {
    const plaintext = "same-input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // Both must still decrypt back to the identical plaintext.
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
    // Salt segment (index 2) must differ between the two encryptions.
    expect(a.split(":")[2]).not.toBe(b.split(":")[2]);
  });

  it("throws when ENCRYPTION_KEY is unset (fail closed, never returns plaintext)", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("secret")).toThrow(/ENCRYPTION_KEY must be set/);
  });

  it("throws when ENCRYPTION_KEY is too short", () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("secret")).toThrow(/ENCRYPTION_KEY must be set/);
  });

  it("throws when decrypting a prefixed value without a key (fail closed, no ciphertext leak)", () => {
    const ciphertext = encrypt("secret");
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt(ciphertext)).toThrow(/ENCRYPTION_KEY must be set/);
  });

  it("passes through genuinely unprefixed (legacy plaintext) values unchanged", () => {
    // A value that was never encrypted must be returned as-is, not throw.
    expect(decrypt("plain-legacy-value")).toBe("plain-legacy-value");
    // Even with no key configured, unprefixed reads must not crash.
    delete process.env.ENCRYPTION_KEY;
    expect(decrypt("another-plain-value")).toBe("another-plain-value");
  });

  it("throws on a malformed prefixed value", () => {
    expect(() => decrypt("enc:v2:onlyonepart")).toThrow(
      /Invalid encrypted value format/,
    );
  });

  it("fails to decrypt when the auth tag is tampered (GCM integrity)", () => {
    const ciphertext = encrypt("integrity-protected");
    const parts = ciphertext.split(":");
    // Corrupt the auth tag segment (enc, v2, salt, iv, authTag, ct)
    const tag = parts[4];
    parts[4] = tag
      .split("")
      .map((ch, i) => (i === 0 ? (ch === "a" ? "b" : "a") : ch))
      .join("");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("isEncrypted reflects the enc: prefix", () => {
    expect(isEncrypted(encrypt("x"))).toBe(true);
    expect(isEncrypted("plain")).toBe(false);
  });

  it("encryptIfNeeded encrypts raw values, returns null for empty, and is idempotent", () => {
    expect(encryptIfNeeded(null)).toBeNull();
    expect(encryptIfNeeded(undefined)).toBeNull();
    expect(encryptIfNeeded("")).toBeNull();

    const once = encryptIfNeeded("token");
    expect(once).not.toBeNull();
    expect(isEncrypted(once as string)).toBe(true);
    expect(decrypt(once as string)).toBe("token");

    // Passing an already-encrypted value returns it unchanged (no double-encrypt).
    expect(encryptIfNeeded(once as string)).toBe(once);
  });
});
