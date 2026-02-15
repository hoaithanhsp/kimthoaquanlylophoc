-- ============================================
-- App Quản lý Lớp học - Supabase Schema
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- 1. Bảng profiles (liên kết auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: kiểm tra teacher role (SECURITY DEFINER bypass RLS)
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Teacher can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_teacher());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Teacher can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (is_teacher());

-- Trigger tự tạo profile khi đăng ký
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Bảng classes (lớp học)
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  teacher_name text,
  school_year text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage classes"
  ON classes FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view active classes"
  ON classes FOR SELECT TO authenticated
  USING (is_active = true);

-- 3. Bảng ranks (10 cấp bậc quân đội VN)
CREATE TABLE ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_name text NOT NULL,
  min_points integer NOT NULL DEFAULT 0,
  multiplier numeric(3,1) NOT NULL DEFAULT 1.0,
  icon text,
  color text,
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ranks"
  ON ranks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Teacher can manage ranks"
  ON ranks FOR ALL TO authenticated
  USING (is_teacher());

-- Insert 10 cấp bậc mặc định
INSERT INTO ranks (rank_name, min_points, multiplier, icon, color, description, sort_order) VALUES
  ('Binh nhì', 0, 1.0, '🎖️', '#9CA3AF', 'Tân binh mới gia nhập', 1),
  ('Binh nhất', 50, 1.1, '🎖️', '#6B7280', 'Đã có kinh nghiệm cơ bản', 2),
  ('Hạ sĩ', 120, 1.2, '🏅', '#D97706', 'Chiến sĩ có tiềm năng', 3),
  ('Trung sĩ', 200, 1.3, '🏅', '#B45309', 'Chiến sĩ xuất sắc', 4),
  ('Thượng sĩ', 300, 1.5, '🏅', '#92400E', 'Chiến sĩ tinh nhuệ', 5),
  ('Thiếu úy', 450, 1.7, '🎗️', '#059669', 'Sĩ quan mới', 6),
  ('Trung úy', 650, 2.0, '🎗️', '#047857', 'Sĩ quan có kinh nghiệm', 7),
  ('Thượng úy', 900, 2.3, '🎗️', '#065F46', 'Sĩ quan giỏi', 8),
  ('Đại úy', 1200, 2.5, '🥇', '#1D4ED8', 'Sĩ quan cao cấp', 9),
  ('Thiếu tá', 1600, 3.0, '⭐', '#7C3AED', 'Cấp bậc cao nhất', 10);

-- 4. Bảng students (học sinh)
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  total_points integer NOT NULL DEFAULT 0,
  current_rank text NOT NULL DEFAULT 'Binh nhì',
  current_multiplier numeric(3,1) NOT NULL DEFAULT 1.0,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage students"
  ON students FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view own data"
  ON students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Bảng groups (nhóm học tập)
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage groups"
  ON groups FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view groups"
  ON groups FOR SELECT TO authenticated
  USING (is_active = true);

-- 6. Bảng group_members (thành viên nhóm)
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, student_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage group_members"
  ON group_members FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view group_members"
  ON group_members FOR SELECT TO authenticated
  USING (true);

-- 7. Bảng criteria (tiêu chí cộng/trừ điểm)
CREATE TABLE criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_points integer NOT NULL,
  type text NOT NULL CHECK (type IN ('positive', 'negative')),
  icon text DEFAULT '📋',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage criteria"
  ON criteria FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view criteria"
  ON criteria FOR SELECT TO authenticated
  USING (is_active = true);

-- 8. Bảng point_history (lịch sử điểm)
CREATE TABLE point_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  criteria_id uuid REFERENCES criteria(id) ON DELETE SET NULL,
  base_points integer NOT NULL,
  multiplier numeric(3,1) NOT NULL DEFAULT 1.0,
  final_points integer NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage point_history"
  ON point_history FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view own points"
  ON point_history FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- 9. Bảng rewards (phần thưởng)
CREATE TABLE rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  required_points integer NOT NULL,
  icon text DEFAULT '🎁',
  stock integer DEFAULT -1, -- -1 = unlimited
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage rewards"
  ON rewards FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view active rewards"
  ON rewards FOR SELECT TO authenticated
  USING (is_active = true);

-- 10. Bảng reward_history (lịch sử đổi quà)
CREATE TABLE reward_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES rewards(id) ON DELETE SET NULL,
  points_spent integer NOT NULL,
  status text DEFAULT 'completed',
  note text,
  exchanged_at timestamptz DEFAULT now()
);

ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage reward_history"
  ON reward_history FOR ALL TO authenticated
  USING (is_teacher());

CREATE POLICY "Students can view own reward_history"
  ON reward_history FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- 11. Bảng notifications (thông báo)
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teacher insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_teacher());

-- Bật Realtime cho notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- SQL FUNCTIONS (Business Logic)
-- ============================================

-- Function: Cập nhật rank cho học sinh
CREATE OR REPLACE FUNCTION update_student_rank(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_points integer;
  v_rank record;
BEGIN
  SELECT total_points INTO v_points FROM public.students WHERE id = p_student_id;

  SELECT rank_name, multiplier INTO v_rank
  FROM public.ranks
  WHERE min_points <= v_points
  ORDER BY min_points DESC
  LIMIT 1;

  IF v_rank IS NOT NULL THEN
    UPDATE public.students
    SET current_rank = v_rank.rank_name, current_multiplier = v_rank.multiplier
    WHERE id = p_student_id;
  END IF;
END;
$$;

-- Function: Cộng điểm
CREATE OR REPLACE FUNCTION add_points(
  p_student_id uuid,
  p_criteria_id uuid,
  p_note text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_base integer;
  v_multiplier numeric(3,1);
  v_final integer;
  v_student record;
BEGIN
  -- Lấy base_points từ criteria
  SELECT base_points INTO v_base FROM public.criteria WHERE id = p_criteria_id;
  IF v_base IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Criteria not found');
  END IF;

  -- Lấy multiplier hiện tại của học sinh
  SELECT current_multiplier, full_name INTO v_student FROM public.students WHERE id = p_student_id;
  v_multiplier := COALESCE(v_student.current_multiplier, 1.0);

  -- Tính điểm cuối cùng
  v_final := ROUND(v_base * v_multiplier);

  -- Lưu lịch sử
  INSERT INTO public.point_history (student_id, criteria_id, base_points, multiplier, final_points, note, created_by)
  VALUES (p_student_id, p_criteria_id, v_base, v_multiplier, v_final, p_note, auth.uid());

  -- Cộng vào total_points
  UPDATE public.students SET total_points = total_points + v_final WHERE id = p_student_id;

  -- Cập nhật rank
  PERFORM public.update_student_rank(p_student_id);

  -- Cập nhật điểm nhóm
  UPDATE public.groups SET total_points = (
    SELECT COALESCE(SUM(s.total_points), 0)
    FROM public.group_members gm
    JOIN public.students s ON s.id = gm.student_id
    WHERE gm.group_id = public.groups.id
  )
  WHERE id IN (
    SELECT group_id FROM public.group_members WHERE student_id = p_student_id
  );

  RETURN json_build_object('success', true, 'final_points', v_final, 'student_name', v_student.full_name);
END;
$$;

GRANT EXECUTE ON FUNCTION add_points TO authenticated;

-- Function: Trừ điểm
CREATE OR REPLACE FUNCTION subtract_points(
  p_student_id uuid,
  p_criteria_id uuid,
  p_note text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_base integer;
  v_final integer;
  v_student record;
BEGIN
  SELECT base_points INTO v_base FROM public.criteria WHERE id = p_criteria_id;
  IF v_base IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Criteria not found');
  END IF;

  SELECT full_name INTO v_student FROM public.students WHERE id = p_student_id;
  v_final := ABS(v_base); -- Trừ điểm không nhân hệ số

  -- Lưu lịch sử (điểm âm)
  INSERT INTO public.point_history (student_id, criteria_id, base_points, multiplier, final_points, note, created_by)
  VALUES (p_student_id, p_criteria_id, -v_base, 1.0, -v_final, p_note, auth.uid());

  -- Trừ điểm (không cho âm)
  UPDATE public.students SET total_points = GREATEST(total_points - v_final, 0) WHERE id = p_student_id;

  -- Cập nhật rank
  PERFORM public.update_student_rank(p_student_id);

  -- Cập nhật điểm nhóm
  UPDATE public.groups SET total_points = (
    SELECT COALESCE(SUM(s.total_points), 0)
    FROM public.group_members gm
    JOIN public.students s ON s.id = gm.student_id
    WHERE gm.group_id = public.groups.id
  )
  WHERE id IN (
    SELECT group_id FROM public.group_members WHERE student_id = p_student_id
  );

  RETURN json_build_object('success', true, 'final_points', -v_final, 'student_name', v_student.full_name);
END;
$$;

GRANT EXECUTE ON FUNCTION subtract_points TO authenticated;

-- Function: Đổi quà
CREATE OR REPLACE FUNCTION exchange_reward(
  p_student_id uuid,
  p_reward_id uuid,
  p_note text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_reward record;
  v_student record;
BEGIN
  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id;
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;

  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Phần thưởng không tồn tại');
  END IF;

  IF v_student.total_points < v_reward.required_points THEN
    RETURN json_build_object('success', false, 'error', 'Không đủ điểm để đổi');
  END IF;

  IF v_reward.stock = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Phần thưởng đã hết');
  END IF;

  -- Trừ điểm
  UPDATE public.students SET total_points = total_points - v_reward.required_points WHERE id = p_student_id;

  -- Giảm stock nếu không phải unlimited
  IF v_reward.stock > 0 THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  -- Lưu lịch sử
  INSERT INTO public.reward_history (student_id, reward_id, points_spent, note)
  VALUES (p_student_id, p_reward_id, v_reward.required_points, p_note);

  -- Cập nhật rank
  PERFORM public.update_student_rank(p_student_id);

  -- Cập nhật điểm nhóm
  UPDATE public.groups SET total_points = (
    SELECT COALESCE(SUM(s.total_points), 0)
    FROM public.group_members gm
    JOIN public.students s ON s.id = gm.student_id
    WHERE gm.group_id = public.groups.id
  )
  WHERE id IN (
    SELECT group_id FROM public.group_members WHERE student_id = p_student_id
  );

  RETURN json_build_object('success', true, 'points_spent', v_reward.required_points);
END;
$$;

GRANT EXECUTE ON FUNCTION exchange_reward TO authenticated;

-- ============================================
-- SAU KHI CHẠY SCRIPT:
-- 1. Đăng ký user đầu tiên trên app
-- 2. Chạy SQL để thăng role teacher:
--    UPDATE profiles SET role = 'teacher' WHERE id = 'USER_ID_HERE';
-- ============================================
