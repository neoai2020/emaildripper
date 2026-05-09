export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function defaultCampaignTag(
  autoresponderName: string,
  campaignName: string,
  at: Date = new Date()
): string {
  const ymd = at.toISOString().slice(0, 10).replace(/-/g, "");
  const base = `${slugify(autoresponderName)}_${slugify(campaignName)}_${ymd}`;
  return base.slice(0, 200);
}
