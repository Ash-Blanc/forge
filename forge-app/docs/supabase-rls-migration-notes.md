# Supabase RLS Migration Notes for analysis_sessions

Migration `20260304_enable_rls_analysis_sessions.sql` enables Row Level Security on `public.analysis_sessions` and adds user-scoped policies.

## Running the Migration

Apply the migration to your Supabase project:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL manually in Supabase SQL Editor
# from: forge-app/supabase/migrations/20260304_enable_rls_analysis_sessions.sql
```

## Environment Setup

### Using Anon Key + Clerk JWT (RLS enforced)

Session API routes use `createSupabaseForUser(token)` with the anon/publishable key and Clerk JWT. For RLS to apply:

1. **Clerk JWT template**: Create a "supabase" template in [Clerk Dashboard > JWT Templates](https://dashboard.clerk.com/), based on the Supabase preset. Configure with your Supabase JWT secret.
2. **Supabase JWT verification**: Ensure Supabase accepts Clerk JWTs (configure via [Clerk Connect](https://dashboard.clerk.com/setup/supabase) or project JWT settings).
3. **Publishable key**: Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your environment.

### Using Service Role (defense-in-depth only)

If session routes use the service role client (`db` from `lib/supabase.ts`) instead of `createSupabaseForUser`, RLS is bypassed. App-layer filtering remains the only enforcement. The RLS policies still protect against future anon-key usage without proper auth.

## Backfill

No backfill required. Existing rows already have `user_id` populated with Clerk user IDs.

## Verification

1. **Authenticated user**:
   - `GET /api/sessions` returns only the current user's sessions
   - `POST /api/sessions` creates a session with the current user's `user_id`
   - `PATCH /api/sessions/:id` and `DELETE /api/sessions/:id` work only for own sessions
2. **Unauthenticated**: All session endpoints return 401.
