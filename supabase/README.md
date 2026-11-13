# Online community database (Supabase)

Discover and Cosmetics store published builds in a free Supabase project, so they work on GitHub Pages
without any server.

## One-time setup

1. Create a free account and a new project on https://supabase.com (any name and region, keep the
   generated database password for yourself).
2. In the project, open **SQL Editor > New query**, paste the whole content of [schema.sql](schema.sql)
   and click **Run**.
3. Open **Project Settings > API** (or **Data API**) and copy:
   - the **Project URL** (`https://xxxx.supabase.co`),
   - the **publishable** key (`sb_publishable_...`) or, on older projects, the **anon public** key.
4. Put both values in [assets/js/config.js](../assets/js/config.js) and push.

The anon key is meant to be public: visitors can only read the `builds_public` view. Publishing, editing,
deleting and likes go through SQL functions that validate the input and check each build's secret edit
token (kept hashed). Never put the `service_role` key in the site.

## Visitor accounts

Visitors can create an account (email + password) to keep their favorites and creations on every device.
In the Supabase dashboard:

1. **Authentication > URL Configuration**
   - **Site URL**: `https://jeudimathis19.github.io/Monster-Hunter-Builder/`
   - **Redirect URLs**: add `https://jeudimathis19.github.io/Monster-Hunter-Builder/**`
     (and `http://localhost:3000/**` for local tests).
2. **Authentication > Sign In / Providers > Email**: keep **Email** enabled. With **Confirm email** on,
   new accounts must click the link sent by email before signing in.
3. Supabase's built-in mailer only delivers to the project's team, a few emails per hour. For visitors to
   receive their emails, set up Brevo and the Wilds Forge email templates: see [emails/README.md](emails/README.md).

Re-running `schema.sql` is safe: it only adds what is missing and updates the functions.

## Moderation

Builds can be removed from **Table Editor > builds** in the Supabase dashboard.
