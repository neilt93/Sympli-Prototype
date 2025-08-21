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

async function clearAllData() {
  try {
    console.log('🗑️  Starting complete data cleanup...');
    
    // Tables to clear (in order of dependencies)
    const tables = [
      'symptom_logs',
      'onboarding_data', 
      'users'
    ];
    
    for (const table of tables) {
      console.log(`\n📋 Clearing table: ${table}`);
      
      // Count records
      const { data: countData, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact' });
      
      if (countError) {
        console.error(`❌ Error counting ${table}:`, countError);
        continue;
      }
      
      const recordCount = countData.length;
      console.log(`📊 Found ${recordCount} records in ${table}`);
      
      if (recordCount === 0) {
        console.log(`✅ No records to remove from ${table}`);
        continue;
      }
      
      // Delete all records
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep dummy record if needed
      
      if (deleteError) {
        console.error(`❌ Error deleting from ${table}:`, deleteError);
        continue;
      }
      
      console.log(`✅ Successfully cleared ${table}`);
      
      // Verify deletion
      const { data: remainingData, error: verifyError } = await supabase
        .from(table)
        .select('id');
      
      if (verifyError) {
        console.error(`❌ Error verifying ${table} deletion:`, verifyError);
      } else {
        console.log(`📊 Remaining records in ${table}: ${remainingData.length}`);
      }
    }
    
    console.log('\n🎉 Complete data cleanup finished!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
clearAllData()
  .then(() => {
    console.log('🏁 Data cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
