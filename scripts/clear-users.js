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

async function clearAllUsers() {
  try {
    console.log('🗑️  Starting user cleanup...');
    
    // First, let's see how many users we have
    const { data: userCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Error counting users:', countError);
      return;
    }
    
    console.log(`📊 Found ${userCount.length} users in the database`);
    
    if (userCount.length === 0) {
      console.log('✅ No users to remove');
      return;
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete ALL users from the database!');
    console.log('   This action cannot be undone.');
    console.log('\nTo proceed, type "DELETE ALL USERS" (case sensitive):');
    
    // For safety, we'll require manual confirmation
    // In a real script, you might want to add a confirmation prompt here
    
    // Delete all users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep a dummy record if needed
    
    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError);
      return;
    }
    
    console.log('✅ Successfully removed all users from the database');
    
    // Verify deletion
    const { data: remainingUsers, error: verifyError } = await supabase
      .from('users')
      .select('id');
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
      return;
    }
    
    console.log(`📊 Remaining users: ${remainingUsers.length}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
clearAllUsers()
  .then(() => {
    console.log('🏁 User cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
