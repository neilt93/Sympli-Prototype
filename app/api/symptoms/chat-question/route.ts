import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const openaiApiKey = process.env.OPENAI_API_KEY;

interface SymptomData {
  symptomType: 'headache' | 'fatigue' | 'side_effect' | 'pregnancy' | 'other';
  isNew: 'new' | 'ongoing';
  description: string;
  llmResponses: string[];
  functionalImpact: string;
  emotionalImpact: string;
  triggers: string;
  patterns: string;
  treatmentResponse: string;
  progress: string;
}

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

    const { currentSymptomData, currentQuestionIndex, previousMessages, collectedResponses } = body;

    // Generate adaptive questions based on the current context
    let questionData = await generateAdaptiveQuestion(
      currentSymptomData,
      user.id,
      previousMessages || [],
      collectedResponses || {},
      typeof currentQuestionIndex === 'number' ? currentQuestionIndex : 0
    );

    // Guard against repetition: if the question matches any previous assistant question, request another once
    if (questionData?.question) {
      const seen = new Set<string>();
      for (const m of (previousMessages || [])) {
        const isAssistant = !(m.type === 'user' || m.role === 'user');
        if (!isAssistant) continue;
        const content = String(m.content || '').trim();
        if (content) seen.add(content.toLowerCase());
      }
      if (seen.has(String(questionData.question || '').trim().toLowerCase())) {
        try {
          const retry = await generateAdaptiveQuestion(
            currentSymptomData,
            user.id,
            previousMessages || [],
            collectedResponses || {},
            typeof currentQuestionIndex === 'number' ? currentQuestionIndex : 0
          );
          if (retry?.question && !seen.has(String(retry.question).trim().toLowerCase())) {
            questionData = retry;
          }
        } catch {}
      }
    }

    return NextResponse.json(questionData);

  } catch (error) {
    console.error('❌ Error in chat question API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

type QuestionItem = { question: string; inputType?: 'text' | 'buttons'; options?: string[] };

function normalizeQuestion(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAskedQuestions(previousMessages: Array<{ type?: string; role?: string; content: string }>): Set<string> {
  const seen = new Set<string>();
  for (const m of previousMessages || []) {
    const isAssistant = !(m.type === 'user' || m.role === 'user');
    if (!isAssistant) continue;
    const content = String(m.content || '');
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const numbered = line.match(/^\s*(\d+)[\.)]\s*(.+)$/);
      if (numbered && numbered[2]) {
        seen.add(normalizeQuestion(numbered[2]));
        continue;
      }
      if (/[?]$/.test(line)) {
        seen.add(normalizeQuestion(line));
      }
    }
    if (/[?]$/.test(content.trim())) {
      seen.add(normalizeQuestion(content.trim()));
    }
  }
  return seen;
}

// All deterministic fallbacks removed as OPENAI_API_KEY is guaranteed present

async function generateAdaptiveQuestion(
  symptomData: SymptomData,
  userId: string,
  previousMessages: Array<{ type?: string; role?: string; content: string }>,
  collectedResponses: Record<string, any>,
  currentQuestionIndex: number
) {
  // No fallbacks: always ask via LLM using the unified symptom log prompt
  const symptomText = String(symptomData.description || symptomData.symptomType || '').trim();
  const alreadySaid = (previousMessages || [])
    .map(m => String(m.content || '')).join('\n');
  const isOngoing = symptomData.isNew === 'ongoing';
  // Guidance by symptom type (used to adapt flow without special-casing a single type)
  const typeGuidanceMap: Record<SymptomData['symptomType'], string> = {
    headache: 'Use SOCRATES: Site, Onset, Character, Radiation, Associated symptoms, Timing/pattern, Triggers/relievers, Severity. Consider red flags (thunderclap onset, fever, neck stiffness, neuro deficits, head injury). Include functional/emotional impact as relevant.',
    fatigue: 'Clarify duration, diurnal variation, sleep quality, mood, associated symptoms (weight change, appetite change, fever, shortness of breath), activity tolerance, lifestyle and stressors, medications. Ask about red flags (chest pain, breathlessness at rest, syncope).',
    side_effect: 'First clarify what the side effect is and what it relates to (medicine, vaccine, treatment, product, food, activity) or if unsure. Do not assume medication unless already mentioned. Once source is clear, ask about timing in relation to exposure, severity and impact, what helps/worsens, other exposures/meds/supplements, and prior reactions.',
    pregnancy: 'Do NOT assume the user is pregnant unless they have explicitly said so. First clarify whether this is about a possible pregnancy/test, an established pregnancy, or a pregnancy-related symptom. If established, include gestational timing if known. Ask one clinically helpful question based on the concern and screen for red flags sensitively (bleeding, severe pain, headaches/vision changes, reduced fetal movements).',
    other: 'First clarify the exact symptom in the user’s own words. Then use general clinical structure: site/location (if applicable), onset/timing, character, associated symptoms, pattern, triggers/relievers, severity, functional/emotional impact, salient red flags.'
  };
  const typeGuidance = typeGuidanceMap[symptomData.symptomType] || typeGuidanceMap.other;
  const askedSoFar = collectedResponses?.follow_ups ? Object.keys(collectedResponses.follow_ups) : [];
  const followupCount = Array.isArray(askedSoFar) ? askedSoFar.length : Object.keys(collectedResponses?.follow_ups || {}).length;
  const attachmentsStage = followupCount >= 5 && !collectedResponses?.attachmentsAsked;
  const totalMaxQuestions = 12;
  const questionNumber = Math.max(1, (currentQuestionIndex || 0) + 1);
  const followupsAsked = Math.max(0, (currentQuestionIndex || 0) - 2);
  const totalFollowupsMax = 10;
  const minFollowupsRequired = 6;
  if (questionNumber > totalMaxQuestions) {
    return { question: 'Thank you — I have enough information for now.', inputType: 'text', isComplete: true };
  }

  // Build structured context parts early so they are available throughout
  const contextHeaderParts: string[] = [];

  // For ongoing symptoms, include brief previous logs summary
  let previousSimilarSummary = '';
  if (isOngoing && userId && symptomData?.symptomType) {
    try {
      const similar = await getPreviousSimilarSymptoms(userId, symptomData.symptomType);
      if (Array.isArray(similar) && similar.length > 0) {
        const top = similar.slice(0, 3).map((p: any) => {
          const parts = [p.description, p.functional_impact, p.treatment_response, p.triggers, p.patterns, p.progress_description]
            .filter(Boolean)
            .join(' | ');
          return parts;
        });
        previousSimilarSummary = top.join('\n');
      } else {
        // No prior logs for this type; treat like NEW for flow guidance
        contextHeaderParts.push('Note: No previous logs found for this symptom type — treat as NEW for now.');
        (symptomData as any).isNew = 'new';
        (symptomData as any).progress = '';
      }
    } catch {}
  }

  const systemPrompt = attachmentsStage
    ? `You are a medical assistant. Ask exactly ONE question to invite the user to add relevant attachments (photo, measurement, document, or voice note).

STRICT OUTPUT RULES:
- Output ONLY one single line that is a question and ends with a question mark.
- Do not include any statements, summaries, answers, or extra text.
- Do not repeat any question already asked in the conversation.`
    : `You are a medical assistant. Ask exactly ONE follow‑up question to progress the clinical history.

For NEW symptoms (Status: NEW):
- Prioritise clarifying questions appropriate to the symptom type.
- Symptom-type guidance: ${typeGuidance}

For ONGOING symptoms (Status: ONGOING):
- Focus on changes since prior logs: better/worse/same, new symptoms, treatment response, new triggers/patterns, functional and emotional impact.
- Use the previous similar logs summary in the context.

TONE AND STYLE:
- Use professional, concise UK clinical phrasing.
- Avoid tag questions (e.g., "..., isn't it?").
- Avoid emotive/colloquial fillers and any leading or assumptive wording.
- Ask a single, neutral, precise question.

SPECIFICITY (conversation-aware):
- Avoid vague prompts like "Could you share a bit more detail?".
- Tie the question to what the patient just said or their presenting complaint.
- It’s fine to refer to what they said in plain language (e.g., "You mentioned throat swelling after penicillin — did it start within an hour?").
- Ask for the single most relevant missing detail now.
 - Do NOT use generic fillers like "tell me more", "could you elaborate", or "more detail".

QUESTION CADENCE:
- The overall flow should ask between 6 and 10 follow-up questions in total.
- This is follow-up number ${followupsAsked + 1} of at most ${totalFollowupsMax}. Ask the most clinically useful next question now.

CRITICAL:
- Review the entire conversation history and DO NOT repeat any question that has already been asked.
- Ask something new that has not been covered yet.
- Do NOT ask meta-questions about logging other symptoms/concerns, next steps, or ending the session. Only ask clinically relevant follow-ups for this symptom.

STRICT OUTPUT RULES:
- Output ONLY one single line that ends with a question mark.
- Do not include any preface or acknowledgement.
- Do not include any other statements, summaries, or extra text.
- Do not echo the user's words.`;

  // Build structured context + full conversation
  contextHeaderParts.push(`Symptom type: ${symptomData.symptomType}`);
  contextHeaderParts.push(`Status: ${isOngoing ? 'ONGOING' : 'NEW'}`);
  if (symptomText) contextHeaderParts.push(`Presenting complaint: "${symptomText}"`);
  if (isOngoing && previousSimilarSummary) {
    contextHeaderParts.push(`Previous similar logs (summary):\n${previousSimilarSummary}`);
  }
  const contextHeader = contextHeaderParts.join('\n');

  const conversation = [
    { role: 'system', content: `Context:\n${contextHeader}` },
    ...((previousMessages || []).map((m: any) => ({
      role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '')
    })))
  ];

  // Debug: log full chat history passed to LLM
  try {
    const convoDump = conversation
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');
    console.log('🧠 Chat-question: Full conversation context sent to LLM ->');
    console.log(convoDump);
    console.log('🧠 Chat-question: Prompt variant ->', attachmentsStage ? 'attachments' : (isOngoing ? 'ongoing' : 'new'));
    console.log('🧠 Chat-question: askedSoFar ->', askedSoFar);
  } catch {}

  // Debug: log the API key being used
  console.log('🧠 Chat-question: API key being used ->', openaiApiKey ? `${openaiApiKey.substring(0, 20)}...` : 'NOT SET');
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  // Debug: log what we're sending to LLM
  console.log('🧠 Chat-question: System prompt ->', systemPrompt);
  console.log('🧠 Chat-question: Conversation length ->', conversation.length);
  console.log('🧠 Chat-question: Context header ->', contextHeader);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation
      ],
      temperature: 0.6,
      max_tokens: 200
    })
  });

  const data = await res.json();
  
  // Debug: log the full response
  console.log('🧠 Chat-question: OpenAI response ->', JSON.stringify(data, null, 2));
  
  const content = data?.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error('LLM returned empty content');
  }
  const parsedContent = content;

  const lines = parsedContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questionLine = [...lines].reverse().find(l => /\?$/.test(l));
  if (!questionLine) {
    throw new Error('LLM did not return a question');
  }
  const first = questionLine;

  const nextQuestion = first;

  // Completion logic: require at least 6 follow-ups; cap at 10 follow-ups
  const reachedMaxFollowups = followupsAsked >= totalFollowupsMax;
  if (!nextQuestion) {
    if (followupsAsked >= minFollowupsRequired) {
      return { question: 'Thank you — I have enough information for now.', inputType: 'text', isComplete: true };
    }
    throw new Error('LLM did not return a question');
  }
  if (reachedMaxFollowups) {
    return { question: 'Thank you — I have enough information for now.', inputType: 'text', isComplete: true };
  }
  // Attachments stage handled by agent above; no hardcoded prompt.
  // Carry forward collectedResponses as-is; client will send back on next turn { question: -> answer }
  return { question: nextQuestion, inputType: 'text', isComplete: false };
}

async function getPreviousSimilarSymptoms(userId: string, symptomType: string) {
  try {
    const { data, error } = await supabaseService
      .from('symptom_logs')
      .select('description,functional_impact,treatment_response,triggers,patterns,progress_description,created_at,severity_scale')
      .eq('user_id', userId)
      .eq('symptom_type', symptomType)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function generateLLMNextQuestion(
  symptomData: SymptomData,
  previousMessages: Array<{ type?: string; role?: string; content: string }>,
  previousSimilar: any[],
  adaptiveCount: number
): Promise<{ question: string; options?: string[]; inputType?: 'text' | 'buttons' } | null> {
  try {
    const conversation = (previousMessages || []).map((m: any) => ({
      role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '')
    })).slice(-12);

    const previousSummary = previousSimilar.slice(0, 3).map((p, i) => {
      const parts = [p.description, p.functional_impact, p.treatment_response, p.triggers, p.patterns, p.progress_description]
        .filter(Boolean)
        .join(' | ');
      return `#${i + 1}: ${parts}`;
    }).join('\n');
    //prompt
    const symptomText = String(symptomData.description || symptomData.symptomType || '').trim();
    const systemPrompt = `You are Sympli, a helpful NHS primary care role‑play assistant. Ask exactly ONE next follow‑up question that progresses the clinical history.

Context & rules:
- You will be given the ENTIRE chat history; avoid repeating anything already asked/answered.
- The first two questions (symptom type and new/ongoing) were already asked.
- Follow‑ups asked so far: ${adaptiveCount}. You may ask up to 10 follow‑up questions in total, one at a time, adapting to the user's last answers.
- If NEW: prioritise Site, Onset, Character, Radiation, Associated Symptoms, Pattern/Timing, Triggers/Relievers, Severity, Functional Impact, Emotional Impact — but ONLY what hasn't been covered yet.
- If ONGOING: prioritise Progress, Better/Worse/Same, New Symptoms, Response to Treatment, New Triggers/Patterns, Functional Impact, Emotional Impact, Changes in Severity/Timing — and use prior similar logs if provided.
- Prior similar logs (if any): ${previousSummary || 'None'}
- Output exactly ONE line: the single follow‑up question ending with a question mark.
- No bullet points. No numbering. No explanations.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversation
        ],
        temperature: 0.6,
        max_tokens: 200
      })
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    if (!content || !content.trim()) {
      throw new Error('LLM returned empty content');
    }
    
    // Clean up the response - remove quotes and trim
    const question = content.replace(/^"|"$/g, '').trim();
    if (!question) {
      throw new Error('LLM returned empty content');
    }
    
    return { question, inputType: 'text' };
  } catch {
    return null;
  }
}
