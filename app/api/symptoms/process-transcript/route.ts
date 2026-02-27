import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const openaiApiKey = process.env.OPENAI_API_KEY;

export const dynamic = 'force-dynamic';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { rawTranscript } = body;
    
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return NextResponse.json(
        { error: 'Raw transcript is required' },
        { status: 400 }
      );
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Process the raw transcript with proper grammar using OpenAI
    const systemPrompt = `You are a medical transcription assistant. Your task is to correct the grammar, punctuation, and sentence structure of a patient's raw symptom description while preserving their exact meaning and medical details.

IMPORTANT RULES:
1. Preserve ALL medical information exactly as stated
2. Fix grammar, punctuation, and sentence structure
3. Maintain the patient's voice and terminology
4. Do NOT add medical interpretations or clinical language
5. Do NOT change medical terms, symptoms, or descriptions
6. Keep the same level of detail and specificity
7. Only correct obvious grammatical errors and improve readability

Input: Raw patient transcript
Output: Grammatically correct version with proper punctuation and sentence structure`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawTranscript }
        ],
        temperature: 0.1, // Low temperature for consistent grammar correction
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to process transcript' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const processedTranscript = data.choices?.[0]?.message?.content?.trim() || rawTranscript;

    console.log('📝 Transcript processed:', {
      original: rawTranscript.substring(0, 100) + '...',
      processed: processedTranscript.substring(0, 100) + '...'
    });

    return NextResponse.json({
      processedTranscript,
      originalLength: rawTranscript.length,
      processedLength: processedTranscript.length
    });

  } catch (error) {
    console.error('❌ Error processing transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
