import { describe, expect, it } from "vitest";

import {
  sanitizeMakeCustomFields,
  signMakePayload,
  verifyMakePayloadSignature,
} from "@/lib/make-webhook";

describe("make-webhook HMAC", () => {
  const secret = "test-secret";
  const body = {
    email: "a@b.co",
    first_name: "A",
    last_name: "B",
    custom_fields: { tier: "gold" },
    campaign_id: "c1",
    campaign_tag: "t1",
    lead_id: "l1",
    attempt: 1,
    timestamp: "2026-05-09T12:00:00.000Z",
  };

  it("accepts a valid signature", () => {
    const signed = signMakePayload(body, secret);
    expect(signed.canonical).toBe("l1|c1|a@b.co");
    expect(signed.signature).toBe(
      "18d7d38fcefa90765dc176bbe8d4d87a4d8681166d9b4e28dd123ffd4e283a76"
    );
    expect(verifyMakePayloadSignature(signed, secret)).toBe(true);
  });

  it("rejects tampered email", () => {
    const signed = signMakePayload(body, secret);
    const tampered = { ...signed, email: "evil@b.co" };
    expect(verifyMakePayloadSignature(tampered, secret)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const signed = signMakePayload(body, secret);
    expect(verifyMakePayloadSignature(signed, "other")).toBe(false);
  });

  it("strips signing fields from custom_fields on outbound payload", () => {
    const signed = signMakePayload(
      {
        ...body,
        custom_fields: { tier: "gold", lead_id: "wrong", campaign_id: "wrong", signature: "wrong" },
      },
      secret
    );
    expect(signed.custom_fields).toEqual({ tier: "gold" });
    expect(signed.lead_id).toBe("l1");
    expect(signed.signature).toBe(
      "18d7d38fcefa90765dc176bbe8d4d87a4d8681166d9b4e28dd123ffd4e283a76"
    );
  });

  it("sanitizeMakeCustomFields removes reserved keys only", () => {
    expect(
      sanitizeMakeCustomFields({
        tier: "gold",
        lead_id: "x",
        campaign_id: "y",
        signature: "z",
        canonical: "c",
      })
    ).toEqual({ tier: "gold" });
  });

  it("ignores timestamp when verifying", () => {
    const signed = signMakePayload(body, secret);
    const tampered = { ...signed, timestamp: "2099-01-01T00:00:00.000Z" };
    expect(verifyMakePayloadSignature(tampered, secret)).toBe(true);
  });
});
