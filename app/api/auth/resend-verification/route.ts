import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Resend verification API called');
    
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('📧 Resending verification email to:', email);

    // Resend verification email using Supabase
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      console.error('❌ Resend verification error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to resend verification email' },
        { status: 400 }
      );
    }

    console.log('✅ Verification email resent successfully');

    return NextResponse.json({
      message: 'Verification email sent successfully',
      email: email
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
