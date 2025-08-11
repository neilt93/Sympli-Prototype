// Check synchronization status between auth.users and public.users tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSyncStatus() {
  try {
    console.log('🔍 Checking user synchronization status...');
    
    // Use the database function to get sync status
    const { data: syncStatus, error: syncError } = await supabase.rpc('check_user_sync_status');
    
    if (syncError) {
      console.error('❌ Error checking sync status:', syncError);
      return;
    }
    
    if (syncStatus && syncStatus.length > 0) {
      const status = syncStatus[0];
      console.log('\n📊 User Synchronization Status:');
      console.log('================================');
      console.log(`🔐 Auth users: ${status.auth_users_count}`);
      console.log(`👤 Public users: ${status.public_users_count}`);
      console.log(`❌ Missing in public.users: ${status.missing_in_public}`);
      console.log(`❌ Missing in auth.users: ${status.missing_in_auth}`);
      console.log(`⚠️  Orphaned public users: ${status.orphaned_public}`);
      
      // Provide recommendations
      console.log('\n💡 Recommendations:');
      if (status.missing_in_public > 0) {
        console.log(`   - Run sync function to create ${status.missing_in_public} missing profiles`);
      }
      if (status.missing_in_auth > 0) {
        console.log(`   - ${status.missing_in_auth} public users need auth accounts`);
      }
      if (status.orphaned_public > 0) {
        console.log(`   - ${status.orphaned_public} public users have null IDs`);
      }
      if (status.missing_in_public === 0 && status.missing_in_auth === 0 && status.orphaned_public === 0) {
        console.log('   ✅ All users are properly synchronized!');
      }
    }
    
    // Also show detailed breakdown
    console.log('\n🔍 Detailed Breakdown:');
    console.log('=====================');
    
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    // Get public users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, is_active, created_at')
      .order('created_at', { ascending: false });
    
    if (publicError) {
      console.error('❌ Error fetching public users:', publicError);
      return;
    }
    
    console.log(`\n📋 Auth Users (${authUsers.users.length}):`);
    authUsers.users.forEach(user => {
      const publicUser = publicUsers.find(p => p.id === user.id);
      const status = publicUser ? '✅' : '❌';
      console.log(`   ${status} ${user.email} (${user.id})`);
    });
    
    console.log(`\n📋 Public Users (${publicUsers.length}):`);
    publicUsers.forEach(user => {
      const authUser = authUsers.users.find(a => a.id === user.id);
      const status = authUser ? '✅' : '❌';
      const activeStatus = user.is_active ? '🟢' : '🔴';
      console.log(`   ${status} ${activeStatus} ${user.email} (${user.id || 'NULL'})`);
    });
    
  } catch (error) {
    console.error('❌ Check sync error:', error);
  }
}

// Run the check
checkSyncStatus();
