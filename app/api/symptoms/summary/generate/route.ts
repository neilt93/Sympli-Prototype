import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY;

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

    console.log('🤖 Generating symptoms summary for user:', user.email);

    // If conversationMessages provided, generate a clinical summary for the current log
    if (Array.isArray(body?.conversationMessages)) {
      if (!openaiApiKey) {
        return NextResponse.json({ error: 'OPENAI_API_KEY is missing' }, { status: 500 });
      }
      const conversation = (body.conversationMessages || []).map((m: any) => ({
        role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || '')
      })).slice(-20); // recent context

      const format: 'paragraph' | 'bullets' = body?.format === 'paragraph' ? 'paragraph' : 'bullets';
      const prompt = format === 'paragraph'
        ? `You are a UK NHS clinical summariser. Based on the patient–assistant conversation, write a concise clinical summary of THIS SINGLE LOG as one short paragraph (2–4 sentences). Convert the patient's wording into clinical language. Include symptom(s) and context, onset/timing if known, severity if present, key associated features or red flags denied/affirmed, triggers/relievers, and functional/emotional impact if relevant. UK English, clinical, clear, neutral. No filler, no recommendations. Only use a short quote in double quotes if a specific phrase must be preserved. Output one paragraph only.`
        : `You are a UK NHS clinical summariser. Based on the patient–assistant conversation, write a concise clinical summary of THIS SINGLE LOG in 3–6 short bullet points. Convert patient wording into clinical language. Only include verbatim quotes (in double quotes) if a specific phrase must be preserved.

Rules:
- UK English. Clinical, clear, and neutral tone.
- No filler. No speculation. No recommendations.
- Include: symptom(s) and context, onset/timing if known, severity if present, key associated features or red flags denied/affirmed, triggers/relievers, functional/emotional impact if mentioned.
- Do NOT copy patient text verbatim except short quotes where essential.
- Output bullets only, each line starting with • .`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            ...conversation
          ],
          temperature: 0.3,
          max_tokens: 250
        })
      });
      const data = await res.json();
      if (data?.error) {
        console.error('Summary LLM error:', data.error);
        return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 });
      }
      const summaryText = (data?.choices?.[0]?.message?.content as string | undefined)?.trim();
      if (!summaryText) {
        return NextResponse.json({ error: 'Empty summary from model' }, { status: 500 });
      }
      return NextResponse.json({ summaryText });
    }

    // Get user's symptom logs for summary generation
    const { data: symptomLogs, error: fetchError } = await supabaseService
      .from('symptom_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to recent logs for summary

    if (fetchError) {
      console.error('❌ Error fetching symptom logs for summary:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch symptom data for summary' },
        { status: 500 }
      );
    }

    if (!symptomLogs || symptomLogs.length === 0) {
      return NextResponse.json(
        { error: 'No symptom data found to generate summary' },
        { status: 404 }
      );
    }

    // Generate a simple dataset summary (fallback when not using conversation-based summary)
    const totalSymptoms = symptomLogs.length;
    const recentSymptoms = symptomLogs.filter(log => {
      const logDate = new Date(log.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return logDate > weekAgo;
    }).length;

    const severityBreakdown = symptomLogs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonSymptoms = symptomLogs.reduce((acc, log) => {
      const desc = log.symptom_description.toLowerCase();
      acc[desc] = (acc[desc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSymptoms = Object.entries(commonSymptoms)
      .sort(([,a]: [string, number], [,b]: [string, number]) => b - a)
      .slice(0, 3)
      .map(([symptom, count]) => ({ symptom, count }));

    const summary = {
      totalSymptoms,
      recentSymptoms,
      severityBreakdown,
      topSymptoms,
      generatedAt: new Date().toISOString(),
      timeRange: {
        from: symptomLogs[symptomLogs.length - 1]?.created_at,
        to: symptomLogs[0]?.created_at
      }
    };

    console.log('✅ Generated symptoms summary');

    return NextResponse.json({
      summary,
      message: 'Symptoms summary generated successfully'
    });

  } catch (error) {
    console.error('❌ Error in symptoms summary generate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
