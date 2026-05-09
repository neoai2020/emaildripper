"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import {
  activatePreviewCampaignAction,
  discardPreviewCampaignAction,
} from "@/app/(app)/campaigns/actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type HourlyRow = { hour: string; sends: number };

export function CampaignPreviewClient({
  campaignId,
  status,
  hourly,
  firstLeads,
}: {
  campaignId: string;
  status: string;
  hourly: HourlyRow[];
  firstLeads: { email: string; scheduled_at: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function activate() {
    startTransition(async () => {
      try {
        await activatePreviewCampaignAction(campaignId);
        toast.success("Campaign is now running");
        router.push(`/campaigns/${campaignId}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Launch failed");
      }
    });
  }

  function discard() {
    startTransition(async () => {
      try {
        await discardPreviewCampaignAction(campaignId);
        toast.success("Preview discarded");
        router.push("/campaigns");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Discard failed");
      }
    });
  }

  const isPreview = status === "previewing";

  return (
    <div className="space-y-8">
      {hourly.length > 0 ? (
        <div className="rounded-xl border border-border/80 p-4">
          <h2 className="mb-4 font-heading text-sm font-semibold">Scheduled sends by hour (window)</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sends" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/80">
        <div className="border-b border-border/80 px-4 py-3">
          <h2 className="font-heading text-sm font-semibold">First 20 scheduled sends</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Scheduled (UTC)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {firstLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">
                  No leads.
                </TableCell>
              </TableRow>
            ) : (
              firstLeads.map((r) => (
                <TableRow key={r.email + r.scheduled_at}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {new Date(r.scheduled_at).toISOString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        {isPreview ? (
          <>
            <Button type="button" onClick={activate} disabled={pending}>
              {pending ? "Working…" : "Launch campaign"}
            </Button>
            <Button type="button" variant="outline" onClick={discard} disabled={pending}>
              Discard preview
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/campaigns/new")}>
              Edit (start over)
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={() => router.push(`/campaigns/${campaignId}`)}>
            Open campaign
          </Button>
        )}
      </div>
    </div>
  );
}
