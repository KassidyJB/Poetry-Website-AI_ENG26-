# Supabase setup

This project uses Supabase for public poem storage. Supabase hosts the database and submission function; there is no physical server to manage and visitors do not need accounts.

## Run the React app

1. Install Node.js, then install the project dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the Supabase project URL and anon key. Vite exposes variables prefixed with `VITE_` in the browser bundle, so use only the public anon key here.
3. Start the local Vite server:

   ```powershell
   npm run dev
   ```

The writer and public collection are separate HTML entry points (`index.html` and `poems.html`) which share the React app in `src/`.

## Create the backend

1. Create a Supabase project. In **Project Settings → API Keys**, make sure the project has a default secret key. Secret keys grant elevated access and must never be exposed in browser code or committed to source control.
2. Install the Supabase CLI, sign in, then link this repository to the project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   `db push` creates the `poems` table. The migration allows public reads but grants no public insert, update, or delete access.
3. Deploy the function:

   ```powershell
   supabase functions deploy submit-poem
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` to Edge Functions. The function reads the `default` secret key from `SUPABASE_SECRET_KEYS`; you do not create an Edge Function secret with a `SUPABASE_` name. Never put a secret key in a browser file, `.env`, or any variable prefixed with `VITE_`.
4. In `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and publishable key from the Supabase project's API settings. The publishable key is expected to be visible to site visitors; row-level security limits it to reading poems. Do not put a secret key here.
5. Build the app with `npm run build`, then host the generated `dist/` folder on a static host. The Supabase backend remains separate and receives poem submissions from the browser.

## How requests flow

- The visitor's browser requests the static page from the web host. That host answers with the HTML, CSS, and JavaScript files.
- When the visitor submits the form, React calls `supabase.functions.invoke("submit-poem", { body })`. The Supabase JavaScript client sends a JSON `POST` to the project's `/functions/v1/submit-poem` API with the public project key and function authorization headers.
- The Edge Function is the server-side API. It accepts `POST` (and CORS `OPTIONS` preflight), validates the poet, title, and poem, then calls Supabase's PostgREST API at `/rest/v1/poems`. It reads the default secret key from Supabase's injected `SUPABASE_SECRET_KEYS` dictionary and uses it only on the server, so the anonymous browser client never receives permission to insert directly.
- PostgREST inserts a new row into `public.poems`. The database applies its constraints and generates the UUID and timestamp. A successful insert returns HTTP `201` to the browser, which then navigates to `poems.html?published=1`.
- The poems page uses the public anon key through the Supabase JavaScript client to `SELECT` the newest 100 rows. Row-level security permits these reads, while anonymous insert, update, and delete remain denied.

## Verify a submission

1. Start the app with `npm run dev` and submit a poem with a non-empty poet name and title.
2. Confirm the browser navigates to the poem shelf and shows the published message and new poem.
3. If the form reports that publishing is not configured, confirm the project has a default secret API key and that the function is deployed. If poems cannot load, check the `.env` project URL/key and confirm `supabase db push` succeeded.

The database and Edge Function are hosted by Supabase; Vite serves only the website's static front end. The browser-to-function and function-to-database calls are HTTP APIs, and the secret key is restricted to the server-side function.

Poems publish immediately and are publicly readable. This starter has no login, editing, deletion, moderation, CAPTCHA, or rate limiting. Before opening it to unrestricted public traffic, add abuse controls and a review/reporting process.