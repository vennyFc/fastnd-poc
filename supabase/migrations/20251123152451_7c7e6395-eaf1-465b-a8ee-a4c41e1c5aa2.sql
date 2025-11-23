-- Allow users to view their own tenant
CREATE POLICY "Users can view their own tenant"
ON tenants
FOR SELECT
TO authenticated
USING (id = get_my_tenant_id());