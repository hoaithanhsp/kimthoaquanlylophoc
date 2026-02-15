-- Thêm cột student_code và birthday vào bảng students
-- Chạy file này trong Supabase SQL Editor

ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birthday date;

-- Tạo index cho student_code để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);

SELECT 'Đã thêm cột student_code và birthday vào bảng students!' AS result;
