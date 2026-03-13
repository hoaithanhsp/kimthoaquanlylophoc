---
description: Hướng dẫn cấu hình ngăn chặn Supabase tự động pause
---

# Hướng Dẫn Kích Hoạt Github Actions Ngăn Supabase Auto-Pause

Quy trình này hướng dẫn cách cấu hình tự động "ping" đến Supabase thông qua GitHub Actions, nhằm duy trì Activity của project (Query 1 dòng dữ liệu), từ đó ngăn việc Supabase tự động tạm ngưng (pause) project do không hoạt động trong 7 ngày đối với gói Free.

## Bước 1: Chuẩn bị trên Supabase

1. Truy cập **Supabase Dashboard** -> Vào project của bạn.
2. Mở tab **SQL Editor**.
3. Chạy câu truy vấn sau để tạo bảng ping:

```sql
CREATE TABLE IF NOT EXISTS keep_alive (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  last_ping TIMESTAMP DEFAULT NOW()
);

INSERT INTO keep_alive (name) 
VALUES ('github-actions-ping')
ON CONFLICT (name) DO NOTHING;
```

4. Truy cập **Settings -> API**.
5. Copy thông tin 2 thông số sau:
   - **Project URL** (ví dụ: `https://abcd.supabase.co`)
   - **Project API keys**: Copy mục **`service_role`** (KHÔNG COPY `anon` key, `service_role` giúp bỏ qua RLS).

## Bước 2: Chuẩn bị trên Github

### Lưu Key bảo mật

1. Mở repository chứa project của bạn (hoặc tạo repository mới nếu chưa có).
2. Vào tab **Settings**.
3. Phía Sidebar, chọn mục **Secrets and variables -> Actions**.
4. Chọn **New repository secret**.
5. Thêm lần lượt 2 biến sau:
   - Name: `SUPABASE_URL` -> Value: (Paste **Project URL** đã copy)
   - Name: `SUPABASE_SERVICE_ROLE_KEY` -> Value: (Paste **service_role** key đã copy)

### Cấu hình Workflow

1. Tại repository Github, chọn thẻ **Actions**.
2. Phía bên trái, chọn **New workflow** (hoặc tạo file trực tiếp nếu push code từ local).
3. Tạo thư mục/tệp với cấu trúc: `.github/workflows/supabase-keep-alive.yml`
4. Dán đoạn mã sau vào tệp và **Commit changes**:

```yaml
name: Keep Supabase Active

on:
  schedule:
    # Set to chron schedule (e.g. 0 9 * * 1,4 meaning Monday and Thursday at 9 AM UTC)
    - cron: '0 9 * * 1,4'
  workflow_dispatch:

jobs:
  ping-supabase:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Supabase client
        run: npm install @supabase/supabase-js

      - name: Ping Supabase database
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          node -e "
          const { createClient } = require('@supabase/supabase-js');
          
          const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          
          (async () => {
            try {
              const { data, error } = await supabase
                .from('keep_alive')
                .select('name')
                .eq('name', 'github-actions-ping')
                .single();
              
              if (error) throw error;
              
              const { error: updateError } = await supabase
                .from('keep_alive')
                .update({ last_ping: new Date().toISOString() })
                .eq('name', 'github-actions-ping');
              
              if (updateError) throw updateError;
              
              console.log('✅ Supabase ping successful at', new Date().toISOString());
              console.log('📊 Data:', data);
            } catch (err) {
              console.error('❌ Error pinging Supabase:', err.message);
              process.exit(1);
            }
          })();
          "
```

## Bước 3: Chạy Test tự động (Manual Test)

1. Tải lại trang web Github Repo -> Vào tab **Actions**.
2. Tại cột bên trái, bạn sẽ thấy Workflow có tên: "**Keep Supabase Active**". Hãy click vào nó.
3. Nhìn sang phần nội dung bên phải, một popup màu xám hiện ra có nút **Run workflow**. Hãy click vào nút đó và xác nhận **Run workflow** (nút xanh) thêm một lần nữa.
4. Chờ 30s-60s, màn hình sẽ cập nhật chạy Job. Nếu xuất hiện biểu tượng dấu tích xanh lục ✅ thì bạn đã cấu hình hoàn tất.

*Lưu ý: Workflow sẽ tự động chạy định kỳ 2 lần/tuần vào mỗi chiều Thứ 2 và Thứ 5 vào lúc 16h.*
