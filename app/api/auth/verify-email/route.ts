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
    console.log('📧 Email verification API called');
    
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    console.log('🔑 Verifying email with token...');

    // Try different verification methods
    let verificationResult;
    let verificationError;

    // Method 1: Try verifyOtp with token_hash
    try {
      verificationResult = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });
      verificationError = verificationResult.error;
    } catch (error) {
      console.log('Method 1 failed, trying method 2...');
    }

    // Method 2: Try verifyOtp with token directly
    if (verificationError) {
      try {
        // Skip this method as it requires email parameter
        console.log('Method 2 skipped - requires email parameter');
      } catch (error) {
        console.log('Method 2 failed, trying method 3...');
      }
    }

    // Method 3: Try verifyOtp with email and token
    if (verificationError) {
      try {
        // Get email from localStorage or try to extract from token
        const email = localStorage.getItem('pendingVerificationEmail');
        if (email) {
          verificationResult = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
          });
          verificationError = verificationResult.error;
        }
      } catch (error) {
        console.log('Method 3 failed');
      }
    }

    if (verificationError || !verificationResult?.data?.user) {
      console.error('❌ Email verification error:', verificationError);
      return NextResponse.json(
        { error: verificationError?.message || 'Email verification failed' },
        { status: 400 }
      );
    }

    console.log('✅ Email verified successfully for user:', verificationResult.data.user.email);

    // Update the user's email_confirmed status in public.users
    const { error: updateError } = await supabaseService
      .from('users')
      .update({
        email_confirmed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationResult.data.user.id);

    if (updateError) {
      console.error('⚠️ Failed to update email_confirmed status:', updateError);
      // Continue anyway - the email was verified successfully
    }

    return NextResponse.json({
      message: 'Email verified successfully',
      user: {
        id: verificationResult.data.user.id,
        email: verificationResult.data.user.email,
        email_confirmed: true
      }
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
