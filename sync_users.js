// Sync existing users between auth.users and public.users tables
// Run this script in Supabase SQL editor or via the Supabase CLI

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

async function syncUsers() {
  try {
    console.log('🔄 Starting user synchronization...');
    
    // First, run the sync function
    const { data, error } = await supabase.rpc('sync_existing_users');
    
    if (error) {
      console.error('❌ Sync function error:', error);
      return;
    }
    
    console.log('✅ Sync function executed successfully');
    
    // Check the results
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, created_at');
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    if (publicError) {
      console.error('❌ Error fetching public users:', publicError);
      return;
    }
    
    console.log(`📊 Auth users: ${authUsers.users.length}`);
    console.log(`📊 Public users: ${publicUsers.length}`);
    
    // Check for mismatches
    const authUserIds = new Set(authUsers.users.map(u => u.id));
    const publicUserIds = new Set(publicUsers.map(u => u.id));
    
    const missingInPublic = [...authUserIds].filter(id => !publicUserIds.has(id));
    const missingInAuth = [...publicUserIds].filter(id => !authUserIds.has(id));
    
    if (missingInPublic.length > 0) {
      console.log(`⚠️  Users missing in public.users: ${missingInPublic.length}`);
      missingInPublic.forEach(id => {
        const user = authUsers.users.find(u => u.id === id);
        console.log(`   - ${user?.email} (${id})`);
      });
    }
    
    if (missingInAuth.length > 0) {
      console.log(`⚠️  Users missing in auth.users: ${missingInAuth.length}`);
      missingInAuth.forEach(id => {
        const user = publicUsers.find(u => u.id === id);
        console.log(`   - ${user?.email} (${id})`);
      });
    }
    
    if (missingInPublic.length === 0 && missingInAuth.length === 0) {
      console.log('✅ All users are properly synchronized!');
    }
    
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

// Run the sync
syncUsers();
