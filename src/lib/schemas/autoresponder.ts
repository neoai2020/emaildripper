import { z } from "zod";

export const providerEnum = z.enum([
  "activecampaign",
  "aweber",
  "getresponse",
  "email_octopus",
  "other",
]);

export const autoresponderBaseSchema = z.object({
  name: z.string().min(1).max(200),
  provider: providerEnum,
  account_email: z.string().email().max(320),
  make_webhook_url: z.string().url().max(2000),
  webhook_secret: z.string().min(8).max(2000),
  daily_cap: z.coerce.number().int().positive().optional().nullable(),
  warmup_enabled: z.coerce.boolean().default(false),
  warmup_started_at: z.string().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
  notes: z.string().max(5000).optional().nullable(),
});

export type AutoresponderInput = z.infer<typeof autoresponderBaseSchema>;
