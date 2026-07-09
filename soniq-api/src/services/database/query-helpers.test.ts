import { describe, it, expect } from "vitest";
import { safeSortColumn, buildOrderClause } from "./query-helpers.js";

describe("safeSortColumn", () => {
  const allowed = new Set(["created_at", "name", "updated_at", "id"]);
  const fallback = "created_at";

  it("returns the requested column when it is on the allow-list", () => {
    expect(safeSortColumn("name", allowed, fallback)).toBe("name");
    expect(safeSortColumn("updated_at", allowed, fallback)).toBe("updated_at");
  });

  it("falls back to the safe default when the column is not allow-listed", () => {
    expect(safeSortColumn("password", allowed, fallback)).toBe(fallback);
  });

  it("falls back when requested is undefined", () => {
    expect(safeSortColumn(undefined, allowed, fallback)).toBe(fallback);
  });

  it("rejects SQL injection strings by falling back to the safe default", () => {
    expect(safeSortColumn("id); DROP TABLE users--", allowed, fallback)).toBe(
      fallback,
    );
    expect(safeSortColumn("name; DELETE FROM tenants", allowed, fallback)).toBe(
      fallback,
    );
    expect(
      safeSortColumn("1; UPDATE users SET admin=true", allowed, fallback),
    ).toBe(fallback);
  });

  it("is case/exact sensitive: a near-match not in the set falls back", () => {
    // "NAME" is not literally in the allow-list, so it must not pass through.
    expect(safeSortColumn("NAME", allowed, fallback)).toBe(fallback);
  });
});

describe("buildOrderClause", () => {
  it("builds an ORDER BY clause for a bare identifier", () => {
    expect(buildOrderClause("created_at", "desc")).toBe(
      "ORDER BY created_at DESC",
    );
    expect(buildOrderClause("name", "asc")).toBe("ORDER BY name ASC");
  });

  it("defaults to ASC when no direction is given", () => {
    expect(buildOrderClause("id")).toBe("ORDER BY id ASC");
  });

  it("only ever emits ASC or DESC (never raw sortOrder)", () => {
    // Any non-"desc" value must resolve to ASC, never be interpolated.
    // @ts-expect-error deliberately passing an unexpected direction value
    expect(buildOrderClause("id", "desc; DROP TABLE x")).toBe(
      "ORDER BY id ASC",
    );
  });

  it("allows schema/table-qualified identifiers", () => {
    expect(buildOrderClause("public.users", "asc")).toBe(
      "ORDER BY public.users ASC",
    );
  });

  it("throws on an injection payload in the sort column", () => {
    expect(() => buildOrderClause("id); DROP TABLE users--")).toThrow(
      /Invalid sort column/,
    );
    expect(() => buildOrderClause("name; DELETE")).toThrow(
      /Invalid sort column/,
    );
  });

  it("throws on a column containing spaces or a subquery", () => {
    expect(() => buildOrderClause("(SELECT 1)")).toThrow(/Invalid sort column/);
    expect(() => buildOrderClause("created_at, name")).toThrow(
      /Invalid sort column/,
    );
  });

  it("throws on an empty column", () => {
    expect(() => buildOrderClause("")).toThrow(/Invalid sort column/);
  });
});
