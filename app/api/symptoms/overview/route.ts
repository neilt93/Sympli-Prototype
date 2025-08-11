import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use anon client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Use service client for database operations
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
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

    console.log('📊 Fetching symptoms overview for user:', user.email);

    // Get symptom logs for the user
    const { data: symptomLogs, error: fetchError } = await supabaseService
      .from('symptom_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching symptom logs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch symptom overview' },
        { status: 500 }
      );
    }

    // Calculate overview statistics
    const totalSymptoms = symptomLogs?.length || 0;
    const recentSymptoms = symptomLogs?.filter(log => {
      const logDate = new Date(log.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return logDate > weekAgo;
    }).length || 0;

    const severityCounts = symptomLogs?.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const commonSymptoms = symptomLogs?.reduce((acc, log) => {
      const desc = log.symptom_description.toLowerCase();
      acc[desc] = (acc[desc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const topSymptoms = Object.entries(commonSymptoms)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));

    console.log(`✅ Generated overview for ${totalSymptoms} symptoms`);

    return NextResponse.json({
      overview: {
        totalSymptoms,
        recentSymptoms,
        severityCounts,
        topSymptoms,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in symptoms overview API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
