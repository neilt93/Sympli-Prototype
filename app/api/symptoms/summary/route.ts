import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use anon client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Use service client for database operations
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(request: NextRequest) {
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

    console.log('📝 Updating symptoms summary for user:', user.email);

    // Update or create summary in the database
    const { data: summary, error: updateError } = await supabaseService
      .from('symptom_logs')
      .update({
        summary: body.summary,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('id', body.symptomLogId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating symptom summary:', updateError);
      return NextResponse.json(
        { error: 'Failed to update symptom summary' },
        { status: 500 }
      );
    }

    console.log('✅ Symptom summary updated successfully');

    return NextResponse.json({
      message: 'Symptom summary updated successfully',
      summary
    });

  } catch (error) {
    console.error('❌ Error in symptoms summary update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
