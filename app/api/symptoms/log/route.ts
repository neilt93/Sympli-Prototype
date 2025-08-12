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
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('📝 Logging symptom for user:', user.email);

    // Create symptom data in the correct format for the database schema
    const symptomLogData = {
      user_id: user.id,
      symptom_data: {
        symptom: body.symptomData?.symptom,
        type: body.symptomData?.type,
        description: body.symptomData?.description,
        socrates: body.socratesData || {},
        report: body.reportData || {},
        created_at: new Date().toISOString()
      },
      data_retention_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    const { data: symptomLog, error: insertError } = await supabaseService
      .from('symptom_logs')
      .insert(symptomLogData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting symptom log:', insertError);
      return NextResponse.json(
        { error: 'Failed to log symptom' },
        { status: 500 }
      );
    }

    console.log('✅ Symptom logged successfully');

    return NextResponse.json({
      message: 'Symptom logged successfully',
      symptomLog
    });

  } catch (error) {
    console.error('❌ Error in symptoms log API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
