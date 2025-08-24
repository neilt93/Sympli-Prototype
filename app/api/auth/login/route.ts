import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Login API called');
    
    // Environment check
    const envCheck = {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
    };
    console.log('🔍 Environment check:', envCheck);

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    console.log('🔍 Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created');

    const body = await request.json();
    const { email, password } = body;

    console.log('🔍 Parsing request body...');
    console.log('🔍 Request data:', { email, hasPassword: !!password });

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Attempting Supabase authentication...');
    
    // Use Supabase Auth directly
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    console.log('🔍 Auth result:', {
      hasData: !!data,
      hasError: !!authError,
      errorMessage: authError?.message
    });

    if (authError) {
      console.error('❌ Supabase auth error:', authError);
      
      // Handle email not confirmed case
      if (authError.message === 'Email not confirmed') {
        return NextResponse.json({
          error: 'Email not confirmed',
          requiresEmailVerification: true,
          message: 'Please verify your email address before signing in'
        }, { status: 401 });
      }
      
      return NextResponse.json(
        { error: authError.message || 'Login failed' },
        { status: 401 }
      );
    }

    // Get user profile from public.users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.log('⚠️ Profile fetch error:', profileError);
      // Continue anyway - user might not have completed onboarding
    }

    // Return combined auth and profile data
    const payload = {
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
        last_sign_in_at: data.user.last_sign_in_at,
        ...profileData // Include profile data if available
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    };

    console.log('✅ Login successful, setting auth cookie and returning user data');
    const res = NextResponse.json(payload);

    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const isProd = process.env.NODE_ENV === 'production';

    // Set secure httpOnly cookie for middleware protection
    res.cookies.set('auth_token', data.session.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    // Optionally set refresh token as well (httpOnly)
    res.cookies.set('refresh_token', data.session.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return res;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
