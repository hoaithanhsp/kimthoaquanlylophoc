-- ============================================
-- FIX #2: Tạo RPC function bypass RLS hoàn toàn
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- Function lấy profile của user hiện tại (bypass RLS)
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  v_profile json;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'phone', p.phone,
    'role', p.role,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_profile
  FROM profiles p
  WHERE p.id = auth.uid();

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_profile TO authenticated;

-- Kiểm tra: chạy lệnh này để test
-- SELECT get_my_profile();
