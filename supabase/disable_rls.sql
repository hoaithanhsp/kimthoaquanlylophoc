-- =============================================
-- TẮT TẤT CẢ ROW LEVEL SECURITY (RLS)
-- Chạy file này trong Supabase SQL Editor
-- =============================================

-- 1. Tắt RLS trên tất cả bảng
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ranks DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE criteria DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE reward_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 2. Xóa tất cả RLS policies (nếu có)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
        RAISE NOTICE 'Dropped policy % on %', r.policyname, r.tablename;
    END LOOP;
END $$;

-- 3. Xóa function is_teacher() (gây infinite recursion)
DROP FUNCTION IF EXISTS is_teacher();

-- Xong! Tất cả bảng giờ có thể truy cập tự do (không cần RLS)
SELECT 'RLS đã được tắt thành công trên tất cả bảng!' AS result;
