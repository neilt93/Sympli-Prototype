import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const openaiApiKey = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    const input = String(text || '').trim();
    if (!input) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    // Fallback normaliser if no key
    const fallback = () => {
      let t = input
        .replace(/[“”]/g, '"')
        .replace(/[’]/g, "'")
        .replace(/\b(hurts|sore|tender|aching|ache)\b/gi, 'pain')
        .replace(/\b(pain\s+in|pain\s+at|pain\s+on|pain\s+of)\b/gi, 'pain')
        .replace(/^\s*(my|the|a|an)\s+/i, '')
        .replace(/[.!?]+$/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();
      return t || input.toLowerCase();
    };

    if (!openaiApiKey) {
      return NextResponse.json({ term: fallback() });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 30,
        messages: [
          { role: 'system', content: 'Convert the user\'s free-text symptom into a concise clinical noun phrase (UK English), suitable as a log title. Do not add punctuation. Prefer forms like "left leg pain", "right shoulder tendon pain", "abdominal cramps". Keep it short and specific. Output only the phrase.' },
          { role: 'user', content: input }
        ]
      })
    });
    const data = await res.json();
    const term = (data?.choices?.[0]?.message?.content || '').trim();
    if (!term) return NextResponse.json({ term: fallback() });
    return NextResponse.json({ term });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


