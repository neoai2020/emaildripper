import { describe, expect, it } from "vitest";

import { formatUtcDateTime, humanizeStatus } from "./format-display";

describe("formatUtcDateTime", () => {
  it("formats a known instant in UTC without seconds by default", () => {
    expect(formatUtcDateTime("2024-05-11T17:55:55.000Z")).toBe("May 11, 2024 · 5:55 PM");
  });

  it("includes seconds when requested", () => {
    expect(formatUtcDateTime("2024-05-11T17:55:55.000Z", { seconds: true })).toBe("May 11, 2024 · 5:55:55 PM");
  });

  it("handles null and invalid", () => {
    expect(formatUtcDateTime(null)).toBe("—");
    expect(formatUtcDateTime("")).toBe("—");
    expect(formatUtcDateTime("not-a-date")).toBe("—");
  });
});

describe("humanizeStatus", () => {
  it("title-cases tokens split on underscore", () => {
    expect(humanizeStatus("campaign_launched")).toBe("Campaign Launched");
    expect(humanizeStatus("previewing")).toBe("Previewing");
  });
});
