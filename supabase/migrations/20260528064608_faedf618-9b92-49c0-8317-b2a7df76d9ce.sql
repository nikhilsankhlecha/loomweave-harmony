
-- 1. PROFILES: restrict reads to self + admin
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Users see own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- 2. CUSTOMERS: restrict reads to admin/billing/salesman
DROP POLICY IF EXISTS "All read customers" ON public.customers;
CREATE POLICY "Sales billing admin read customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'billing'::app_role, 'salesman'::app_role]));

-- 3. CUSTOMERS writes: split salesman (insert-only) from admin/billing (full)
DROP POLICY IF EXISTS "Sales billing admin write customers" ON public.customers;
CREATE POLICY "Admin billing write customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'billing'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'billing'::app_role]));
CREATE POLICY "Salesman insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'salesman'::app_role));

-- 4. Lock down SECURITY DEFINER functions: remove public/anon execute,
--    keep authenticated execute only on the role-check helpers used by RLS.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_stock_ledger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
