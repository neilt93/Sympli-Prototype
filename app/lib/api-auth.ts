import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthenticatedResult = {
  user: any | null;
  token: string | null;
  errorResponse: NextResponse | null;
};

export async function requireAuthenticatedUser(request: NextRequest): Promise<AuthenticatedResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      token: null,
      errorResponse: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }),
    };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      token,
      errorResponse: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  return { user, token, errorResponse: null };
}

