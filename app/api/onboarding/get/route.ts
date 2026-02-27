import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

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

    console.log('📊 Fetching onboarding data...');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    try {
      // Get onboarding data from Supabase
      const { data: onboardingData, error: fetchError } = await supabaseService
        .from('onboarding_data')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No data found
          return NextResponse.json(
            { error: 'No onboarding data found' },
            { status: 404 }
          );
        }
        console.error('❌ Error fetching onboarding data:', fetchError);
        return NextResponse.json(
          { error: 'Database error occurred' },
          { status: 500 }
        );
      }

      if (onboardingData) {
        console.log('✅ Onboarding data found for user:', user.email);
        // Remove internal fields before sending to client
        const { id, user_id, created_at, updated_at, ...cleanData } = onboardingData;
        return NextResponse.json(cleanData);
      } else {
        return NextResponse.json(
          { error: 'No onboarding data found' },
          { status: 404 }
        );
      }
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

