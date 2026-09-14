CREATE POLICY rls_user_session_delete ON "UserSession" FOR DELETE
USING ("adegaId" = public.app_context_value('tenant'));
