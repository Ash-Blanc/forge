-- Enable RLS on analysis_sessions for user-scoped data isolation
-- User ID mapping: analysis_sessions.user_id = Clerk userId = JWT sub claim
-- Requires Supabase to verify Clerk JWTs (see docs/auth-user-id-mapping.md)

ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own sessions
CREATE POLICY "Users can select own sessions"
  ON public.analysis_sessions FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

-- INSERT: users can only insert with their own user_id
CREATE POLICY "Users can insert own sessions"
  ON public.analysis_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

-- UPDATE: users can only update their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.analysis_sessions FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id)
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

-- DELETE: users can only delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON public.analysis_sessions FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);
