import { z } from "zod";

export const launchCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  sourceLabel: z.string().max(200).optional().nullable(),
  autoresponderId: z.string().uuid(),
  emails: z.array(z.string().email()).min(1).max(5000),
  timeWindowHours: z.coerce.number().positive().max(24 * 60),
  startsAtIso: z.string(),
  quietHoursEnabled: z.boolean().default(false),
  quietStart: z.string().default("01:00"),
  quietEnd: z.string().default("06:00"),
  quietTz: z.string().min(1),
  maxConcurrentPerTick: z.coerce.number().int().min(1).max(10).default(3),
  tag: z.string().min(3).max(200),
});

export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;
