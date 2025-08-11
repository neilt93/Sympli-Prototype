import { NextRequest, NextResponse } from 'next/server';
import { OnboardingData } from '../../types/onboarding';
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
    console.log('📝 Onboarding API called');
    const body: OnboardingData = await request.json();
    
    // Validate required fields
    if (!body.userRole) {
      return NextResponse.json(
        { error: 'User role is required' },
        { status: 400 }
      );
    }

    if (body.userRole === 'caregiver' && !body.caregiverConsent) {
      return NextResponse.json(
        { error: 'Caregiver consent is required for caregiver role' },
        { status: 400 }
      );
    }

    if (!body.requiredConsents.understandsNotDiagnostic ||
        !body.requiredConsents.consentsToStorage ||
        !body.requiredConsents.consentsToSummaryGeneration) {
      return NextResponse.json(
        { error: 'All required consents must be accepted' },
        { status: 400 }
      );
    }

    // Get the user ID from the request headers (token)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token received, length:', token.length);
    
    try {
      // Verify the token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('❌ Token verification failed:', authError);
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }

      const userId = user.id;
      console.log('✅ Token verified, user ID:', userId);

      // Save onboarding data to Supabase
      const { data: onboardingData, error: onboardingError } = await supabaseService
        .from('onboarding_data')
        .upsert({
          user_id: userId,
          personal_information: body.personalInformation,
          user_role: body.userRole,
          medical_information: body.medicalInformation,
          caregiver_consent: body.caregiverConsent,
          required_consents: body.requiredConsents,
          is_complete: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (onboardingError) {
        console.error('❌ Supabase onboarding error:', onboardingError);
        return NextResponse.json(
          { error: 'Failed to save onboarding data' },
          { status: 500 }
        );
      }

      // Update user record to mark onboarding as complete
      const { data: updateUserData, error: userError } = await supabaseService
        .from('users')
        .update({
          onboarding_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (userError) {
        console.error('❌ Supabase user update error:', userError);
        return NextResponse.json(
          { error: 'Failed to update user data' },
          { status: 500 }
        );
      }

      console.log('✅ Onboarding data saved to Supabase for user:', userId);
      
      return NextResponse.json({
        message: 'Onboarding completed successfully',
        data: body
      });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


