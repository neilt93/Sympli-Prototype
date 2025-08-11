// Debug script to check token validity and localStorage
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugToken() {
  try {
    console.log('🔍 Debugging token issues...');
    
    // Get all users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    console.log(`📊 Found ${authUsers.users.length} auth users:`);
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
      console.log(`     Created: ${user.created_at}`);
      console.log(`     Last sign in: ${user.last_sign_in_at}`);
      console.log(`     Email confirmed: ${user.email_confirmed_at}`);
    });
    
    // Get public users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*');
    
    if (publicError) {
      console.error('❌ Error fetching public users:', publicError);
      return;
    }
    
    console.log(`\n📊 Found ${publicUsers.length} public users:`);
    publicUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
      console.log(`     Onboarding complete: ${user.onboarding_complete}`);
      console.log(`     Is active: ${user.is_active}`);
    });
    
    // Check if there are any users to test with
    if (authUsers.users.length > 0) {
      const testUser = authUsers.users[0];
      console.log(`\n🧪 Testing session creation for ${testUser.email}...`);
      
      // Try to create a session (this would normally be done during login)
      // Note: This is just for debugging - in real app, user would login with password
      console.log('   Note: Cannot create session without password, but user exists in auth system');
    }
    
    console.log('\n🔍 Manual Token Check Instructions:');
    console.log('====================================');
    console.log('1. Open browser console (F12)');
    console.log('2. Run: console.log(localStorage.getItem("authToken"))');
    console.log('3. Check if token exists and its format');
    console.log('4. If token exists, try:');
    console.log('   fetch("/api/onboarding", {');
    console.log('     method: "POST",');
    console.log('     headers: {');
    console.log('       "Content-Type": "application/json",');
    console.log('       "Authorization": "Bearer " + localStorage.getItem("authToken")');
    console.log('     },');
    console.log('     body: JSON.stringify({userRole: "myself", requiredConsents: {understandsNotDiagnostic: true, consentsToStorage: true, consentsToSummaryGeneration: true}})');
    console.log('   })');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugToken();
