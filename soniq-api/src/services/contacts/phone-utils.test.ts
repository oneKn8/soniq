import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  isValidPhone,
  phonesMatch,
  PhoneValidationError,
} from "./phone-utils.js";

describe("normalizePhoneNumber (E.164)", () => {
  it("normalizes a formatted US number to E.164", () => {
    expect(normalizePhoneNumber("(415) 555-2671")).toBe("+14155552671");
  });

  it("normalizes a bare 10-digit US number", () => {
    expect(normalizePhoneNumber("4155552671")).toBe("+14155552671");
  });

  it("normalizes an 11-digit number starting with 1", () => {
    expect(normalizePhoneNumber("14155552671")).toBe("+14155552671");
  });

  it("preserves an already-E.164 US number", () => {
    expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
  });

  it("normalizes an international number when given a country hint", () => {
    // UK mobile in national format with GB default country.
    expect(normalizePhoneNumber("07400 123456", "GB")).toBe("+447400123456");
  });

  it("normalizes an international number already in +CC form", () => {
    expect(normalizePhoneNumber("+44 7400 123456")).toBe("+447400123456");
  });

  it("throws PhoneValidationError on empty input", () => {
    expect(() => normalizePhoneNumber("")).toThrow(PhoneValidationError);
    // @ts-expect-error testing non-string runtime input
    expect(() => normalizePhoneNumber(null)).toThrow(PhoneValidationError);
  });

  it("throws PhoneValidationError on clearly invalid input", () => {
    expect(() => normalizePhoneNumber("abc")).toThrow(PhoneValidationError);
    expect(() => normalizePhoneNumber("123")).toThrow(PhoneValidationError);
  });
});

describe("isValidPhone", () => {
  it("returns true for a valid number and false for garbage", () => {
    expect(isValidPhone("(415) 555-2671")).toBe(true);
    expect(isValidPhone("not-a-phone")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});

describe("phonesMatch", () => {
  it("treats differently formatted versions of the same number as equal", () => {
    expect(phonesMatch("(415) 555-2671", "+1 415-555-2671")).toBe(true);
    expect(phonesMatch("4155552671", "14155552671")).toBe(true);
  });

  it("returns false for different numbers", () => {
    expect(phonesMatch("4155552671", "4155552672")).toBe(false);
  });

  it("returns false (not throw) when one input is invalid", () => {
    expect(phonesMatch("garbage", "4155552671")).toBe(false);
  });
});
