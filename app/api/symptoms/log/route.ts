import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

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
    console.log('🔍 Debug - Received symptomData:', symptomData);
    console.log('🔍 Debug - symptomType received:', symptomData?.symptomType);
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
    
    // Extract severity from Socrates data; if unavailable set to 0 (unknown)
    let severityScale = 0;
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

    // Handle custom date if provided
    let createdAt = new Date();
    if (symptomData.customDate) {
      try {
        createdAt = new Date(symptomData.customDate);
        // Validate the date
        if (isNaN(createdAt.getTime())) {
          createdAt = new Date(); // Fallback to current date if invalid
        }
      } catch {
        createdAt = new Date(); // Fallback to current date if parsing fails
      }
    }

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
      created_at: createdAt.toISOString(),
      additional_context: {
        llmResponses: symptomData.llmResponses,
        socratesData: socratesData,
        reportData: reportData,
        custom_name: symptomData.customName || null,
        custom_date: symptomData.customDate || null,
        user_description: symptomData.userDescription || null,
        raw_transcript: symptomData.rawTranscript || null,
        processed_transcript: symptomData.processedTranscript || null
      },
      symptom_data: {
        symptom: symptomData.symptomType,
        type: symptomData.isNew,
        description: symptomData.description,
        userDescription: symptomData.userDescription || null,
        rawTranscript: symptomData.rawTranscript || null,
        processedTranscript: symptomData.processedTranscript || null,
        customName: symptomData.customName || null,
        customDate: symptomData.customDate || null,
        socrates: socratesData,
        report: reportData,
        llmResponses: symptomData.llmResponses,
        created_at: createdAt.toISOString()
      },
      tags: tags.length ? tags : null,
      metadata: {
        generated_by: 'chat-flow',
        version: 1
      },
      chat_transcript: chatTranscript,
      data_retention_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    console.log('💾 About to save symptom log:', JSON.stringify(symptomLogData, null, 2));
    
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

    console.log('✅ Symptom logged successfully, ID:', symptomLog.id);
    console.log('✅ Log created_at:', symptomLogData.created_at);

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
