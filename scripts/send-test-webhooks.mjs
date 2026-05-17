import { createHmac } from "node:crypto";

const WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const SECRET = process.env.MAKE_WEBHOOK_SECRET;
const CAMPAIGN_ID = "4b531ea1-5e86-4ef1-add4-a90b9cc0f36c";
const CAMPAIGN_TAG = "getresponce_1_main_import_20260517";

const LEADS = [
  { lead_id: "94eb96df-4809-4b7a-b1c4-5fc1bd6d3e84", email: "adiegav@gmail.com" },
  { lead_id: "279526f7-36a9-4afe-a34d-4fb78b9e4bba", email: "kathysgray59@gmail.com" },
  { lead_id: "bffe6c08-8cfd-4cff-8bc6-502627f937c0", email: "sarapertner1@gmail.com" },
];

function signPayload(body) {
  const canonical = [body.lead_id, body.campaign_id, body.email].join("|");
  const signature = createHmac("sha256", SECRET).update(canonical, "utf8").digest("hex");
  return { ...body, canonical, signed_payload: canonical, signature };
}

if (!WEBHOOK_URL || !SECRET) {
  console.error("Set MAKE_WEBHOOK_URL and MAKE_WEBHOOK_SECRET");
  process.exit(1);
}

for (const lead of LEADS) {
  const body = signPayload({
    email: lead.email,
    first_name: null,
    last_name: null,
    custom_fields: {},
    campaign_id: CAMPAIGN_ID,
    campaign_tag: CAMPAIGN_TAG,
    lead_id: lead.lead_id,
    attempt: 1,
    timestamp: new Date().toISOString(),
  });
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(lead.email, res.status, text.slice(0, 80), "sig", body.signature.slice(0, 16) + "…");
}
