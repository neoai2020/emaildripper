import { describe, expect, it } from "vitest";

import { TOOLTIPS } from "./tooltips";
import { UNCONFIGURED_APP } from "./user-facing-copy";

describe("A14 plain-language copy", () => {
  it("unconfigured app message avoids naming specific vendors in the sentence", () => {
    expect(UNCONFIGURED_APP.toLowerCase()).not.toContain("supabase");
    expect(UNCONFIGURED_APP.length).toBeGreaterThan(30);
  });

  it("dashboard last-tick tooltip does not reference internal database table names", () => {
    const body = TOOLTIPS["dashboard.lastTick"].body.toLowerCase();
    expect(body).not.toContain("tick_log");
    expect(body).not.toContain("campaign_leads");
  });

  it("CSV field map tooltip avoids raw JSON examples", () => {
    const body = TOOLTIPS["csv.fieldMap"].body;
    expect(body).not.toMatch(/\{"/);
    expect(body.toLowerCase()).toContain("column");
  });
});
