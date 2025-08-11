import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use anon client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Use service client for database operations
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No valid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    console.log('🔍 Verifying token with Supabase...');

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', user.email);

    // Get user profile from public.users table
    const { data: profile, error: profileError } = await supabaseService
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('✅ User profile found:', profile.email);

    // Check if email is confirmed
    const isEmailConfirmed = user.email_confirmed_at !== null;
    const needsEmailVerification = !isEmailConfirmed;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile.full_name,
        onboarding_complete: profile.onboarding_complete,
        email_confirmed: isEmailConfirmed,
        needs_email_verification: needsEmailVerification,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
