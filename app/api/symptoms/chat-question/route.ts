import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const openaiApiKey = process.env.OPENAI_API_KEY;

interface SymptomData {
  symptomType: 'headache' | 'fatigue' | 'side_effect' | 'pregnancy' | 'other';
  isNew: 'new' | 'ongoing';
  description: string;
  userDescription: string; // New field for user's own words description
  rawTranscript: string; // Raw patient response with proper grammar
  processedTranscript: string; // Processed transcript for clinical use
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

    // Safety precheck: quickly detect urgent red flags in latest user message
    try {
      const lastUser = (body?.previousMessages || []).slice().reverse().find((m: any) => (m.type === 'user' || m.role === 'user'));
      const txt = String(lastUser?.content || '').toLowerCase();
      const hasChestRedFlag = txt.includes('chest pain') && (txt.includes('breath') || txt.includes('sweat') || txt.includes('faint'));
      const hasPregnancyFlag = (txt.includes('pregnan')) && (txt.includes('bleeding') || (txt.includes('severe') && txt.includes('pain')));
      if (hasChestRedFlag || hasPregnancyFlag) {
        return NextResponse.json({
          question: 'Your message suggests urgent symptoms. Please consider seeking immediate medical attention (e.g., NHS 111 or emergency services). Would you like to stop here?',
          inputType: 'buttons',
          options: ['Stop'],
          isComplete: true
        });
      }
    } catch {}

    // Ongoing flow guardrails handled by LLM prompt; no deterministic questions here
    const idxNum = typeof currentQuestionIndex === 'number' ? currentQuestionIndex : 0;
    const followupsAsked = Math.max(0, idxNum - 2);
    const effectiveIsOngoing = String(currentSymptomData?.isNew || '') === 'ongoing';
    const progressionAsked = effectiveIsOngoing ? await llmProgressionAsked(previousMessages || []) : false;

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

    // LLM judge to prevent duplicates or repeating progression when already covered
    try {
      const verdict = await llmJudgeCandidate(previousMessages || [], String(questionData?.question || ''));
      if (verdict?.duplicate || (verdict?.category === 'progression' && progressionAsked)) {
        // Re-ask the LLM for a different question instead of using a deterministic fallback
        try {
          const retry = await generateAdaptiveQuestion(
            currentSymptomData,
            user.id,
            previousMessages || [],
            collectedResponses || {},
            typeof currentQuestionIndex === 'number' ? currentQuestionIndex : 0
          );
          if (retry?.question) questionData = retry;
        } catch {}
      }
    } catch {}

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
  const customName = (symptomData as any)?.customName as string | undefined;
  const symptomText = String(customName || symptomData.description || symptomData.symptomType || '').trim();
  const alreadySaid = (previousMessages || [])
    .map(m => String(m.content || '')).join('\n');
  const initialIsOngoing = symptomData.isNew === 'ongoing';
  // Guidance by symptom type (used to adapt flow without special-casing a single type)
  const typeGuidanceMap: Record<SymptomData['symptomType'], string> = {
    headache: 'Use SOCRATES framework: Site (exact location), Onset (sudden/gradual), Character (throbbing/stabbing/dull), Radiation (spreads where), Associated symptoms (nausea, photophobia, neck stiffness), Timing/pattern (episodic/constant, duration), Triggers/relievers (what makes it better/worse), Severity (0-10). RED FLAGS: thunderclap onset, fever with neck stiffness, neurological deficits, head injury, vision changes, confusion. Ask about sleep patterns, stress, medications, and functional impact.',
    fatigue: 'CLINICAL APPROACH: Duration (acute <2 weeks vs chronic), Pattern (morning vs evening, constant vs episodic), Sleep quality (insomnia, sleep apnea, restless legs), Associated symptoms (weight loss/gain, appetite changes, fever, night sweats, shortness of breath, chest pain, palpitations, muscle weakness, joint pain, mood changes), Activity tolerance (can they climb stairs, walk distances), Lifestyle factors (stress, work changes, exercise), Medications/supplements, Recent illnesses. RED FLAGS: chest pain, breathlessness at rest, syncope, unexplained weight loss, fever, night sweats.',
    side_effect: 'CLINICAL APPROACH: First identify the exposure (medication, vaccine, food, environmental, activity). Timing relative to exposure (minutes, hours, days). Severity and progression. What helps/worsens it. Other concurrent exposures. Prior similar reactions. Current medications/supplements. Functional impact. Consider drug interactions, allergies, and contraindications.',
    pregnancy: 'CLINICAL APPROACH: Focus on the specific symptom, not pregnancy itself. For each symptom, ask: onset, severity, location, pattern, triggers/relievers, associated symptoms. Screen for red flags: bleeding, severe pain, headaches with vision changes, reduced fetal movements, fever, severe nausea/vomiting. Ask about gestational age if relevant. Consider pregnancy-specific conditions (pre-eclampsia, gestational diabetes, etc.).',
    other: 'CLINICAL APPROACH: Clarify the exact symptom first. Then systematically explore: site/location, onset/timing, character/quality, associated symptoms, pattern/frequency, triggers/relievers, severity, functional/emotional impact. Consider differential diagnosis and red flags relevant to the specific symptom.'
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
  const hasFunctionalImpact = Boolean(String((symptomData as any)?.functionalImpact || '').trim());
  const hasEmotionalImpact = Boolean(String((symptomData as any)?.emotionalImpact || '').trim());
  const hasSeverity = (() => {
    try {
      const sev = String((symptomData as any)?.socratesData?.severity || '').trim();
      return /\b(10|[0-9])\b/.test(sev);
    } catch { return false; }
  })();
  // FI/EI enforcement via LLM prompt only. Do not inject deterministic questions
  if (questionNumber > totalMaxQuestions) {
    return { question: 'Thank you, I have enough information for now.', inputType: 'text', isComplete: true };
  }

  // Build structured context parts early so they are available throughout
  const contextHeaderParts: string[] = [];

  // For ongoing symptoms, include brief previous logs summary
  let previousSimilarSummary = '';
  let relevantPrevDisplay = '';
  let previousSimilar: any[] = [];
  if (initialIsOngoing && userId && symptomData?.symptomType) {
    try {
      const similar = await getPreviousSimilarSymptoms(userId, symptomData.symptomType);
      previousSimilar = Array.isArray(similar) ? similar : [];
      if (previousSimilar.length > 0) {
        const top = previousSimilar.slice(0, 3).map((p: any) => {
          const parts = [p.description, p.functional_impact, p.treatment_response, p.triggers, p.patterns, p.progress_description]
            .filter(Boolean)
            .join(' | ');
          return parts;
        });
        previousSimilarSummary = top.join('\n');

        // Find a clinically-relevant previous entry matching current description keywords
        const cur = String(symptomText || '').toLowerCase();
        const tokens = Array.from(new Set(cur.split(/[^a-z0-9]+/).filter(w => w.length >= 4)));
        let bestScore = -1;
        let best: any = null;
        for (const p of previousSimilar) {
          const text = [p.description, p.functional_impact, p.treatment_response, p.triggers, p.patterns, p.progress_description]
            .filter(Boolean)
            .map((x: any) => String(x).toLowerCase())
            .join(' ');
          let score = 0;
          for (const t of tokens) { if (t && text.includes(t)) score++; }
          if (score > bestScore) { bestScore = score; best = p; }
        }
        if (best && bestScore > 0) {
          const d = new Date(best.created_at);
          const dateStr = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
          const snippetSource = String(best.description || best.functional_impact || best.treatment_response || best.triggers || best.patterns || best.progress_description || '').trim();
          const words = snippetSource.split(/\s+/).slice(0, 14).join(' ');
          const snippet = words + (snippetSource.split(/\s+/).length > 14 ? '…' : '');
          if (dateStr && snippet) {
            relevantPrevDisplay = `${dateStr}: ${snippet}`;
          }
        }
      } else {
        // No prior logs for this type; treat like NEW for flow guidance
        contextHeaderParts.push('Note: No previous logs found for this symptom type, treat as NEW for now.');
        (symptomData as any).isNew = 'new';
        (symptomData as any).progress = '';
      }
    } catch {}
  }

  const effectiveIsOngoing = symptomData.isNew === 'ongoing';

  const systemPrompt = attachmentsStage
    ? `You are a medical assistant. Ask exactly ONE question to invite the user to add relevant attachments (photo, measurement, document, or voice note).

STRICT OUTPUT RULES:
- Output ONLY one single line that is a question and ends with a question mark.
- Do not include any statements, summaries, answers, or extra text.
- Do not repeat any question already asked in the conversation.`
    : `You are a UK GP conducting a clinical history. Ask exactly ONE intelligent follow-up question that a doctor would ask.

CLINICAL APPROACH:
- Think like a doctor: What's the most important missing piece of information for diagnosis/management?
- Build on previous answers: Reference what they've already told you and ask for the next logical detail.
- Consider differential diagnosis: What would help rule in/out common causes?
- Prioritise red flags: Ask about concerning symptoms that could indicate serious conditions.
- Be specific and clinical: Avoid generic questions like "tell me more" or "could you elaborate".

SYMPTOM-SPECIFIC GUIDANCE:
${typeGuidance}

CONVERSATION AWARENESS:
- Review the entire conversation history and DO NOT repeat any question already asked.
- Build on their previous answers: "You mentioned [specific detail], has [related question]?"
- Ask the single most clinically relevant next question based on what they've told you so far.
- Avoid asking about information they've already provided.

FOR ONGOING SYMPTOMS (Status: ONGOING):
- If a relevant previous entry is provided, reference it: "Last time you logged this on [date], you described [specific detail]. Has this changed?"
- Focus on progression, new symptoms, treatment response, and changes in severity/pattern.
- Ask context-aware questions that reference specific details from previous entries.

CLINICAL PRIORITIES:
- Red flags and concerning symptoms
- Severity and functional impact
- Pattern and timing
- Associated symptoms
- Triggers and relieving factors
- Treatment response (for ongoing symptoms)

TONE:
- Professional, concise UK clinical phrasing
- UK English spelling (oedema, diarrhoea)
- Direct, specific questions
- No leading questions or assumptions

STRICT OUTPUT RULES:
- Output ONLY one single line that ends with a question mark.
- Do not include any preface, acknowledgement, or extra text.
- Do not echo the user's words.`;

  // Build structured context + full conversation
  contextHeaderParts.push(`Symptom type: ${symptomData.symptomType}`);
  contextHeaderParts.push(`Status: ${effectiveIsOngoing ? 'ONGOING' : 'NEW'}`);
  if (symptomData.processedTranscript) {
    contextHeaderParts.push(`Presenting complaint (processed): "${symptomData.processedTranscript}"`);
  } else if (symptomData.userDescription) {
    contextHeaderParts.push(`User's own words: "${symptomData.userDescription}"`);
  }
  if (symptomText) contextHeaderParts.push(`Symptom category: "${symptomText}"`);
  if (effectiveIsOngoing && previousSimilarSummary) {
    contextHeaderParts.push(`Previous similar logs (summary):\n${previousSimilarSummary}`);
  }
  if (effectiveIsOngoing && relevantPrevDisplay) {
    contextHeaderParts.push(`Relevant previous: ${relevantPrevDisplay}`);
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
    console.log('🧠 Chat-question: Prompt variant ->', attachmentsStage ? 'attachments' : (effectiveIsOngoing ? 'ongoing' : 'new'));
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
    // No deterministic fallback; ask the LLM again
    const retry = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversation
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });
    const retryData = await retry.json();
    const retryContent = retryData?.choices?.[0]?.message?.content as string | undefined;
    if (!retryContent) throw new Error('LLM returned empty content');
    const retryQuestion = retryContent.trim().split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean).reverse().find((l: string) => /\?$/.test(l));
    if (!retryQuestion) throw new Error('LLM returned content without a question');
    return { question: retryQuestion, inputType: 'text', isComplete: false };
  }
  const parsedContent = content.trim();

  // If model signalled completion, respect it when we have asked enough
  const lower = parsedContent.toLowerCase();
  if ((lower.includes('enough information') || lower.startsWith('thank you')) && followupsAsked >= minFollowupsRequired) {
    return { question: 'Thank you, I have enough information for now.', inputType: 'text', isComplete: true };
  }

  const lines = parsedContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questionLine = [...lines].reverse().find(l => /\?$/.test(l));
  let first = questionLine;
  if (!first) {
    // Retry with a safe deterministic next question
    if (effectiveIsOngoing) {
      const st = String((symptomData as any)?.symptomType || '').toLowerCase();
      first = st === 'pregnancy'
        ? 'What specific symptom or concern are we logging today related to your pregnancy?'
        : 'What has changed since it started, better, worse, or the same?';
    } else {
      first = 'Where exactly is the pain located?';
    }
  }

  let nextQuestion = first;
  // Hard de-dupe: if progression has already been asked anytime, avoid asking it again
  const normalized = normalizeQuestion(String(nextQuestion || ''));
  const isProgressionText = /what has changed|better worse|better worse same|progressed|progression|same$/.test(normalized);
  let hasAskedProgressionEver = false;
  try {
    hasAskedProgressionEver = await llmProgressionAsked(previousMessages || []);
  } catch {}
  if (hasAskedProgressionEver && isProgressionText) {
    nextQuestion = 'Have there been any new triggers or patterns since it started?';
  }
  // Symptom-type safety: avoid irrelevant pain-location prompts for non-pain symptoms
  try {
    const st = String((symptomData as any)?.symptomType || '').toLowerCase();
    const nq = normalizeQuestion(String(nextQuestion || ''));
    const asksPainLoc = /(where.*(pain|located)|which part|site|where exactly)/.test(nq) || /\bpain\b/.test(nq);
    if (st === 'fatigue' && asksPainLoc) {
      nextQuestion = 'How long has the fatigue been present, and is it constant or does it vary during the day?';
    }
    if (st === 'side_effect' && asksPainLoc) {
      nextQuestion = 'What is the side effect related to, and when did it start relative to the exposure?';
    }
    if (st === 'pregnancy' && asksPainLoc) {
      nextQuestion = 'What is the specific symptom you are experiencing, and when did it start?';
    }
    // Pregnancy guard: never treat pregnancy itself as the symptom
    if (st === 'pregnancy') {
      const q = String(nextQuestion || '').toLowerCase();
      const genericPregnancy = /(pregnancy|pregnant)/.test(q);
      const hasSpecificSymptomWord = /(symptom|concern|pain|bleeding|nausea|vomit|vomiting|swelling|headache|contraction|movements?|fever|cough|rash)/.test(q);
      if (genericPregnancy && !hasSpecificSymptomWord) {
        nextQuestion = 'What specific symptom or concern are we logging today related to your pregnancy?';
      }
    }
  } catch {}

  // Completion logic: require at least 6 follow-ups; cap at 10 follow-ups
  const reachedMaxFollowups = followupsAsked >= totalFollowupsMax;
  if (!nextQuestion) {
    throw new Error('LLM did not return a question');
  }
  // Last-line de-dupe: if this exact question was already asked, select a safe alternative
  const seen = extractAskedQuestions(previousMessages || []);
  if (seen.has(normalizeQuestion(String(nextQuestion)))) {
    const st = String((symptomData as any)?.symptomType || '').toLowerCase();
    const alternates: Record<string, string[]> = {
      default: [
        'Have there been any new triggers or patterns since it started?',
        'On a scale of 0–10, how severe is it at its worst?'
      ],
      fatigue: [
        'How is your sleep, and do you wake feeling rested?',
        'Has this affected your ability to work, study, or exercise?'
      ],
      headache: [
        'When did it start, and how long do episodes last?',
        'Is anything making it better or worse?'
      ],
      side_effect: [
        'Has it improved, worsened, or stayed the same since it began?',
        'Have you tried anything that helped or made it worse?'
      ],
      pregnancy: [
        'Has anything made it better or worse?',
        'Are there any associated symptoms you have noticed?'
      ],
      other: [
        'Where is it located, if anywhere?',
        'Is anything making it better or worse?'
      ]
    };
    const cands = (alternates[st] || []).concat(alternates.default || []);
    const replacement = cands.find(q => !seen.has(normalizeQuestion(q)));
    if (replacement) nextQuestion = replacement;
  }
  if (reachedMaxFollowups) {
    return { question: 'Thank you, I have enough information for now.', inputType: 'text', isComplete: true };
  }
  // Attachments stage handled by agent above; no hardcoded prompt.
  // Carry forward collectedResponses as-is; client will send back on next turn { question: -> answer }
  return { question: nextQuestion, inputType: 'text', isComplete: false };
}

async function llmProgressionAsked(previousMessages: Array<{ type?: string; role?: string; content: string }>): Promise<boolean> {
  try {
    if (!openaiApiKey) return false;
    const convo = (previousMessages || []).map((m: any) => ({ role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '') })).slice(-20);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 10,
        messages: [
          { role: 'system', content: 'Answer only YES or NO. Has the assistant already asked a progression question (better/worse/same or what has changed) about the symptom at any point in this conversation? Reply exactly YES or NO.' },
          ...convo
        ]
      })
    });
    const data = await res.json();
    const a = String(data?.choices?.[0]?.message?.content || '').trim().toUpperCase();
    return a.startsWith('Y');
  } catch { return false; }
}

async function llmJudgeCandidate(previousMessages: Array<{ type?: string; role?: string; content: string }>, candidate: string): Promise<{ duplicate: boolean; category?: string } | null> {
  try {
    if (!openaiApiKey) return null;
    const convo = (previousMessages || []).map((m: any) => ({ role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '') })).slice(-20);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: 'system', content: 'You are a UK GP intake assistant. Given a short chat history and a candidate follow-up, return strict JSON: {"duplicate":true|false, "category":"progression|impact|severity|pattern|treatment|other"}. Consider duplicates by meaning, not exact wording.' },
          { role: 'user', content: `History:\n${convo.map(m=>m.role.toUpperCase()+': '+m.content).join('\n')}` },
          { role: 'user', content: `Candidate: ${candidate}` }
        ]
      })
    });
    const data = await res.json();
    try { return JSON.parse(String(data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; }
  } catch { return null; }
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
