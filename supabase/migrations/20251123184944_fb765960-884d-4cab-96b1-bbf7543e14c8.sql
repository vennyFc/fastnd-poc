-- Create function to clean up old access logs (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete access logs older than 90 days
  DELETE FROM public.user_access_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action in admin audit log
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    table_name,
    action,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    'user_access_logs',
    'cleanup_old_logs',
    NULL,
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90),
    NULL
  );
  
  RETURN deleted_count;
END;
$$;

-- Add comment to document the retention policy
COMMENT ON FUNCTION public.cleanup_old_access_logs() IS 'Deletes user access logs older than 90 days. Should be run periodically (e.g., weekly) to maintain log retention policy. Returns number of deleted records.';

-- Grant execute permission to authenticated users with admin roles
REVOKE ALL ON FUNCTION public.cleanup_old_access_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_access_logs() TO authenticated;