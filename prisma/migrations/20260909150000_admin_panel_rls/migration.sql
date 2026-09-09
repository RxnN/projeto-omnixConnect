-- O painel usa a mesma conexão restrita da aplicação. Estas políticas liberam apenas
-- as operações necessárias quando o servidor apresenta um contexto admin assinado.
DROP POLICY IF EXISTS rls_admin_select ON "Adega";
CREATE POLICY rls_admin_select ON "Adega"
FOR SELECT USING (public.app_context_value('admin') IS NOT NULL);

DROP POLICY IF EXISTS rls_admin_update ON "Adega";
CREATE POLICY rls_admin_update ON "Adega"
FOR UPDATE
USING (public.app_context_value('admin') IS NOT NULL)
WITH CHECK (public.app_context_value('admin') IS NOT NULL);

DROP POLICY IF EXISTS rls_admin_select ON "User";
CREATE POLICY rls_admin_select ON "User"
FOR SELECT USING (public.app_context_value('admin') IS NOT NULL);

DROP POLICY IF EXISTS rls_admin_select ON "RegistrationDocument";
CREATE POLICY rls_admin_select ON "RegistrationDocument"
FOR SELECT USING (public.app_context_value('admin') IS NOT NULL);

DROP POLICY IF EXISTS rls_admin_insert ON "RegistrationDocument";
CREATE POLICY rls_admin_insert ON "RegistrationDocument"
FOR INSERT WITH CHECK (public.app_context_value('admin') IS NOT NULL);
