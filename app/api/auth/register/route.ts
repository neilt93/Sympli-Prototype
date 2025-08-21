import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use anon client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Use service client for database operations
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Registration API called');
    
    const body = await request.json();
    const { fullName, email, password } = body;

    console.log('📧 Registration data received:', { email, fullName, hasPassword: !!password });

    if (!fullName || !email || !password) {
      console.error('❌ Missing required fields:', { fullName: !!fullName, email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    
    // Check auth.users
    const { data: existingAuthUsers, error: authCheckError } = await supabaseService.auth.admin.listUsers();
    if (authCheckError) {
      console.error('❌ Error checking auth users:', authCheckError);
      return NextResponse.json(
        { error: 'Error checking user existence' },
        { status: 500 }
      );
    }

    const existingAuthUser = existingAuthUsers.users.find((user: any) => 
      user.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      console.log('❌ User already exists in auth system');
      return NextResponse.json(
        { error: 'User already registered. Please login instead.' },
        { status: 409 }
      );
    }

    // Create user with Supabase Auth (requires email verification)
    console.log('🆕 Creating new user with Supabase Auth...');
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      console.error('❌ Supabase auth error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Registration failed' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error('❌ No user created');
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    console.log('✅ User created in Supabase Auth:', authData.user.email);
    console.log('📧 Email verification required before login');

    // Create user profile in public.users table (use upsert to handle existing records)
    console.log('📝 Creating user profile...');
    const { data: profileData, error: profileError } = await supabaseService
      .from('users')
      .upsert({
        id: authData.user.id,
        email: normalizedEmail,
        full_name: fullName,
        created_at: new Date().toISOString(),
        is_active: true,
        profile: JSON.stringify({
          // Profile data will be populated during onboarding
        }),
        onboarding_complete: false
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      // User was created in auth but profile failed - still return success
      console.log('⚠️ User created but profile failed, continuing...');
    }

    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      full_name: fullName,
      onboarding_complete: false,
      is_active: true,
      email_confirmed: false
    };

    console.log('✅ Registration successful, email verification required');
    console.log('🔑 Session data:', {
      hasSession: !!authData.session,
      hasAccessToken: !!authData.session?.access_token,
      hasRefreshToken: !!authData.session?.refresh_token
    });

    return NextResponse.json({
      message: 'Registration successful! Please check your email to verify your account before signing in.',
      user: userData,
      requiresEmailVerification: true,
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
