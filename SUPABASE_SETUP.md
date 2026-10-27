# Supabase setup

This project uses Supabase for public poem storage. Supabase hosts the database and submission function; there is no physical server to manage, and poem readers and writers do not need accounts. Admins sign in to manage poem deletions.

## Run the React app

1. Install Node.js, then install the project dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the Supabase project URL and publishable key. Vite exposes variables prefixed with `VITE_` in the browser bundle, so use only a public publishable key here.
3. Start the local Vite server:

   ```powershell
   npm run dev
   ```

The writer and public collection are separate HTML entry points (`index.html` and `poems.html`) which share the React app in `src/`.

## Create the backend

1. Create a Supabase project. In **Project Settings → API Keys**, create a secret key named `s_key_2`, as expected by the current Edge Function code. Secret keys grant elevated access and must never be exposed in browser code or committed to source control.
2. Install the Supabase CLI, sign in, then link this repository to the project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   `db push` applies the database migrations, creating `public.poems` and the admin allow-list table. Public users can read poems but cannot insert, update, or delete them; inserts use the Edge Function, and deletes are limited to allow-listed authenticated admins.
3. Deploy the function:

   ```powershell
   supabase functions deploy submit-poem
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` to Edge Functions. The function reads the key named `s_key_2` from `SUPABASE_SECRET_KEYS`; you do not create an Edge Function secret with a `SUPABASE_` name. If the key's name changes, update the function's lookup and redeploy. Never put a secret key in a browser file, `.env`, or any variable prefixed with `VITE_`.
4. In `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and publishable key from the Supabase project's API settings. The publishable key is expected to be visible to site visitors; row-level security limits it to reading poems. Do not put a secret key here.
5. Build the app with `npm run build`, then host the generated `dist/` folder on a static host. The Supabase backend remains separate and receives poem submissions from the browser.

## How requests flow

- The visitor's browser requests the static page from the web host. That host answers with the HTML, CSS, and JavaScript files.
- When the visitor submits the form, React calls `supabase.functions.invoke("submit-poem", { body })`. The Supabase JavaScript client sends a JSON `POST` to the project's `/functions/v1/submit-poem` API with the public project key and function authorization headers.
- The Edge Function is the server-side API. It accepts `POST` (and CORS `OPTIONS` preflight), validates the poet, title, and poem, then calls Supabase's PostgREST API at `/rest/v1/poems`. It reads the `s_key_2` secret key from Supabase's injected `SUPABASE_SECRET_KEYS` dictionary and uses it only on the server, so the anonymous browser client never receives permission to insert directly.
- PostgREST inserts a new row into `public.poems`. The database applies its constraints and generates the UUID and timestamp. A successful insert returns HTTP `201` to the browser, which then navigates to `poems.html?published=1`.
- The poems page uses the public publishable key through the Supabase JavaScript client to `SELECT` the newest 100 rows. Row-level security permits these reads, while anonymous insert, update, and delete remain denied.

## Admin poem deletion

The Read Poems page has an admin sign-in panel. Only Supabase Auth users whose UUID is present in `public.poem_admins` can delete poems. The database enforces this using Row Level Security; hiding the delete controls is not the security boundary.

1. Apply the new database migration from the repository root:

   ```powershell
   supabase db push
   ```

   This creates `public.poem_admins` and grants `DELETE` on `public.poems` to authenticated users only when a matching admin allow-list entry exists. Anonymous visitors remain unable to delete poems.
2. In the Supabase Dashboard for this project, create or select a trusted user under **Authentication → Users**. Use an account with password sign-in enabled, and confirm the account if email confirmation is required. Do not expose public admin sign-up.
3. Copy that user's UUID from the Users list. In the SQL Editor for the same project, add only that UUID to the allow-list:

   ```sql
   insert into public.poem_admins (user_id)
   values ('YOUR_AUTH_USER_UUID')
   on conflict (user_id) do nothing;
   ```

   Replace the placeholder with the user's UUID (not their password, email, or an API key). The SQL Editor uses the elevated database role; never give authenticated users permission to insert or change allow-list entries.
4. Open **Read poems → Admin sign in**, sign in with that Supabase Auth account, and verify that the page reports admin access and displays a **Delete poem** button on each poem. Deletion requires confirmation and is permanent.
5. To revoke website admin access, delete that user's row from `public.poem_admins` in the SQL Editor. Deleting the Auth user also removes the allow-list row through the foreign-key cascade.

The secret key must never be used by the browser for deletion. The admin page uses the signed-in user's session, and RLS checks the allow-list for every delete request.

## Verify a submission

1. Start the app with `npm run dev` and submit a poem with a non-empty poet name and title.
2. Confirm the browser navigates to the poem shelf and shows the published message and new poem.
3. If the form reports that publishing is not configured, confirm the function is deployed and can access the configured secret key. If poems cannot load, check the `.env` project URL/key and confirm `supabase db push` succeeded.

The database and Edge Function are hosted by Supabase; Vite serves only the website's static front end. The browser-to-function and function-to-database calls are HTTP APIs, and the secret key is restricted to the server-side function.

Poems publish immediately and are publicly readable. The site supports allow-listed admin deletion but has no editing, moderation, CAPTCHA, or rate limiting. Before opening it to unrestricted public submissions, add abuse controls and a review/reporting process.