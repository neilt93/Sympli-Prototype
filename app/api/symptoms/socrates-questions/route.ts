import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symptomData, conversationHistory } = body;

    const questions = await generateConversationalQuestions(symptomData, conversationHistory);

    return NextResponse.json({ questions });

  } catch (error) {
    console.error('Error in conversational questions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateConversationalQuestions(symptomData: any, conversationHistory: any[] = []): Promise<string[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return generateFallbackQuestions(symptomData, conversationHistory);
  }

  const safeSymptom = String(symptomData?.symptom || "")
    .replace(/[\n\r"]/g, '') // remove newlines & quotes
    .trim();

  // Create conversation context from history
  const conversationContext = conversationHistory.length > 0 
    ? conversationHistory.map((entry, index) => 
        `${entry.role === 'user' ? 'Patient' : 'Assistant'}: ${entry.content}`
      ).join('\n')
    : '';

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
          content: `You are a friendly, empathetic health assistant helping patients log their symptoms. Your goal is to gather comprehensive information through natural conversation.

IMPORTANT RULES:
- Generate 3-6 MAXIMUM follow-up questions (never more than 6)
- Questions must be NATURAL and CONVERSATIONAL, not clinical/form-like
- NEVER repeat information already provided
- Questions should be ADAPTIVE based on what the patient has already shared
- Focus on what's most relevant for this specific symptom
- Use varied language and tone to feel natural
- Consider the symptom type (new vs ongoing) when crafting questions
- ALWAYS include at least one question about FUNCTIONAL IMPACT (how it affects daily activities, work, sleep, etc.)
- Use SOCRATES framework as a GUIDE for what information to gather, but phrase questions naturally:
  * Site: Where is the problem located?
  * Onset: When did it start?
  * Character: How does it feel?
  * Radiation: Does it spread anywhere?
  * Associations: What other symptoms occur with it?
  * Time course: How has it changed over time?
  * Exacerbating factors: What makes it better or worse?
  * Severity: How bad is it?

Current conversation: ${conversationContext ? `\n\nPrevious conversation:\n${conversationContext}` : 'No previous conversation'}

Symptom: ${safeSymptom}
Type: ${symptomData?.type || 'unknown'}

Respond ONLY with a JSON array of strings containing the questions.`
        },
        {
          role: 'user',
          content: `The patient is experiencing: "${safeSymptom}" (${symptomData?.type || 'unknown'} symptom).

Based on our conversation so far, generate 3-6 natural, conversational follow-up questions that:
1. Are relevant to this specific symptom
2. Don't repeat information already shared
3. Feel like a natural conversation, not a medical form
4. Are adaptive to what they've already told us
5. Help gather the most important missing information
6. MUST include at least one question about functional impact (daily activities, work, sleep, etc.)

Use the SOCRATES framework as a guide for what information to gather, but phrase questions naturally and conversationally.

Current conversation context: ${conversationContext || 'No previous conversation'}

Respond ONLY with a JSON array of strings.`
        }
      ],
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();

  if (!data?.choices?.length) {
    console.error("OpenAI API error:", data);
    return generateFallbackQuestions(symptomData, conversationHistory);
  }

  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    const questions = isStringArray(parsed) ? parsed : [];
    
    // Ensure we don't exceed 6 questions maximum
    return questions.slice(0, 6);
  } catch (err) {
    console.error('Failed to parse model output:', err);
    return generateFallbackQuestions(symptomData, conversationHistory);
  }
}

function generateFallbackQuestions(symptomData: any, conversationHistory: any[] = []): string[] {
  const isOngoing = symptomData?.type === 'ongoing';
  const symptom = symptomData?.symptom?.toLowerCase() || '';
  
  // Check what information we already have from conversation history
  const hasLocation = conversationHistory.some(entry => 
    entry.content.toLowerCase().includes('where') || 
    entry.content.toLowerCase().includes('location') ||
    entry.content.toLowerCase().includes('site')
  );
  
  const hasOnset = conversationHistory.some(entry => 
    entry.content.toLowerCase().includes('when') || 
    entry.content.toLowerCase().includes('start') ||
    entry.content.toLowerCase().includes('begin')
  );
  
  const hasSeverity = conversationHistory.some(entry => 
    entry.content.toLowerCase().includes('scale') || 
    entry.content.toLowerCase().includes('1-10') ||
    entry.content.toLowerCase().includes('severe')
  );
  
  const hasFunctionalImpact = conversationHistory.some(entry => 
    entry.content.toLowerCase().includes('affect') || 
    entry.content.toLowerCase().includes('daily') ||
    entry.content.toLowerCase().includes('work') ||
    entry.content.toLowerCase().includes('activities')
  );
  
  const questions = [];
  
  // Adaptive questions based on what's missing and symptom type
  if (!hasLocation) {
    questions.push("Where exactly are you experiencing this?");
  }
  
  if (!hasOnset && !isOngoing) {
    questions.push("When did you first notice this symptom?");
  }
  
  if (!hasSeverity) {
    questions.push("How would you rate the intensity of this on a scale of 1 to 10?");
  }
  
  if (!hasFunctionalImpact) {
    questions.push("How is this affecting your ability to do everyday activities?");
  }
  
  // Add symptom-specific questions
  if (symptom.includes('pain')) {
    questions.push("How would you describe the sensation - is it sharp, dull, throbbing, or something else?");
  } else if (symptom.includes('fatigue') || symptom.includes('tired')) {
    questions.push("How is this affecting your energy levels throughout the day?");
  } else if (symptom.includes('headache')) {
    questions.push("Is the pain on one side, both sides, or all over?");
  } else if (symptom.includes('nausea') || symptom.includes('sick')) {
    questions.push("Have you noticed any triggers that make this worse?");
  }
  
  // Add ongoing vs new symptom specific questions
  if (isOngoing) {
    questions.push("How has this been affecting your daily routine?");
  } else {
    questions.push("What were you doing when this started?");
  }
  
  // Ensure we have functional impact question
  if (!questions.some(q => q.toLowerCase().includes('affect') || q.toLowerCase().includes('daily'))) {
    questions.push("How is this impacting your day-to-day life?");
  }
  
  return questions.slice(0, 4); // Ensure max 4 fallback questions
}

function isStringArray(val: any): val is string[] {
  return Array.isArray(val) && val.every(item => typeof item === 'string');
}
