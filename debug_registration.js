const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRegistration() {
  try {
    console.log('🔍 Debugging registration process...');
    
    // Step 1: Create user in auth.users
    console.log('📡 Step 1: Creating user in auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        fullName: 'Test User'
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    console.log('✅ User created in auth.users:', authData.user.email);
    console.log('✅ Auth user ID:', authData.user.id);

    // Step 2: Try to create profile in public.users
    console.log('📡 Step 2: Creating profile in public.users...');
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        is_active: true,
        profile: JSON.stringify({
          bloodType: 'Unknown',
          allergies: '',
          medications: '',
          emergencyContact: ''
        }),
        onboarding_complete: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      console.error('❌ Error details:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      });
    } else {
      console.log('✅ Profile created successfully:', profileData);
    }

    // Step 3: Check if user exists in public.users
    console.log('📡 Step 3: Checking if user exists in public.users...');
    const { data: checkData, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@example.com');

    if (checkError) {
      console.error('❌ Check error:', checkError);
    } else {
      console.log('📋 Users found in public.users:', checkData);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugRegistration();
