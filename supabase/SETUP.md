# Supabase setup

Existing project: run **002_connected_app.sql** in a new SQL Editor query. Run it once. Your existing profiles and posts are preserved. The previous schema.sql must not be rerun.

New project: run schema.sql, then 002_connected_app.sql.

Add http://127.0.0.1:5174/ under Authentication → URL Configuration → Redirect URLs. Keep your actual deployed app root URL there too, and set Site URL to your deployed app. Leave email confirmation enabled.

Configure .env.local from .env.example, restart Vite, and sign in. The Home screen now uses your shared account. The previous Community link redirects to Home. Press Refresh after applying the migration.

See the root README for the connected features, storage limits, and test commands.

For video file upload, run 003_reel_uploads.sql once after 002. Then refresh and use Reels → Add reel → Upload video. No public bucket or secret key is needed.

For notebooks, exams, pod memberships, deletion, and AI setup, follow [Learning workspace setup](LEARNING_WORKSPACE_SETUP.md). Existing projects upgraded through migration 003 must run 004 and 005 once; both have already been applied to the connected LearnLoop project.
