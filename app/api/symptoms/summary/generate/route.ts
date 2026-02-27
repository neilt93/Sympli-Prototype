import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { moderateInput, structuredCompletion } from '../../../../lib/openai';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Conversation-based single-log summary.
    if (Array.isArray(body?.conversationMessages)) {
      const conversation = (body.conversationMessages || []).map((m: any) => ({
        role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || '')
      })).slice(-20);

      const joined = conversation.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const moderation = await moderateInput(joined);
      if (moderation.blocked) {
        return NextResponse.json({ error: 'Conversation blocked by safety checks' }, { status: 400 });
      }

      try {
        const format: 'paragraph' | 'bullets' = body?.format === 'paragraph' ? 'paragraph' : 'bullets';
        const parsed = await structuredCompletion<{ summaryText: string }>({
          schemaName: 'symptom_single_log_summary',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summaryText: { type: 'string' }
            },
            required: ['summaryText']
          },
          system: 'You are a UK NHS clinical summariser. Create concise, factual summaries in neutral clinical language.',
          user: [
            `Format: ${format}`,
            'Summarise the single symptom log conversation.',
            'Include onset/timing, severity, associated symptoms, triggers/relievers, and functional/emotional impact when available.',
            'No recommendations. No speculation.',
            `Conversation:\n${joined}`
          ].join('\n'),
          model: 'gpt-4o-mini',
          temperature: 0.25,
          maxTokens: 280,
        });

        const summaryText = String(parsed?.summaryText || '').trim();
        if (!summaryText) {
          return NextResponse.json({ error: 'Empty summary from model' }, { status: 500 });
        }
        return NextResponse.json({ summaryText });
      } catch {
        return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 });
      }
    }

    // Dataset-style fallback summary when conversation is not provided.
    const { data: symptomLogs, error: fetchError } = await supabaseService
      .from('symptom_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch symptom data for summary' }, { status: 500 });
    }

    if (!symptomLogs || symptomLogs.length === 0) {
      return NextResponse.json({ error: 'No symptom data found to generate summary' }, { status: 404 });
    }

    const totalSymptoms = symptomLogs.length;
    const recentSymptoms = symptomLogs.filter((log: any) => {
      const logDate = new Date(log.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return logDate > weekAgo;
    }).length;

    const severityBreakdown = symptomLogs.reduce((acc: Record<string, number>, log: any) => {
      const sev = String(log.severity_scale ?? 'unknown');
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {});

    const commonSymptoms = symptomLogs.reduce((acc: Record<string, number>, log: any) => {
      const symptom = String(log.symptom_name || log.symptom_type || log.description || 'unknown').toLowerCase();
      acc[symptom] = (acc[symptom] || 0) + 1;
      return acc;
    }, {});

    const topSymptoms = Object.entries(commonSymptoms)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([symptom, count]) => ({ symptom, count }));

    return NextResponse.json({
      summary: {
        totalSymptoms,
        recentSymptoms,
        severityBreakdown,
        topSymptoms,
        generatedAt: new Date().toISOString(),
        timeRange: {
          from: symptomLogs[symptomLogs.length - 1]?.created_at,
          to: symptomLogs[0]?.created_at
        }
      },
      message: 'Symptoms summary generated successfully'
    });
  } catch (error) {
    console.error('Error in symptoms summary generate API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

