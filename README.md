# Open Verse

Poetry website for the C2C project and Capstone. Visitors can submit poems without an account and read the public collection.

## Start locally

1. Install Node.js and run `npm install` from the repository root.
2. Copy `.env.example` to `.env` and enter the Supabase project URL and public anon key.
3. Run `npm run dev` and open the Vite URL shown in the terminal.

The writer page is `index.html`; the public collection is `poems.html`. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for database setup and deployment instructions.

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

- **Database** — **Where:** `supabase/migrations/20261007000000_create_poems.sql`. **What:** Creates poems with unique IDs, length constraints, public read-only row security, and server-side insert permission. **Why:** Stores each submission independently and prevents anonymous clients from editing or deleting published poems.
- **Submission server** — **Where:** `supabase/functions/submit-poem/index.ts`. **What:** Validates anonymous submissions and inserts each poem using a server-side service-role key. **Why:** Keeps the privileged key off the client and avoids overwriting another poet's submission.
- **Function access** — **Where:** `supabase/config.toml`. **What:** Disables JWT verification for `submit-poem`. **Why:** Allows visitors to submit without creating accounts; the function still validates its input.

### Documentation and Cleanup

- **Setup guide** — **Where:** `SUPABASE_SETUP.md`. **What:** Added instructions for installing/running the app, configuring Supabase, deploying the function, and hosting the production build. **Why:** Explains how to connect the front end to a hosted database and function.
- **Replaced files** — **Where:** `config.js`, `writer.js`, `poems.js` (removed). **What:** Removed the earlier standalone browser scripts after moving their responsibilities into React and Vite configuration. **Why:** Avoids maintaining both the vanilla-JavaScript implementation and the React app.

## Publishing Behavior

Poems are published immediately and are publicly readable. The site has no login, editing, deletion, moderation, CAPTCHA, or rate limiting. Add abuse controls and a review/reporting process before opening it to unrestricted public submissions.
