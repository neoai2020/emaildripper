import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { AutoresponderDeleteButton } from "@/app/(app)/autoresponders/autoresponder-delete-button";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

export default async function AutorespondersPage() {
  const sb = getServiceSupabase();

  if (!sb) {
    return (
      <>
        <PageHeader
          title="Autoresponders"
          description={UNCONFIGURED_APP}
        />
      </>
    );
  }

  const { data: rows, error } = await sb
    .from("autoresponders")
    .select("id,name,provider,account_email,is_active,warmup_enabled,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Autoresponders"
          description="Each autoresponder connects to one Make.com webhook. Webhook addresses and signing secrets stay on the server."
        />
        <Link href="/autoresponders/new" className={cn(buttonVariants())}>
          Add autoresponder
        </Link>
      </div>

      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No autoresponders yet. Create your first webhook mapping.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.provider}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.account_email}</TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "secondary"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {r.warmup_enabled ? (
                      <Badge variant="outline" className="ml-2">
                        warmup
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/autoresponders/${r.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Edit
                      </Link>
                      <AutoresponderDeleteButton id={r.id} name={r.name} />
                    </div>
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
