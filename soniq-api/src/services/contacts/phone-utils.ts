// Phone Number Utilities
// Uses libphonenumber-js for proper E.164 normalization

// Note: Install libphonenumber-js: npm install libphonenumber-js
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneValidationError";
  }
}

/**
 * Normalize phone number to E.164 format
 * E.164 format: +[country code][subscriber number]
 * Example: +14155551234
 *
 * @param phone - The phone number to normalize
 * @param defaultCountry - Default country code if not specified (default: US)
 * @returns Normalized phone number in E.164 format
 * @throws PhoneValidationError if phone is invalid
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = "US",
): string {
  if (!phone || typeof phone !== "string") {
    throw new PhoneValidationError("Phone number is required");
  }

  // Remove common formatting characters but keep + and digits
  const cleaned = phone.trim();

  // Try to parse the phone number
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);

  // Accept valid numbers, and also "possible" numbers for lead capture.
  // Some demo/test numbers can fail strict validity but should still persist.
  if (parsed && (parsed.isValid() || parsed.isPossible())) {
    return parsed.format("E.164");
  }

  // Fallback normalization for partially-valid input.
  const digitsOnly = cleaned.replace(/\D/g, "");

  // If it's 10 digits, assume US number.
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If it's 11 digits starting with 1, assume US number.
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  // Generic E.164-ish fallback for international numbers.
  if (
    cleaned.startsWith("+") &&
    digitsOnly.length >= 8 &&
    digitsOnly.length <= 15
  ) {
    return `+${digitsOnly}`;
  }

  throw new PhoneValidationError(
    `Invalid phone number format: ${phone}. Expected E.164 or national format.`,
  );
}

/**
 * Validate phone number without throwing
 * @returns true if valid, false otherwise
 */
export function isValidPhone(
  phone: string,
  defaultCountry: CountryCode = "US",
): boolean {
  try {
    normalizePhoneNumber(phone, defaultCountry);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format phone number for display
 * @param phone - E.164 formatted phone number
 * @param format - Display format: 'national', 'international', 'e164'
 */
export function formatPhoneNumber(
  phone: string,
  format: "NATIONAL" | "INTERNATIONAL" | "E.164" = "NATIONAL",
): string {
  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed) {
    return phone; // Return as-is if can't parse
  }
  return parsed.format(format);
}

/**
 * Get country code from phone number
 */
export function getPhoneCountry(phone: string): CountryCode | undefined {
  const parsed = parsePhoneNumberFromString(phone);
  return parsed?.country;
}

/**
 * Check if phone number is from a specific country
 */
export function isPhoneFromCountry(
  phone: string,
  country: CountryCode,
): boolean {
  const parsed = parsePhoneNumberFromString(phone);
  return parsed?.country === country;
}

/**
 * Extract phone number parts
 */
export function getPhoneParts(phone: string): {
  countryCode: string;
  nationalNumber: string;
  country?: CountryCode;
} | null {
  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed) {
    return null;
  }

  return {
    countryCode: parsed.countryCallingCode || "",
    nationalNumber: parsed.nationalNumber || "",
    country: parsed.country,
  };
}

/**
 * Check if two phone numbers are the same
 * Normalizes both before comparing
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  try {
    const normalized1 = normalizePhoneNumber(phone1);
    const normalized2 = normalizePhoneNumber(phone2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

/**
 * Mask phone number for privacy
 * Example: +14155551234 -> +1415***1234
 */
export function maskPhoneNumber(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed) {
    // Basic masking for unparseable numbers
    if (phone.length > 6) {
      return phone.slice(0, 3) + "***" + phone.slice(-4);
    }
    return "***";
  }

  const national = parsed.nationalNumber || "";
  if (national.length <= 4) {
    return `+${parsed.countryCallingCode}***`;
  }

  const masked = national.slice(0, 3) + "***" + national.slice(-4);

  return `+${parsed.countryCallingCode}${masked}`;
}
