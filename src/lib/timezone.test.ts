import { describe, expect, it } from "vitest";

import { assertValidIanaTimeZone, isValidIanaTimeZone } from "@/lib/timezone";

describe("timezone", () => {
  it("accepts common IANA zones", () => {
    expect(isValidIanaTimeZone("Europe/Vienna")).toBe(true);
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidIanaTimeZone("Not/A_Zone")).toBe(false);
    expect(() => assertValidIanaTimeZone("bogus")).toThrow(/Invalid timezone/);
  });
});
