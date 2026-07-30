# Supabase Edge Functions — Telegram digest bot & ICS calendar feed

This directory contains three Deno Edge Functions that back two Workspace
features:

- **Telegram daily digest bot** — `telegram-webhook` (handles the one-time
  account-linking handshake) + `telegram-digest` (sends the daily "Мій
  день" message, meant to run on a schedule).
- **ICS calendar feed** — `ics-feed` (a public, token-protected endpoint you
  subscribe to from Google Calendar / Apple Calendar / Outlook).

None of this has been deployed yet — this README is the step-by-step guide
to do so. It assumes you already applied the SQL migrations in
`supabase/migrations` (in particular `0008_power_features.sql`, which
creates `user_integrations` and `telegram_link_codes`).

## 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in:
  ```sh
  npm install -g supabase
  supabase login
  ```
- Your local repo linked to the Supabase project:
  ```sh
  supabase link --project-ref <your-project-ref>
  ```
  (`<your-project-ref>` is the short id in your project's dashboard URL:
  `https://supabase.com/dashboard/project/<your-project-ref>`.)

## 2. Create a Telegram bot

1. Open a chat with [@BotFather](https://t.me/BotFather) on Telegram.
2. Send `/newbot` and follow the prompts (choose a name and a `@username`
   ending in `bot`).
3. BotFather replies with a **bot token** that looks like
   `123456789:AAExampleTokenDoNotUseThisValue`. Keep it secret — anyone with
   this token can send messages as your bot.

The app deliberately does not know or display the bot's username anywhere
— you tell your own users (or just yourself, since Workspace is
single-user-per-workspace) which bot to message, e.g. in your own
onboarding notes.

## 3. Set the bot token as a secret

Edge Functions read secrets via `Deno.env.get(...)`. `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are injected automatically into every deployed
function — you only need to set the Telegram token yourself:

```sh
supabase secrets set TELEGRAM_BOT_TOKEN=123456789:AAExampleTokenDoNotUseThisValue
```

## 4. Deploy the functions

All three must be deployed with `--no-verify-jwt`, because their callers
(Telegram's servers, calendar apps, pg_cron) cannot send a Supabase auth
JWT:

```sh
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy telegram-digest --no-verify-jwt
supabase functions deploy ics-feed --no-verify-jwt
```

Each function is responsible for its own authorization (validating the
link code / feed token) since `--no-verify-jwt` means Supabase's platform
does no auth check up front, and the service-role client used inside every
function bypasses RLS entirely.

## 5. Register the webhook with Telegram

Tell Telegram where to POST updates for your bot:

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook"
```

Replace `<TELEGRAM_BOT_TOKEN>` and `<project-ref>` with your real values. A
successful response looks like `{"ok":true,"result":true,"description":"Webhook was set"}`.

You can verify the current webhook status at any time with:

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 6. Schedule the daily digest (pg_cron + pg_net)

`telegram-digest` needs something to trigger it once a day. Supabase
Postgres ships `pg_cron` (schedules jobs) and `pg_net` (makes async HTTP
calls from SQL) as available extensions — together they can call the
deployed function on a schedule without any external infra.

Run the following **once, directly in the Supabase SQL Editor** — not as a
versioned migration file, since it embeds this project's specific URL and
key, which don't belong in source control:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Runs every day at 07:00 UTC. Adjust the cron expression to taste
-- (pg_cron uses standard 5-field cron syntax, evaluated in UTC).
select cron.schedule(
  'telegram-daily-digest',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/telegram-digest', -- REPLACE WITH YOUR VALUES
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_OR_ANON_KEY>' -- REPLACE WITH YOUR VALUES
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Notes:

- Because the function was deployed with `--no-verify-jwt`, the
  `Authorization` header above isn't strictly required for the request to
  reach the function — but Supabase's edge gateway still expects *some*
  `apikey`/`Authorization` header to route the request, so include your
  project's anon key (or service role key) there. Never commit the real
  value; this snippet is meant to be filled in and run ad hoc in the SQL
  Editor, not saved to the repo.
- To change the schedule later: `select cron.alter_job(job_id, schedule := '...')`
  or unschedule with `select cron.unschedule('telegram-daily-digest');`.
- To inspect run history: `select * from cron.job_run_details order by start_time desc limit 20;`.

## 7. How to test

**ICS feed** — fetch your own feed URL (find your `ics_feed_token` via the
Integrations section of Profile settings in the app, or `select
ics_feed_token from user_integrations where user_id = '<your-user-id>';`):

```sh
curl "https://<project-ref>.supabase.co/functions/v1/ics-feed?token=<your-ics-feed-token>"
```

You should get back a `text/calendar` document starting with
`BEGIN:VCALENDAR`. A 404 means the token wasn't found — double check it was
copied correctly.

**Telegram digest** — trigger it manually (useful right after deploying,
without waiting for the cron schedule):

```sh
curl -X POST "https://<project-ref>.supabase.co/functions/v1/telegram-digest" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>"
```

Response is a JSON summary, e.g. `{"sent":1,"skipped":0}`. `skipped`
includes both users with nothing due today/overdue (by design, see the
comment at the top of `telegram-digest/index.ts`) and any send that failed.

**Telegram webhook** — easiest to test end-to-end from Telegram itself:
generate a link code in the app's Profile → Integrations section, then send
`/start <code>` to your bot. You should get an immediate ✅ confirmation
message, and `user_integrations.telegram_chat_id` should be populated for
your user.
