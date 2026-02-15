-- ============================================
-- FIX: Infinite recursion in RLS policies
-- Lỗi 42P17: "infinite recursion detected in policy for relation profiles"
--
-- NGUYÊN NHÂN: Các policy trên bảng profiles dùng subquery 
-- "SELECT 1 FROM profiles WHERE ..." gây vòng lặp vô hạn.
--
-- GIẢI PHÁP: Tạo function is_teacher() với SECURITY DEFINER 
-- để bypass RLS khi kiểm tra role.
-- ============================================

-- Bước 1: Tạo helper function (bypass RLS)
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

-- Bước 2: Xóa TẤT CẢ policies cũ bị lỗi

-- profiles
DROP POLICY IF EXISTS "Teacher can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teacher can update any profile" ON profiles;

-- classes
DROP POLICY IF EXISTS "Teacher can manage classes" ON classes;

-- ranks
DROP POLICY IF EXISTS "Teacher can manage ranks" ON ranks;

-- students
DROP POLICY IF EXISTS "Teacher can manage students" ON students;

-- groups
DROP POLICY IF EXISTS "Teacher can manage groups" ON groups;

-- group_members
DROP POLICY IF EXISTS "Teacher can manage group_members" ON group_members;

-- criteria
DROP POLICY IF EXISTS "Teacher can manage criteria" ON criteria;

-- point_history
DROP POLICY IF EXISTS "Teacher can manage point_history" ON point_history;

-- rewards
DROP POLICY IF EXISTS "Teacher can manage rewards" ON rewards;

-- reward_history
DROP POLICY IF EXISTS "Teacher can manage reward_history" ON reward_history;

-- notifications
DROP POLICY IF EXISTS "Teacher insert notifications" ON notifications;


-- Bước 3: Tạo lại policies mới (dùng is_teacher())

-- profiles
CREATE POLICY "Teacher can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_teacher());

CREATE POLICY "Teacher can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (is_teacher());

-- classes
CREATE POLICY "Teacher can manage classes"
  ON classes FOR ALL TO authenticated
  USING (is_teacher());

-- ranks
CREATE POLICY "Teacher can manage ranks"
  ON ranks FOR ALL TO authenticated
  USING (is_teacher());

-- students
CREATE POLICY "Teacher can manage students"
  ON students FOR ALL TO authenticated
  USING (is_teacher());

-- groups
CREATE POLICY "Teacher can manage groups"
  ON groups FOR ALL TO authenticated
  USING (is_teacher());

-- group_members
CREATE POLICY "Teacher can manage group_members"
  ON group_members FOR ALL TO authenticated
  USING (is_teacher());

-- criteria
CREATE POLICY "Teacher can manage criteria"
  ON criteria FOR ALL TO authenticated
  USING (is_teacher());

-- point_history
CREATE POLICY "Teacher can manage point_history"
  ON point_history FOR ALL TO authenticated
  USING (is_teacher());

-- rewards
CREATE POLICY "Teacher can manage rewards"
  ON rewards FOR ALL TO authenticated
  USING (is_teacher());

-- reward_history
CREATE POLICY "Teacher can manage reward_history"
  ON reward_history FOR ALL TO authenticated
  USING (is_teacher());

-- notifications
CREATE POLICY "Teacher insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_teacher());

-- ============================================
-- XONG! Sau khi chạy script này, refresh lại app.
-- ============================================
