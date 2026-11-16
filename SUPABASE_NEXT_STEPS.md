# Flowbase Supabase upgrade and deployment

This copy of Flowbase now uses the normalized tables from the SQL schema supplied in this conversation. The SQL file in `supabase/migrations` is an **additive upgrade** for that existing schema; it is not a replacement for the base schema and does not create duplicate feature-record tables.

## Apply the SQL upgrade

1. Confirm the supplied base schema is already installed in the Supabase project.
2. Open Supabase SQL Editor and run `supabase/migrations/202611160001_flowbase_feature_upgrade.sql`.
3. Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` Vercel values. Do not expose a Supabase service-role key as a `NEXT_PUBLIC_` value.

The upgrade adds persistent lead archiving, profile preferences, calendar-provider event identifiers, a server-only provider-token table, a safe notification import RPC, and Realtime publication entries for the feature tables.

## Data now stored in the supplied schema

- Leads, including the archived flag, use `leads`.
- Tasks use `tasks`; standalone calendar items and imported events use `calendar_events`.
- Client notes and activity use `lead_activities`; payments use `payments`.
- Inbox threads, internal messages, per-user thread state, and notification read state use `conversations`, `messages`, `conversation_user_state`, and `notifications`.
- Inbox attachments use the `attachments` table and private `attachments` Storage bucket.
- Report analysis history uses `saved_analyses`.
- Team membership and invitations use `workspace_members` and `invitations`; workspace name and personal preferences use `workspaces` and `profiles`.
- Profile photos use the private `avatars` Storage bucket.

On first sign-in in a browser that has old Flowbase local data, the app imports supported records when the corresponding Supabase tables are empty for that workspace/account. The browser retains an account-specific cache backup. Existing server records take precedence over that browser's local snapshot.

## Vercel settings for invitations and calendar sync

These features need server-only environment variables in Vercel (Production, Preview, and Development as applicable):

| Variable | Used for |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only OAuth token storage and provider sync |
| `FLOWBASE_SITE_URL` | Absolute callback and invitation links, e.g. `https://your-app.vercel.app` |
| `FLOWBASE_TOKEN_ENCRYPTION_KEY` | 64-character hexadecimal key for encrypting provider tokens at rest |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar connection |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Microsoft/Outlook Calendar connection |
| `RESEND_API_KEY`, `FLOWBASE_INVITE_FROM` | Sending workspace invitation emails through Resend |

Create OAuth apps with callback URLs `${FLOWBASE_SITE_URL}/api/integrations/google/callback` and `${FLOWBASE_SITE_URL}/api/integrations/microsoft/callback`. Google needs the calendar events read-only scope; Microsoft needs `Calendars.Read`. Configure Supabase Auth's site and redirect URLs for `/auth/callback` and the production app URL too. Add these variables and redeploy before trying these integrations. The token-encryption key must be generated privately and must not be committed to the repository or exposed to the browser.

The connected calendar feature imports events into Flowbase. It does not write Flowbase events back to Google/Microsoft. Email invitations require a verified sender supported by the Resend account. The app does not yet connect an email/WhatsApp messaging provider, so inbox messages are internal Flowbase records, not externally delivered messages.

## Important migration limits

- Existing payments and client-activity snapshots whose lead references are old numeric browser IDs cannot safely satisfy the schema's UUID foreign keys. Those rows are skipped during import; the related old leads need a deliberate ID mapping before they can be imported.
- Legacy notification rows are imported through the `import_legacy_notifications` RPC when that browser snapshot is available.
- Import runs per signed-in account/browser. To migrate another user's browser-only data, sign into that account in the browser that holds its cache and allow the first load to finish.
- Workspace role checks and table policies from the supplied base schema remain authoritative. The app surfaces database errors when an action is rejected by those policies.

## Deploy checklist

1. Run the additive SQL upgrade in Supabase after the base schema.
2. Add the required Vercel variables; add provider and Resend values only after configuring those services.
3. Redeploy Flowbase.
4. Sign in and confirm tasks, calendar, payments, activity, inbox, team, settings, and reports load from their tables.
5. Test a new lead/task/calendar event and confirm each appears in the matching Supabase table. Then test invitation acceptance and calendar sync after their service settings are complete.

This folder contains the code and SQL upgrade only. It has not been applied to Supabase, pushed to GitHub, or deployed to Vercel from this session.
