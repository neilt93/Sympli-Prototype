import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symptomData } = body;

    const questions = await generateRoleplayQuestions(symptomData);

    return NextResponse.json({ questions });

  } catch (error) {
    console.error('Error in roleplay questions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateRoleplayQuestions(symptomData: any): Promise<string[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return defaultFallbackQuestions();
  }

  const safeSymptom = String(symptomData?.symptom || "")
    .replace(/[\n\r"]/g, '') // remove newlines & quotes
    .trim();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly NHS clinic assistant preparing a patient for the doctor. Your job is to collect all relevant information the doctor needs before diagnosis.'
        },
        {
          role: 'user',
          content: `The patient has just told you they are experiencing: "${safeSymptom}". Ask 3–6 natural, conversational questions covering:
- Basic details (onset, character, severity)
- History (medications, recent changes, stress)
- Associated symptoms
- Lifestyle impact

Respond ONLY with a JSON array of strings.`
        }
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json" } // enforce valid JSON output
    })
  });

  const data = await response.json();

  // If API error, log and fallback
  if (!data?.choices?.length) {
    console.error("OpenAI API error:", data);
    return defaultFallbackQuestions();
  }

  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return isStringArray(parsed) ? parsed : defaultFallbackQuestions();
  } catch (err) {
    console.error('Failed to parse model output:', err);
    return defaultFallbackQuestions();
  }
}

function isStringArray(val: any): val is string[] {
  return Array.isArray(val) && val.every(item => typeof item === 'string');
}

function defaultFallbackQuestions() {
  return [
    "When did this symptom first start?",
    "Can you describe exactly how it feels?",
    "Have you noticed any changes in severity?",
    "Are there any other symptoms occurring alongside this?"
  ];
}
