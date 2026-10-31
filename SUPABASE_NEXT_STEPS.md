# Supabase connection — what's done and what's left for you

## Already done in this copy of the project (tested: pnpm install --frozen-lockfile, next build, mapping tests)
NEW      middleware.js                      protects every page except Sign in / Sign up
NEW      app/auth/callback/route.js         finishes Google sign-in + email-confirmation links
NEW      lib/supabase/client.js, server.js, middleware.js
NEW      lib/session.js                     sign out + clear this browser's cached data
NEW      lib/workspace.js                   finds the user's workspace, creates a first one if none
NEW      lib/sync.js                        starts loading leads + live updates after login
NEW      .env.example                       the 2 variables you need
CHANGED  lib/leads.js                       now saves to Supabase (same function names as before)
CHANGED  components/AuthPage.js             real sign-up / sign-in / Google, with error messages
CHANGED  components/AppShell.js             starts the sync (2 lines)
CHANGED  components/Sidebar.js              "Log out" button under Settings
CHANGED  components/WorkspaceBoard.js       client-id comparisons: Number(...) -> String(...)
CHANGED  components/DashboardOverview.js    same
CHANGED  components/LeadsTable.js           "Last activity" sort now uses createdAt
CHANGED  app/globals.css                    styles for auth messages + log-out button (appended)
CHANGED  package.json + pnpm-lock.yaml      adds @supabase/supabase-js and @supabase/ssr

## What only you can do
1. SUPABASE: run the SQL schema file on your project (you are doing this).
2. SUPABASE -> Authentication -> URL Configuration
     Site URL ............ your production URL (https://YOUR-APP.vercel.app)
     Redirect URLs ....... https://YOUR-APP.vercel.app/auth/callback
                           http://localhost:3000/auth/callback
   Vercel preview deployments get a different URL each time; either add a wildcard pattern
   (see Supabase's redirect-URL docs) or test sign-in on the production URL.
3. SUPABASE -> Authentication -> Sign In / Providers -> Email: for testing, turn OFF "Confirm email".
   Turn it back ON before real users sign up. Minimum password length: 8.
4. VERCEL -> Project -> Settings -> Environment Variables. Add BOTH, for Production, Preview, Development:
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY      (the sb_publishable_... key, NOT the secret key)
   !! Add them BEFORE deploying this version. If they are missing, every page (even Sign in) errors,
   because the login gate needs them. These values are baked in at build time, so REDEPLOY after adding.
5. LOCAL: copy .env.example to .env.local and fill in the same two values. Then run `pnpm install`.
6. Commit and push. Vercel will build it.

## Check it works
 a. Sign up -> Table Editor shows rows in profiles, workspaces, workspace_members, and 5 in pipeline_stages.
 b. Add a lead -> appears in the leads table; refresh the page -> still there.
 c. Drag it to Won -> record_type becomes 'client'.
 d. Second account in a private window sees none of the first account's leads.
 e. Log out -> back on Sign in.

## Still on localStorage (not connected yet)
Tasks, calendar, inbox, team, settings, payments, client activity. Old payments/client notes saved in a
browser point at old numeric lead ids and will not match the new leads.
