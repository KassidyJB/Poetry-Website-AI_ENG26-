# Slam Poetry

Poetry website for the C2C project and Capstone. Visitors can submit poems without an account and read the public collection.

## Start locally

1. Install Node.js and run `npm install` from the repository root.
2. Copy `.env.example` to `.env` and enter the Supabase project URL and public publishable key using the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variable names.
3. Run `npm run dev` and open the Vite URL shown in the terminal.

The writer page is `index.html`; the public collection is `poems.html`. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for database setup and deployment instructions.

## Supabase Changes and Setup Notes (October 2026)

This section records the Supabase setup decisions and troubleshooting steps from the project integration.

### Frontend configuration

- The browser client in `src/lib/supabase.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the repository-root `.env` file.
- Set the URL to the Supabase project URL and the key to a **publishable key**. Despite the variable name `VITE_SUPABASE_ANON_KEY`, a publishable key is appropriate. Any `VITE_` variable is included in the browser bundle, so never put a secret key in a `VITE_` variable or expose one in frontend code.
- The `.env` file is for local frontend configuration, not for providing secrets to the deployed Edge Function. Keep it out of Git. Restart `npm run dev` after changing it so Vite reloads the environment variables.
- `VITE_SUPABASE_JWKS_URL` is not used by this frontend.

### Database, row-level security, and reads

- The public poem table is `public.poems`, created by `supabase/migrations/20261007000000_create_poems.sql`. It has poet, title, poem, and timestamp fields with length constraints.
- Row Level Security should be enabled. The public `anon` and `authenticated` roles need `SELECT` permission and a read policy for the website's Read Poems page to display rows. They should not receive insert, update, or delete access; submissions are written by the Edge Function.
- The `supabase/migrations/20261027000000_add_poem_admin_deletion.sql` migration adds `public.poem_admins` and an RLS-protected delete policy. An authenticated user can delete a poem only when their Supabase Auth UUID is in that allow-list. The browser does not use a secret key.
- If applying the read policy manually in the Supabase SQL Editor, a `DROP POLICY` statement may trigger a destructive-operation warning. It removes only the named policy before recreating it; it does not drop the table or delete poem rows. Review the SQL before confirming.
- The browser shelf reads the newest 100 rows from `public.poems`. If the shelf appears empty after a successful submission, verify the row is in this same Supabase project, confirm the public read grant and policy, then inspect the `/rest/v1/poems` request in the browser Network panel for an error.

### Admin user and poem deletion

There is no preconfigured admin account or admin password in the app. Admin access is granted to specific Supabase Auth user IDs through the `public.poem_admins` allow-list; adding an account there enables permanent poem deletion from the Read Poems page.

1. Apply the admin migration from the repository root with `supabase db push`. This creates `public.poem_admins` and its Row Level Security policies.
2. In the Supabase Dashboard for this project, create or select the trusted account under **Authentication → Users**. Use an account with password sign-in enabled, and confirm the email if the project requires it. Do not enable public sign-up just for admin access.
3. Copy the account's **User UID** from the Users list. In the SQL Editor for the same project, add only that UUID to the allow-list:

  ```sql
  insert into public.poem_admins (user_id)
  values ('YOUR_AUTH_USER_UUID')
  on conflict (user_id) do nothing;
  ```

   Replace the placeholder with the User UID. Do not put an email, password, or API key in the SQL.
4. On the Read Poems page, open **Admin sign in** and sign in with that Auth account. The page verifies the allow-list entry before displaying delete controls. Each deletion requires confirmation and permanently removes that poem.
5. To revoke deletion access, remove that account's allow-list entry:

   ```sql
   delete from public.poem_admins
   where user_id = 'YOUR_AUTH_USER_UUID';
   ```

The database Row Level Security policy is the authorization boundary: signing in alone does not grant delete permissions. Do not grant authenticated users insert/update access to `public.poem_admins`, and never put a Supabase secret key in the browser to perform deletions.

### Edge Function deployment and key handling

- The function is `submit-poem` at `supabase/functions/submit-poem/index.ts`. It runs in Supabase's Deno Edge Function runtime; this does not conflict with using npm/Node for the Vite frontend.
- From the repository root, sign in and link the project if it is not already linked, apply the database migration, and deploy the function:

  ```bash
  supabase login
  supabase link --project-ref augiaijonydeflbmlrtz
  supabase db push
  supabase functions deploy submit-poem --project-ref augiaijonydeflbmlrtz
  ```

- The function calls the Supabase REST API to insert into `public.poems`. Supabase supplies its URL and secret-key map to Edge Functions. The current function looks up the key under the exact name `s_key_2`; if that key name changes, update the lookup in the function, redeploy it, and verify a successful insert before removing the key it previously used.
- Do not add a Supabase secret key as a frontend setting, commit it, or share it in chat. If a secret key has been exposed, create a replacement, ensure the function is configured to use it, deploy and test a submission, then delete the exposed key. Creating a replacement does not automatically revoke the old key.
- The function is configured with `verify_jwt = false`, allowing public submissions without accounts. Its input validation does not prevent spam; add abuse controls before opening the site to unrestricted traffic.

For a manual SQL setup, the table must be `public.poems`. Enable RLS and allow public reads while keeping writes restricted to the Edge Function:

```sql
alter table public.poems enable row level security;
grant select on public.poems to anon, authenticated;

create policy "Poems are publicly readable"
  on public.poems
  for select
  to anon, authenticated
  using (true);
```

Only run the `CREATE POLICY` statement if that policy does not already exist. The migration also creates the table and configures its grants and policy; prefer `supabase db push` for a fresh setup.

### End-to-end verification and troubleshooting

1. To test the deployed function directly, send a sample submission:

   ```bash
   curl -i 'https://augiaijonydeflbmlrtz.supabase.co/functions/v1/submit-poem' \
     -H 'Content-Type: application/json' \
     --data '{"poet":"Deployment test","title":"Test poem","poem":"A short test poem."}'
   ```

   A `201` response with `{"ok":true}` and a new row in `public.poems` confirm the function-to-database path. Remove the test row from the Table Editor if desired.
2. Submit a poem through the website. A successful publish redirects to `poems.html?published=1`; check the function logs and `public.poems` for the row.
3. Visit the Read Poems page and refresh. If the row exists but the shelf is empty, check the page's `/rest/v1/poems` request and RLS read policy. A missing table or incorrect project URL can also cause a REST API error.
4. If the frontend says Supabase settings are missing, confirm the two `VITE_` variables are spelled exactly as above, the `.env` file is beside `package.json`, and the Vite dev server was restarted.
5. If the function logs report an insert failure, inspect the logged HTTP status and check the database table, schema, project URL, and function's selected secret-key name. Never paste key values into logs or support messages.

## Change Log

This section tracks the implementation by area. Each item lists where the change lives, what changed, and why it was made.

### Pages and React

- **HTML entry points** — **Where:** `index.html`, `poems.html`. **What:** Added two Vite HTML shells that mount the React app. **Why:** Keeps writing and reading on separate pages while sharing one app.


- **React pages** — **Where:** `src/App.jsx`. **What:** Added the writer form and public poem shelf, navigation, validation, character count, publish feedback, and poem listing. **Why:** React manages interactive state and keeps the page behavior in one place.


- **React startup** — **Where:** `src/main.jsx`. **What:** Mounts React and imports the shared stylesheet. **Why:** Gives both HTML pages the same app entry point and presentation.


- **Supabase browser client** — **Where:** `src/lib/supabase.js`. **What:** Creates a Supabase client from Vite environment variables when configured. **Why:** Lets the browser read poems and call the submit function without embedding a privileged key.


- **Styling** — **Where:** `styles.css`. **What:** Added shared responsive styling for both pages, including narrow-screen layout and focus states. **Why:** Keeps the pages consistent and usable across screen sizes.

### Vite and Local Configuration

- **Dependencies and scripts** — **Where:** `package.json`. **What:** Added React, Vite, the React plugin, and Supabase client dependencies, plus `dev`, `build`, and `preview` scripts. **Why:** Provides the React/Vite toolchain and standard local/build commands.


- **Multi-page build** — **Where:** `vite.config.js`. **What:** Configures Vite to build both HTML entry points. **Why:** Ensures the public poems page is included in production output.


- **Environment and generated files** — **Where:** `.env.example`, `.gitignore`. **What:** Added placeholders for the public Supabase URL/key and ignored local environment files, dependencies, and build output. **Why:** Makes setup repeatable without committing local secrets or generated files.


### Supabase Backend

- **Database and admin deletion** — **Where:** `supabase/migrations/20261007000000_create_poems.sql`, `supabase/migrations/20261027000000_add_poem_admin_deletion.sql`. **What:** Creates poems with unique IDs, length constraints, public read access, server-side insert permission, and allow-listed admin-only deletion. **Why:** Stores each submission independently, prevents anonymous writes, and limits deletion to trusted authenticated administrators.


- **Submission function** — **Where:** `supabase/functions/submit-poem/index.ts`. **What:** Validates anonymous submissions and inserts each poem using a server-side Supabase secret key. **Why:** Keeps the privileged key off the client and avoids overwriting another poet's submission.


- **Function access** — **Where:** `supabase/config.toml`. **What:** Disables JWT verification for `submit-poem`. **Why:** Allows visitors to submit without creating accounts; the function still validates its input.


### Documentation and Cleanup

- **Setup guide** — **Where:** `SUPABASE_SETUP.md`. **What:** Added instructions for installing/running the app, configuring Supabase, deploying the function, and hosting the production build. **Why:** Explains how to connect the front end to a hosted database and function.


- **Replaced files** — **Where:** `config.js`, `writer.js`, `poems.js` (removed). **What:** Removed the earlier standalone browser scripts after moving their responsibilities into React and Vite configuration. **Why:** Avoids maintaining both the vanilla-JavaScript implementation and the React app.


## Publishing Behavior

Poems are published immediately and are publicly readable. Allow-listed Supabase Auth admins can permanently delete poems from the Read Poems page. The site has no editing, moderation, CAPTCHA, or rate limiting. Add abuse controls and a review/reporting process before opening it to unrestricted public submissions.
supabase db push --project-ref augiaijonydeflbmlrtzsupabase db push --project-ref augiaijonydeflbmlrtz