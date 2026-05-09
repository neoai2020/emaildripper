import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServiceSupabase } from "@/lib/db";

import { updateAlertsAction } from "../actions";

export default async function SettingsAlertsPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Alerts" description="Connect Supabase to configure alert channels." />;
  }

  const { data: row, error } = await sb
    .from("settings")
    .select("telegram_bot_token,telegram_chat_id,alert_email")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Stored for future notification workers. Nothing is sent from this page yet — wire your Make scenarios or a small notifier service when ready."
      />

      <form action={updateAlertsAction} className="mt-8 max-w-lg space-y-5 rounded-xl border border-border/80 p-6">
        <div className="grid gap-2">
          <Label htmlFor="telegram_bot_token">Telegram bot token</Label>
          <Input
            id="telegram_bot_token"
            name="telegram_bot_token"
            type="password"
            autoComplete="off"
            defaultValue={row.telegram_bot_token ?? ""}
            placeholder="123456:ABC…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="telegram_chat_id">Telegram chat id</Label>
          <Input
            id="telegram_chat_id"
            name="telegram_chat_id"
            defaultValue={row.telegram_chat_id ?? ""}
            placeholder="-100…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="alert_email">Alert email</Label>
          <Input
            id="alert_email"
            name="alert_email"
            type="email"
            defaultValue={row.alert_email ?? ""}
            placeholder="ops@example.com"
          />
        </div>
        <Button type="submit">Save</Button>
      </form>
    </>
  );
}
