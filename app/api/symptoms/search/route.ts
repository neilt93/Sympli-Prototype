import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

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

    const { query } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching logs for user:', user.email, 'query:', query);

    // Get all user's symptom logs
    const { data: allLogs, error: fetchError } = await supabaseService
      .from('symptom_logs')
      .select('id, created_at, symptom_type, symptom_name, severity_scale, functional_impact, description, symptom_data, additional_context, tags')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching logs for search:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    if (!allLogs || allLogs.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        message: 'No logs found'
      });
    }

    // Search and rank results
    const searchResults = searchAndRankLogs(allLogs, query);
    
    console.log(`✅ Found ${searchResults.length} matching logs for query: "${query}"`);

    return NextResponse.json({
      results: searchResults,
      total: searchResults.length,
      query: query
    });

  } catch (error) {
    console.error('❌ Error in search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function searchAndRankLogs(logs: any[], query: string): any[] {
  const searchTerm = query.toLowerCase().trim();
  const searchTokens = searchTerm.split(/\s+/).filter(token => token.length > 0);
  
  if (searchTokens.length === 0) {
    return logs.slice(0, 5); // Return 5 most recent if no search terms
  }

  const scoredLogs = logs.map(log => {
    let score = 0;
    let matchTypes: string[] = [];

    // Extract searchable content
    const title = String(log.symptom_name || log.symptom_type || '').toLowerCase();
    const rawTranscript = String(
      log.symptom_data?.rawTranscript || 
      log.additional_context?.raw_transcript || 
      ''
    ).toLowerCase();
    const processedTranscript = String(
      log.symptom_data?.processedTranscript || 
      log.additional_context?.processed_transcript || 
      ''
    ).toLowerCase();
    const presentingComplaint = String(
      log.symptom_data?.processedTranscript || 
      log.additional_context?.processed_transcript ||
      log.description || 
      ''
    ).toLowerCase();
    const tags = Array.isArray(log.tags) ? log.tags.map((t: any) => String(t || '').toLowerCase()) : [];

    // Title match (highest priority)
    for (const token of searchTokens) {
      if (title.includes(token)) {
        score += 10;
        matchTypes.push('title');
      }
    }

    // Raw transcript match (high priority)
    for (const token of searchTokens) {
      if (rawTranscript.includes(token)) {
        score += 8;
        matchTypes.push('raw');
      }
    }

    // Processed transcript match (high priority)
    for (const token of searchTokens) {
      if (processedTranscript.includes(token)) {
        score += 8;
        matchTypes.push('processed');
      }
    }

    // Presenting complaint match (medium priority)
    for (const token of searchTokens) {
      if (presentingComplaint.includes(token)) {
        score += 6;
        matchTypes.push('presenting');
      }
    }

    // Tag match (medium priority)
    for (const token of searchTokens) {
      if (tags.some(tag => tag.includes(token))) {
        score += 5;
        matchTypes.push('tag');
      }
    }

    // Exact phrase match bonus
    if (title.includes(searchTerm)) {
      score += 5;
    }
    if (rawTranscript.includes(searchTerm)) {
      score += 3;
    }
    if (processedTranscript.includes(searchTerm)) {
      score += 3;
    }
    if (presentingComplaint.includes(searchTerm)) {
      score += 2;
    }

    return {
      ...log,
      searchScore: score,
      matchTypes: Array.from(new Set(matchTypes)) // Remove duplicates
    };
  });

  // Filter logs with matches and sort by score (highest first), then by date (newest first)
  const matchingLogs = scoredLogs
    .filter(log => log.searchScore > 0)
    .sort((a, b) => {
      if (a.searchScore !== b.searchScore) {
        return b.searchScore - a.searchScore; // Higher score first
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newer first
    });

  return matchingLogs;
}
