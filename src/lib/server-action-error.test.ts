import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formatServerActionError } from "@/lib/server-action-error";

describe("formatServerActionError", () => {
  it("maps RSC digest noise to actionable copy", () => {
    const msg = formatServerActionError(
      new Error("An error occurred in the Server Components render. digest: abc123")
    );
    expect(msg).toMatch(/Campaigns/);
    expect(msg).not.toMatch(/digest/);
  });

  it("surfaces zod issues", () => {
    try {
      z.string().min(5).parse("hi");
    } catch (e) {
      expect(formatServerActionError(e)).toMatch(/5/);
    }
  });

  it("handles unknown values", () => {
    expect(formatServerActionError(null)).toMatch(/Something went wrong/);
  });
});
