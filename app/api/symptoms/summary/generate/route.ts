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

    console.log('🤖 Generating symptoms summary for user:', user.email);

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

    // Generate a simple summary (in a real app, you'd use AI/ML here)
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
