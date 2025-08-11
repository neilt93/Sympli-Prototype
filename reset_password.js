const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword() {
  try {
    console.log('🔍 Resetting password for user...');
    
    // Update the user's password
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
      'neiltripathi93@gmail.com', // This should be the user ID, not email
      {
        password: 'testpassword123'
      }
    );

    if (authError) {
      console.error('❌ Error updating password:', authError.message);
      
      // Let's try to get the user first
      console.log('🔍 Trying to get user by email...');
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        return;
      }
      
      const user = users.users.find(u => u.email === 'neiltripathi93@gmail.com');
      if (user) {
        console.log('✅ Found user in auth.users:', user.id);
        
        // Now update the password with the correct user ID
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            password: 'testpassword123'
          }
        );
        
        if (updateError) {
          console.error('❌ Error updating password:', updateError);
        } else {
          console.log('✅ Password updated successfully!');
          console.log('🎉 You can now log in with:');
          console.log('Email: neiltripathi93@gmail.com');
          console.log('Password: testpassword123');
        }
      } else {
        console.log('❌ User not found in auth.users');
      }
    } else {
      console.log('✅ Password updated successfully!');
      console.log('🎉 You can now log in with:');
      console.log('Email: neiltripathi93@gmail.com');
      console.log('Password: testpassword123');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetPassword();
