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
   - the **anon public** key.
4. Put both values in [assets/js/config.js](../assets/js/config.js) and push.

The anon key is meant to be public: visitors can only read the `builds_public` view. Publishing, editing,
deleting and likes go through SQL functions that validate the input and check each build's secret edit
token (kept hashed). Never put the `service_role` key in the site.

## Moderation

Builds can be removed from **Table Editor > builds** in the Supabase dashboard.
