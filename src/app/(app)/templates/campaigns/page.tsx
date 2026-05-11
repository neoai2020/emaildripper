import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

import { createCampaignTemplateAction, deleteCampaignTemplateAction } from "../actions";

export default async function CampaignTemplatesPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Campaign templates" description={UNCONFIGURED_APP} />;
  }

  const [{ data: rows, error }, { data: ars }] = await Promise.all([
    sb.from("campaign_templates").select("*").order("created_at", { ascending: false }).limit(50),
    sb.from("autoresponders").select("id,name").eq("is_active", true).order("name"),
  ]);
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Campaign templates" description="Save common campaign settings to reuse across launches." />

      <form action={createCampaignTemplateAction} className="mt-8 grid gap-4 rounded-xl border border-border/80 p-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="t-name">Name</Label>
          <Input id="t-name" name="name" required placeholder="Weekend soft launch" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="t-ar">Autoresponder (optional)</Label>
          <select id="t-ar" name="autoresponder_id" className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="none">—</option>
            {(ars ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="t-win">Time window (hours)</Label>
          <Input id="t-win" name="time_window_hours" type="number" min={1} defaultValue={48} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="t-mpt">Max sends per worker check</Label>
          <Input id="t-mpt" name="max_concurrent_per_tick" type="number" min={1} max={10} defaultValue={3} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="quiet_hours_enabled" className="size-4 accent-primary" />
            Quiet hours (default overnight pause 01:00–06:00; adjust below)
          </label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="t-qs">Quiet start</Label>
          <Input id="t-qs" name="quiet_hours_start" defaultValue="01:00" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="t-qe">Quiet end</Label>
          <Input id="t-qe" name="quiet_hours_end" defaultValue="06:00" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="t-cap">Daily cap (optional)</Label>
          <Input id="t-cap" name="daily_cap" type="number" min={1} placeholder="Leave blank for no cap" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Save template</Button>
        </div>
      </form>

      <div className="mt-10 rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Window h</TableHead>
              <TableHead title="Max sends each time the timer runs">Per tick</TableHead>
              <TableHead>Quiet</TableHead>
              <TableHead className="text-right">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No templates yet.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{String(r.time_window_hours)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.max_concurrent_per_tick}</TableCell>
                  <TableCell className="text-xs">{r.quiet_hours_enabled ? "on" : "off"}</TableCell>
                  <TableCell className="text-right">
                    <form action={deleteCampaignTemplateAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
