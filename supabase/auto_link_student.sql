-- ============================================
-- MIGRATION: Tự động tạo student khi phê duyệt
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- Cập nhật hàm approve_student: thêm tham số p_class_id
-- Khi phê duyệt, tự động tạo bản ghi trong bảng students
CREATE OR REPLACE FUNCTION approve_student(p_user_id uuid, p_class_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_student_id uuid;
  v_class_id uuid;
BEGIN
  -- Kiểm tra caller là teacher
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher') THEN
    RETURN json_build_object('success', false, 'error', 'Chỉ giáo viên mới có quyền phê duyệt');
  END IF;

  -- Lấy class_id: dùng tham số truyền vào, hoặc lấy lớp đầu tiên của teacher
  v_class_id := p_class_id;
  IF v_class_id IS NULL THEN
    SELECT id INTO v_class_id FROM public.classes
    WHERE created_by = auth.uid() AND is_active = true
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- Cập nhật status profile
  UPDATE public.profiles SET status = 'approved', updated_at = now()
  WHERE id = p_user_id AND role = 'student' AND status IN ('pending', 'rejected')
  RETURNING full_name INTO v_name;

  IF v_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy học sinh cần phê duyệt');
  END IF;

  -- Kiểm tra xem đã có student record chưa
  SELECT id INTO v_student_id FROM public.students
  WHERE user_id = p_user_id AND is_active = true;

  -- Nếu chưa có → tạo mới
  IF v_student_id IS NULL AND v_class_id IS NOT NULL THEN
    INSERT INTO public.students (class_id, user_id, full_name, total_points, current_rank, current_multiplier, is_active)
    VALUES (v_class_id, p_user_id, v_name, 0, 'Binh nhì', 1.0, true)
    RETURNING id INTO v_student_id;
  END IF;

  -- Gửi notification cho student
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '✅ Tài khoản đã được phê duyệt',
    'Chào mừng bạn! Tài khoản của bạn đã được giáo viên phê duyệt. Bạn có thể truy cập hệ thống ngay bây giờ.',
    'account_approved'
  );

  RETURN json_build_object('success', true, 'student_name', v_name, 'student_id', v_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION approve_student TO authenticated;
