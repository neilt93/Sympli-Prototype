const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAuthUsers() {
  try {
    console.log('🗑️  Starting Supabase Auth user cleanup...');
    
    // List all auth users
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing auth users:', listError);
      return;
    }
    
    console.log(`📊 Found ${authUsers.users.length} auth users`);
    
    if (authUsers.users.length === 0) {
      console.log('✅ No auth users to remove');
      return;
    }
    
    // Delete each auth user
    for (const user of authUsers.users) {
      console.log(`🗑️  Deleting auth user: ${user.email} (${user.id})`);
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`❌ Error deleting auth user ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Deleted auth user: ${user.email}`);
      }
    }
    
    // Verify deletion
    const { data: remainingAuthUsers, error: verifyError } = await supabase.auth.admin.listUsers();
    
    if (verifyError) {
      console.error('❌ Error verifying auth user deletion:', verifyError);
    } else {
      console.log(`📊 Remaining auth users: ${remainingAuthUsers.users.length}`);
    }
    
    console.log('✅ Auth user cleanup completed');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
clearAuthUsers()
  .then(() => {
    console.log('🏁 Auth user cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
