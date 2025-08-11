const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser() {
  try {
    const email = 'neiltripathi93@gmail.com';
    console.log(`🔍 Deleting user: ${email}`);
    
    // First, find the user in auth.users to get their ID
    console.log('🔍 Finding user in auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    const authUser = authUsers.users.find(user => user.email === email);
    
    if (authUser) {
      console.log(`✅ Found user in auth.users with ID: ${authUser.id}`);
      
      // Delete from auth.users
      console.log('🗑️ Deleting from auth.users...');
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
      
      if (deleteAuthError) {
        console.error('❌ Error deleting from auth.users:', deleteAuthError);
      } else {
        console.log('✅ User deleted from auth.users');
      }
    } else {
      console.log('⚠️ User not found in auth.users');
    }
    
    // Delete from public.users
    console.log('🗑️ Deleting from public.users...');
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('❌ Error deleting from public.users:', error);
    } else {
      console.log('✅ User deleted from public.users table');
    }

    console.log('🎉 User deletion complete! You can now register again and it will create the user properly in both tables!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteUser();
