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

1. Create a Supabase project and keep its service-role key private.
2. Install the Supabase CLI, sign in, then link this repository to the project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   `db push` creates the `poems` table. The migration allows public reads but grants no public insert, update, or delete access.
3. In the Supabase dashboard's Edge Function secrets, set `SUPABASE_SERVICE_ROLE_KEY` to the project's service-role key, then deploy the function:

   ```powershell
   supabase functions deploy submit-poem
   ```

   The function is intentionally public so visitors can submit without logging in. It validates the input and inserts each poem as a new row. Never put the service-role key in a browser file.
4. In `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the values from the Supabase project's API settings. The public key is expected to be visible to site visitors; row-level security limits it to reading poems. Do not paste the service-role key here.
5. Build the app with `npm run build`, then host the generated `dist/` folder on a static host. The Supabase backend remains separate and receives poem submissions from the browser.

## How requests flow

- The visitor's browser requests the static page from the web host. That host answers with the HTML, CSS, and JavaScript files.
- When a visitor submits a poem, React sends the fields to the Supabase Edge Function. The function validates them and asks the database to insert one new record.
- The poems page asks Supabase for the latest public records. Supabase answers with the poems, and the browser renders them as text while preserving line breaks.

Poems publish immediately and are publicly readable. This starter has no login, editing, deletion, moderation, CAPTCHA, or rate limiting. Before opening it to unrestricted public traffic, add abuse controls and a review/reporting process.