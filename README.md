# Open Verse

Poetry website for the C2C project and Capstone. Visitors can submit poems without an account and read the public collection.

## Start locally

1. Install Node.js and run `npm install` from the repository root.
2. Copy `.env.example` to `.env` and enter the Supabase project URL and public anon key.
3. Run `npm run dev` and open the Vite URL shown in the terminal.

The writer page is `index.html`; the public collection is `poems.html`. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for database setup and deployment instructions.

## Change Log

This table tracks the implementation by area and explains what changed and why.

| Category | Where | What changed | Why |
| --- | --- | --- | --- |
| HTML entry points | `index.html`, `poems.html` | Added two Vite HTML shells that mount the React app. | Keeps writing and reading on separate pages while sharing one app. |
| React pages | `src/App.jsx` | Added the writer form and public poem shelf, navigation, validation, character count, publish feedback, and poem listing. | React manages interactive state and keeps the page behavior in one place. |
| React startup | `src/main.jsx` | Mounts React and imports the shared stylesheet. | Gives both HTML pages the same app entry point and presentation. |
| Supabase browser client | `src/lib/supabase.js` | Creates a Supabase client from Vite environment variables when configured. | Lets the browser read poems and call the submit function without embedding a privileged key. |
| Styling | `styles.css` | Added shared responsive styling for the writing and reading pages, including narrow-screen layout and focus states. | Keeps the two pages consistent and usable across screen sizes. |
| Dependencies and scripts | `package.json` | Added React, Vite, the React plugin, and Supabase client dependencies; added `dev`, `build`, and `preview` scripts. | Provides the requested React/Vite toolchain and standard local/build commands. |
| Multi-page build | `vite.config.js` | Configures Vite to build both HTML entry points. | Ensures the public poems page is included in production output. |
| Local configuration | `.env.example`, `.gitignore` | Added placeholders for the public Supabase URL/key and ignored local environment files, dependencies, and build output. | Makes setup repeatable without committing local secrets or generated files. |
| Database | `supabase/migrations/20261007000000_create_poems.sql` | Creates poems with unique IDs, length constraints, public read-only row security, and server-side insert permission. | Stores each submission independently and prevents anonymous clients from editing or deleting published poems. |
| Submission server | `supabase/functions/submit-poem/index.ts` | Validates anonymous submissions and inserts each poem using a server-side service-role key. | Keeps the privileged key off the client and avoids overwriting another poet's submission. |
| Function access | `supabase/config.toml` | Disables JWT verification for `submit-poem`. | Allows visitors to submit without creating accounts; the function still validates its input. |
| Setup guide | `SUPABASE_SETUP.md` | Added instructions for installing/running the app, configuring Supabase, deploying the function, and hosting the production build. | Explains how to connect the front end to a real hosted database and function. |
| Replaced files | `config.js`, `writer.js`, `poems.js` | Removed the earlier standalone browser scripts after moving their responsibilities into React and Vite configuration. | Avoids maintaining both the original vanilla-JavaScript implementation and the React app. |

## Publishing Behavior

Poems are published immediately and are publicly readable. The site has no login, editing, deletion, moderation, CAPTCHA, or rate limiting. Add abuse controls and a review/reporting process before opening it to unrestricted public submissions.
