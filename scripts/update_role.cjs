const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeTeacher(email) {
  try {
    console.log(`Bắt đầu tìm user với email: ${email}`);
    
    // Tìm user trong auth.users (cần service role)
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) throw userError;
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`Không tìm thấy user với email ${email}`);
      return;
    }
    
    console.log(`Đã tìm thấy user id: ${user.id}, đang cập nhật profiles...`);
    
    // Đọc/Cập nhật profile
    const { data: profileCheck, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError; // Bỏ qua lỗi not found (PGRST116)
    }
    
    if (!profileCheck) {
       console.log('Chưa có record ở profiles, đang tạo mới...');
       const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert([{ id: user.id, role: 'teacher' }]);
       if (insertError) throw insertError;
    } else {
       console.log('Đã có record, đang update role...');
       const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'teacher' })
          .eq('id', user.id);
       if (updateError) throw updateError;
    }
    
    console.log(`✅ Đã cấp quyền giáo viên thành công cho ${email}.`);
  } catch (err) {
    console.error('❌ Lỗi:', err);
  }
}

makeTeacher('tranthikimthoa.c3hd@soctrang.edu.vn');
