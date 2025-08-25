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

    // Extract symptom data from the chat flow
    const symptomData = body.symptomData;
    const socratesData = body.socratesData || {};
    const reportData = body.reportData || {};
    const tags: string[] = Array.isArray(body.tags) ? body.tags.slice(0, 12) : [];
    const chatTranscript = Array.isArray(body.chatTranscript) ? body.chatTranscript : [];
    
    // Map symptom type to human-readable name
    const symptomNameMap: Record<string, string> = {
      'headache': 'Headache',
      'fatigue': 'Fatigue',
      'side_effect': 'Side Effect',
      'pregnancy': 'Pregnancy Symptom',
      'other': 'Other Symptom'
    };
    
    // Extract severity from Socrates data or default to 5
    let severityScale = 5;
    if (socratesData.severity) {
      const severityMatch = socratesData.severity.match(/(\d+)/);
      if (severityMatch) {
        severityScale = parseInt(severityMatch[1]);
      }
    }
    
    // Create symptom data in the enhanced format for the database schema
    const displaySymptomName = (symptomData?.customName && String(symptomData.customName).trim())
      ? String(symptomData.customName).trim()
      : (symptomNameMap[symptomData.symptomType] || 'Unknown Symptom');

    const symptomLogData = {
      user_id: user.id,
      symptom_type: symptomData.symptomType,
      symptom_name: displaySymptomName,
      is_new: symptomData.isNew === 'new',
      severity_scale: severityScale,
      description: symptomData.description,
      location: socratesData.site,
      onset_time: socratesData.onset,
      character_description: socratesData.character,
      radiation: socratesData.radiation,
      associated_symptoms: socratesData.associations,
      time_course: socratesData.timeCourse,
      exacerbating_factors: socratesData.exacerbatingFactors,
      functional_impact: reportData.functionalImpact,
      emotional_impact: reportData.emotionalImpact,
      triggers: reportData.triggers,
      patterns: reportData.patterns,
      treatment_response: reportData.treatmentResponse,
      progress_description: reportData.progress,
      additional_context: {
        llmResponses: symptomData.llmResponses,
        socratesData: socratesData,
        reportData: reportData,
        custom_name: symptomData.customName || null
      },
      symptom_data: {
        symptom: symptomData.symptomType,
        type: symptomData.isNew,
        description: symptomData.description,
        customName: symptomData.customName || null,
        socrates: socratesData,
        report: reportData,
        llmResponses: symptomData.llmResponses,
        created_at: new Date().toISOString()
      },
      tags: tags.length ? tags : null,
      metadata: {
        generated_by: 'chat-flow',
        version: 1
      },
      chat_transcript: chatTranscript,
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
