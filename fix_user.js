const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser() {
  try {
    console.log('🔍 Creating user in Supabase Auth...');
    
    // Create user in Supabase Auth with the same ID as in public.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'neiltripathi93@gmail.com',
      password: 'testpassword123', // You can change this later
      email_confirm: true,
      user_metadata: {
        fullName: 'Neil Tripathi'
      }
    });

    if (authError) {
      console.error('❌ Error:', authError.message);
      return;
    }

    console.log('✅ User created in auth.users:', authData.user.email);
    console.log('✅ Auth user ID:', authData.user.id);
    
    // Update the public.users table to use the auth.users ID
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        id: authData.user.id
      })
      .eq('email', 'neiltripathi93@gmail.com');

    if (updateError) {
      console.error('❌ Error updating public.users:', updateError);
    } else {
      console.log('✅ Public users table updated');
    }

    console.log('🎉 User fixed! You can now log in with:');
    console.log('Email: neiltripathi93@gmail.com');
    console.log('Password: testpassword123');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUser();
