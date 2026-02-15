-- ============================================
-- MIGRATION: Luồng Phê duyệt Học sinh Đăng ký
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- 1. Thêm cột status vào profiles
-- Default 'approved' để user cũ không bị ảnh hưởng
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Cập nhật trigger handle_new_user: student mới = 'pending'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student',
    'pending'
  );
  RETURN NEW;
END;
$$;

-- 3. Function gửi notification cho tất cả teacher khi có student mới
CREATE OR REPLACE FUNCTION notify_teachers_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Chỉ gửi notification khi role = 'student' và status = 'pending'
  IF NEW.role = 'student' AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT
      p.id,
      '📝 Học sinh mới đăng ký',
      'Học sinh ' || COALESCE(NEW.full_name, 'Không tên') || ' đã đăng ký và đang chờ phê duyệt.',
      'student_registered'
    FROM public.profiles p
    WHERE p.role = 'teacher';
  END IF;
  RETURN NEW;
END;
$$;

-- Tạo trigger trên profiles
DROP TRIGGER IF EXISTS on_new_student_notify ON profiles;
CREATE TRIGGER on_new_student_notify
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION notify_teachers_new_student();

-- 4. RPC: Giáo viên phê duyệt student
CREATE OR REPLACE FUNCTION approve_student(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  -- Kiểm tra caller là teacher
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher') THEN
    RETURN json_build_object('success', false, 'error', 'Chỉ giáo viên mới có quyền phê duyệt');
  END IF;

  -- Cập nhật status
  UPDATE public.profiles SET status = 'approved', updated_at = now()
  WHERE id = p_user_id AND role = 'student' AND status = 'pending'
  RETURNING full_name INTO v_name;

  IF v_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy học sinh cần phê duyệt');
  END IF;

  -- Gửi notification cho student
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '✅ Tài khoản đã được phê duyệt',
    'Chào mừng bạn! Tài khoản của bạn đã được giáo viên phê duyệt. Bạn có thể truy cập hệ thống ngay bây giờ.',
    'account_approved'
  );

  RETURN json_build_object('success', true, 'student_name', v_name);
END;
$$;

GRANT EXECUTE ON FUNCTION approve_student TO authenticated;

-- 5. RPC: Giáo viên từ chối student
CREATE OR REPLACE FUNCTION reject_student(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  -- Kiểm tra caller là teacher
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher') THEN
    RETURN json_build_object('success', false, 'error', 'Chỉ giáo viên mới có quyền từ chối');
  END IF;

  -- Cập nhật status
  UPDATE public.profiles SET status = 'rejected', updated_at = now()
  WHERE id = p_user_id AND role = 'student' AND status IN ('pending', 'approved')
  RETURNING full_name INTO v_name;

  IF v_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy học sinh');
  END IF;

  -- Gửi notification cho student
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '❌ Tài khoản bị từ chối',
    'Tài khoản của bạn đã bị giáo viên từ chối. Vui lòng liên hệ giáo viên để biết thêm chi tiết.',
    'account_rejected'
  );

  RETURN json_build_object('success', true, 'student_name', v_name);
END;
$$;

GRANT EXECUTE ON FUNCTION reject_student TO authenticated;

-- 6. Cập nhật get_my_profile: thêm field status
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
    'status', p.status,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_profile
  FROM profiles p
  WHERE p.id = auth.uid();

  RETURN v_profile;
END;
$$;

-- 7. RPC: Lấy danh sách pending students (cho GV)
CREATE OR REPLACE FUNCTION get_pending_students()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  -- Kiểm tra caller là teacher
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher') THEN
    RETURN '[]'::json;
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT p.id, p.full_name, p.status, p.created_at,
             u.email
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.role = 'student' AND p.status IN ('pending', 'rejected')
      ORDER BY p.created_at DESC
    ) t),
    '[]'::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_students TO authenticated;

-- ============================================
-- SAU KHI CHẠY XONG:
-- Test bằng cách đăng ký một tài khoản mới
-- Tài khoản sẽ ở trạng thái 'pending'
-- ============================================
