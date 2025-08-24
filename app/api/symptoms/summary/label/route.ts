import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY;

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

    const {
      presentingComplaint,
      followups, // [{ question, answer }]
      symptomType, // e.g., headache
      status, // 'new' | 'ongoing'
      severity, // number or string
      attachments = [],
      consent = true
    } = body;

    const now = new Date();
    const timestamp = now.toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

    if (!openaiApiKey) {
      // Minimal deterministic assembly without AI if key missing
      const followText = Array.isArray(followups)
        ? followups.map((f: any) => `- ${f.question}: ${f.answer || 'Not mentioned.'}`).join('\n')
        : 'No follow-up questions recorded.';
      const tags = [
        `#${String(symptomType || 'symptom').toLowerCase().replace(/\s+/g, '-')}`,
        severity ? `#${String(severity).toLowerCase().includes('mild') ? 'mild' : (String(severity).includes('8') ? 'severe' : 'moderate')}` : '',
        status ? `#${status}-symptom` : ''
      ].filter(Boolean).join(', ');
      const summary = `Presenting Complaint:\n“${presentingComplaint || ''}”\n\n---\n\nFollow-Up Summary:\n${followText}\n\n---\nTags:\n${tags}\n\n---\nAttachments:\n${attachments.length ? attachments.join(', ') : 'None'}\n\n---\n✅ Confirmed by User: Yes\n✅ Consent Given: ${consent ? 'Yes' : 'No'}\n🕒 Timestamp: ${timestamp}`;
      return NextResponse.json({ summary });
    }

    const masterPrompt = `Master Prompt for Symptom Summary Generation (Label-Based, Doctor-Usable)\n\nInstruction for AI:\nYou are Sympli, a voice-first medical assistant. The user has completed a symptom log. Generate the Final Log Format below. \n\nRules for Output:\n- Presenting Complaint must be exactly the user’s first description (corrected grammar). \n- Follow-Up Summary must use fixed short clinical labels (1–2 words) that summarise the follow-up questions asked. Always format as Label: Answer. \n- Answers must be:\n  • Transcribed perfectly (correct grammar, clear sentences). \n  • Summarised in a clinically usable way: concise but including all information the patient provided that is valuable to a doctor. \n  • Do not invent or remove information. If the patient rambles, rephrase into clean clinical sentences that still contain all usable details. \n- If no answer is given for a question, write: “Not mentioned.” \n- Only include labels for questions actually asked, in the order they were asked. \n\n---\n\nFinal Log Format (Structured, Chat-Generated)\n\nPresenting Complaint:\n“[User’s initial symptom description, corrected for grammar.]”\n\n---\n\nFollow-Up Summary:\nUse the appropriate 1–2 word labels that match the follow-up questions asked in this log. Examples include:\n- Location:\n- Onset:\n- Character:\n- Radiation:\n- Associated Symptoms:\n- Pattern:\n- Triggers/Relievers:\n- Severity:\n- Functional Impact:\n- Emotional Impact:\n\n(Only include the labels for questions that were asked in this log, in the order they were asked. Each answer should be a perfect transcription, with clean grammar, summarised for clinical clarity but containing all relevant information the patient gave.)\n\n---\nTags:\nGenerate 3–6 short, lowercase, hyphenated tags combining:\n- Symptom type (e.g. #abdominal-pain, #headache, #fatigue) \n- Severity (#mild, #moderate, #severe) \n- Impact (#emotional-impact, #functional-impact if relevant) \n- Relevant system/pattern (#digestive-pattern, #respiratory-pattern, etc.) \n- Symptom status (#new-symptom or #ongoing-symptom) \n\n---\n\nAttachments:\n[List any attachments, else “None”] \n\n---\n\n✅ Confirmed by User: Yes\n✅ Consent Given: Yes\n🕒 Timestamp: [Auto-generate in DD/MM/YYYY, HH:MM BST format] \n\n---\n\nRules for Consistency:\n1. Always use short label format (not the full question). \n2. Always keep the order of follow-up questions as asked. \n3. Always transcribe perfectly and grammar-correct. \n4. Always include all relevant information, phrased concisely but without removing anything useful. \n5. Never invent details.\n\n\nDATA TO USE:\nPresenting complaint: ${presentingComplaint || ''}\nFollow-ups (ordered):\n${Array.isArray(followups) ? followups.map((f: any, i: number) => `${i + 1}. Q: ${f.question}\nA: ${f.answer || 'Not mentioned.'}`).join('\n') : 'None'}\nSymptom type: ${symptomType || ''}\nStatus: ${status || ''}\nSeverity: ${severity ?? ''}\nAttachments: ${attachments?.length ? attachments.join(', ') : 'None'}\n`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return the final log exactly in the requested structure. No extra commentary.' },
          { role: 'user', content: masterPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: `OpenAI error ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const summary: string = data?.choices?.[0]?.message?.content || '';
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('❌ Error in label summary API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




