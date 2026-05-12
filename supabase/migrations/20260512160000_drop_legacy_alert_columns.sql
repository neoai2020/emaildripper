-- Remove legacy Telegram / email alert fields (alerts feature removed from product)

alter table public.settings drop column if exists telegram_bot_token;
alter table public.settings drop column if exists telegram_chat_id;
alter table public.settings drop column if exists alert_email;
