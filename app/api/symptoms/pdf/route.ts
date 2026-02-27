import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
import { PDFGenerator, PDFContent, PDFTableData } from '../../../lib/pdf-generator';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY;

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

    console.log('📄 Generating GP PDF for user:', user.email);

    const {
      appointmentDate,
      appointmentReason,
      doctorUnderstanding,
      medicationsTried,
      recentTests,
      relevantSymptoms,
      originalLanguage,
      userEdited,
      documentType = 'gp-summary', // New parameter for document type
      anonymisedId,
      confirmed
    } = body;

    // Get user's symptom logs for the report
    const { data: symptomLogs, error: fetchError } = await supabaseService
      .from('symptom_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('❌ Error fetching symptom logs for PDF:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch symptom data for PDF' },
        { status: 500 }
      );
    }

    // Generate PDF content structure
    const pdfContent = await generatePDFContent({
      user,
      appointmentDate,
      appointmentReason,
      doctorUnderstanding,
      medicationsTried,
      recentTests,
      relevantSymptoms,
      symptomLogs: symptomLogs || [],
      originalLanguage,
      userEdited: Boolean(userEdited),
      anonymisedId,
      documentType
    });

    console.log('✅ PDF content structure generated successfully');

    // Generate actual PDF using the PDF generator
    const pdfGenerator = new PDFGenerator();
    const pdfDataUri = pdfGenerator.generatePDF(pdfContent);

    console.log('✅ PDF file generated successfully');

    return NextResponse.json({
      pdfDataUri,
      message: 'PDF generated successfully'
    });

  } catch (error) {
    console.error('❌ Error in PDF generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface PDFData {
  user: any;
  appointmentDate?: string;
  appointmentReason: string;
  doctorUnderstanding: string;
  medicationsTried: string;
  recentTests: string;
  relevantSymptoms: string[];
  symptomLogs: any[];
  originalLanguage?: string;
  userEdited?: boolean;
  anonymisedId?: string;
  confirmed?: boolean;
  documentType?: string;
}

// Deprecated emoji marker removed; use plain text/numbering for reliability

// Generate different document types based on user needs
async function generateDocumentContent(data: any): Promise<PDFContent> {
  const { 
    documentType, 
    user, 
    appointmentDate, 
    appointmentReason, 
    doctorUnderstanding, 
    medicationsTried, 
    recentTests, 
    relevantSymptoms, 
    symptomLogs, 
    originalLanguage, 
    userEdited, 
    anonymisedId, 
    confirmed, 
    formattedDate, 
    apptDisplay, 
    clinicalReason, 
    ice, 
    symptomTableData, 
    insightsBullets, 
    timelineTable, 
    historyTableData 
  } = data;

  switch (documentType) {
    case 'triage-form':
      return generateTriageFormHelper(data);
    case 'gp-summary':
      return generateGPSummaryHelper(data);
    case 'pre-appointment':
      return generatePreAppointmentHelper(data);
    case 'in-appointment':
      return generateInAppointmentHelper(data);
    default:
      return generateGPSummaryHelper(data);
  }
}

// 1. Triage Form Helper - Helps fill out GP appointment booking forms
function generateTriageFormHelper(data: any): PDFContent {
  const { user, appointmentReason, symptomLogs, formattedDate, apptDisplay } = data;
  
  // Extract key symptoms for triage
  const mainSymptoms = symptomLogs.slice(0, 5).map((log: any, index: number) => {
    const severity = log.severity_scale ? ` (Severity: ${log.severity_scale}/10)` : '';
    const duration = log.created_at ? ` - ${new Date(log.created_at).toLocaleDateString('en-GB')}` : '';
    return `${index + 1}. ${log.symptom_name || 'Symptom'}${severity}${duration}`;
  }).join('\n');

  return {
    title: 'GP Appointment Triage Form Helper',
    patientInfo: {
      email: user.email,
      date: formattedDate,
      name: user?.user_metadata?.full_name || undefined,
      appointmentDate: apptDisplay
    },
    confirmed: false,
    sections: [
      {
        title: 'REASON FOR APPOINTMENT',
        content: `Primary concern: ${appointmentReason}\n\nUse this when booking your appointment online or over the phone.`
      },
      {
        title: 'MAIN SYMPTOMS TO MENTION',
        content: mainSymptoms
      },
      {
        title: 'URGENCY INDICATORS',
        content: `• If symptoms are getting worse rapidly, mention this\n• If you have severe pain (8/10 or higher), mention this\n• If symptoms affect your daily activities significantly, mention this\n• If you have any red flag symptoms, mention them immediately`
      },
      {
        title: 'WHAT TO SAY WHEN BOOKING',
        content: `"I need to book an appointment for [REASON]. I've been tracking my symptoms and have [X] main concerns. I'd like to discuss [SPECIFIC CONCERNS] with the doctor."`
      }
    ],
    footer: `TRIAGE FORM HELPER | Generated on ${formattedDate} | Sympli`
  };
}

// 2. GP Summary Helper - Shorter, patient-facing summary
function generateGPSummaryHelper(data: any): PDFContent {
  const { user, appointmentReason, doctorUnderstanding, medicationsTried, recentTests, symptomLogs, formattedDate, apptDisplay, clinicalReason, ice, symptomTableData, insightsBullets, timelineTable, historyTableData, userEdited } = data;
  
  return {
    title: 'GP Appointment Summary',
    patientInfo: {
      email: user.email,
      date: formattedDate,
      name: user?.user_metadata?.full_name || undefined,
      anonymisedId: data.anonymisedId,
      appointmentDate: apptDisplay
    },
    confirmed: Boolean(data.confirmed),
    originalLanguage: data.originalLanguage,
    userEdited: Boolean(userEdited),
    sections: [
      {
        title: `APPOINTMENT OVERVIEW${userEdited ? ' (User-edited)' : ''}`,
        content: [
          `Reason: ${clinicalReason || 'Not provided.'}`,
          `Your main concerns:`,
          `• Ideas: ${ice.ideas}`,
          `• Concerns: ${ice.concerns}`,
          `• Expectations: ${ice.expectations}`
        ].join('\n')
      },
      {
        title: `KEY SYMPTOMS${userEdited ? ' (User-edited)' : ''}`,
        content: symptomTableData
      },
      {
        title: `PATTERN INSIGHTS${userEdited ? ' (User-edited)' : ''}`,
        content: insightsBullets
      },
      {
        title: `SYMPTOM TIMELINE${userEdited ? ' (User-edited)' : ''}`,
        content: timelineTable
      },
      {
        title: `MEDICATIONS & TESTS${userEdited ? ' (User-edited)' : ''}`,
        content: [
          `Medications tried: ${medicationsTried || 'None mentioned'}`,
          `Recent tests: ${recentTests || 'None mentioned'}`
        ].join('\n')
      }
    ],
    footer: `GP SUMMARY | Generated on ${formattedDate} | Sympli`
  };
}

// 3. Pre-Appointment Helper - What to expect and bring
function generatePreAppointmentHelper(data: any): PDFContent {
  const { user, appointmentReason, symptomLogs, formattedDate, apptDisplay } = data;
  
  // Generate AI-powered appointment preparation based on symptoms
  const preparationTips = generateAppointmentPreparation(symptomLogs, appointmentReason);
  
  return {
    title: 'Pre-Appointment Preparation Guide',
    patientInfo: {
      email: user.email,
      date: formattedDate,
      name: user?.user_metadata?.full_name || undefined,
      appointmentDate: apptDisplay
    },
    confirmed: false,
    sections: [
      {
        title: 'WHAT TO BRING',
        content: [
          '• This summary document',
          '• List of current medications',
          '• Any recent test results',
          '• Insurance/ID documents',
          '• List of questions you want to ask'
        ].join('\n')
      },
      {
        title: 'WHAT TO EXPECT',
        content: preparationTips.expectations
      },
      {
        title: 'QUESTIONS THE GP MIGHT ASK',
        content: preparationTips.questions
      },
      {
        title: 'YOUR ADVOCACY POINTS',
        content: preparationTips.advocacy
      },
      {
        title: 'QUESTIONS TO ASK THE GP',
        content: preparationTips.yourQuestions
      }
    ],
    footer: `PRE-APPOINTMENT GUIDE | Generated on ${formattedDate} | Sympli`
  };
}

// 4. In-Appointment Sheet - Questions, answers, and advocacy
function generateInAppointmentHelper(data: any): PDFContent {
  const { user, appointmentReason, symptomLogs, formattedDate, apptDisplay, timelineTable } = data;
  
  return {
    title: 'In-Appointment Reference Sheet',
    patientInfo: {
      email: user.email,
      date: formattedDate,
      name: user?.user_metadata?.full_name || undefined,
      appointmentDate: apptDisplay
    },
    confirmed: false,
    sections: [
      {
        title: 'QUICK SYMPTOM TIMELINE',
        content: timelineTable
      },
      {
        title: 'KEY POINTS TO DISCUSS',
        content: generateKeyDiscussionPoints(symptomLogs, appointmentReason)
      },
      {
        title: 'ADVOCACY CHECKLIST',
        content: [
          '□ Mention all symptoms, even if they seem minor',
          '□ Ask about next steps if diagnosis is unclear',
          '□ Request copies of any test results',
          '□ Ask about when to follow up',
          '□ Clarify any treatment recommendations'
        ].join('\n')
      },
      {
        title: 'NOTES SECTION',
        content: 'Use this space to write down what the doctor says:\n\n\n\n\n\n\n\n'
      }
    ],
    footer: `IN-APPOINTMENT SHEET | Generated on ${formattedDate} | Sympli`
  };
}

// Helper functions for generating appointment preparation content
function generateAppointmentPreparation(symptomLogs: any[], appointmentReason: string): any {
  // This would use AI to generate personalized preparation tips
  // For now, returning a template structure
  return {
    expectations: [
      '• The doctor will ask about your symptoms in detail',
      '• They may examine the affected areas',
      '• They might order tests or prescribe medication',
      '• They will discuss next steps and follow-up'
    ].join('\n'),
    questions: [
      '• When did your symptoms start?',
      '• How severe is the pain/discomfort?',
      '• What makes it better or worse?',
      '• Have you tried any treatments?',
      '• Are you taking any medications?'
    ].join('\n'),
    advocacy: [
      '• Be specific about how symptoms affect your daily life',
      '• Mention any patterns you\'ve noticed',
      '• Don\'t minimize your symptoms',
      '• Ask for clarification if you don\'t understand something'
    ].join('\n'),
    yourQuestions: [
      '• What might be causing my symptoms?',
      '• What tests might be needed?',
      '• What are the treatment options?',
      '• When should I follow up?',
      '• Are there any red flags to watch for?'
    ].join('\n')
  };
}

function generateKeyDiscussionPoints(symptomLogs: any[], appointmentReason: string): string {
  const points = symptomLogs.slice(0, 3).map((log: any, index: number) => {
    return `${index + 1}. ${log.symptom_name || 'Symptom'}: ${log.description || 'No description'} (Severity: ${log.severity_scale || 'Unknown'}/10)`;
  });
  
  return points.join('\n\n');
}

async function generatePDFContent(data: PDFData): Promise<PDFContent> {
  const { user, appointmentDate, appointmentReason, doctorUnderstanding, medicationsTried, recentTests, relevantSymptoms, symptomLogs, originalLanguage, userEdited, anonymisedId, confirmed, documentType = 'gp-summary' } = data;
  
  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

  // LLM-judged selection of relevant logs
  async function selectRelevantLogsViaLLM(logs: any[], reason: string, understanding: string): Promise<any[]> {
    try {
      if (!openaiApiKey || !logs?.length) return logs || [];
      const condensed = logs.map((l: any) => ({
        id: l.id,
        created_at: l.created_at,
        symptom_name: l.symptom_name,
        symptom_type: l.symptom_type,
        severity_scale: l.severity_scale,
        description: l.description,
        functional_impact: l.functional_impact,
        treatment_response: l.treatment_response,
        tags: l.tags || []
      }));
      const messages = [
        { role: 'system', content: 'You are a UK NHS clinical assistant. From the provided symptom log entries and brief context, select only those entries that are most relevant to the current consultation. Return strict JSON: {"ids":["id1","id2",...]} with only IDs. Consider severity, change over time, red flags, functional impact, and proximity to the appointment reason/ICE.' },
        { role: 'user', content: `Reason: ${reason || '—'}` },
        { role: 'user', content: `ICE: ${understanding || '—'}` },
        { role: 'user', content: `Logs: ${JSON.stringify(condensed)}` }
      ];
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 120, messages })
      });
      const json = await resp.json();
      console.log('🧠 PDF: Logs LLM relevance response ->', JSON.stringify(json, null, 2));
      const ids: string[] = (() => { try { return JSON.parse(String(json?.choices?.[0]?.message?.content || '').trim()).ids || []; } catch { return []; } })();
      if (!Array.isArray(ids) || !ids.length) return logs || [];
      const set = new Set(ids.map(String));
      return (logs || []).filter((l: any) => set.has(String(l.id)));
    } catch {
      return logs || [];
    }
  }

  const srcLogs = await selectRelevantLogsViaLLM(symptomLogs || [], appointmentReason, doctorUnderstanding);

  // Group symptoms by normalized name and calculate rollups
  type Group = {
    displayName: string;
    firstLogged: Date;
    mostRecent: Date;
    count: number;
    severities: number[];
    datedSeverities: Array<{ d: Date; s: number }>;
    functionalImpact: string;
  };
  const symptomGroups: Map<string, Group> = new Map();

  // LLM judge for grouping by symptom category using reason and tags (no local canonicalisation)
  async function judgeGroupForLog(log: any, reason: string): Promise<string> {
    try {
      const sd = log?.symptom_data || {};
      // Prioritize symptom_type over symptom_name to get the actual type, not display name
      const actualType = String(log?.symptom_type || sd?.symptom || '').trim();
      const displayName = String(log?.symptom_name || '').trim();
      const customName = String(sd?.customName || '').trim();
      const desc = String(log?.description || sd?.description || '').trim();
      const tags: string[] = Array.isArray(log?.tags) ? log.tags : [];
      
      console.log(`🔍 judgeGroupForLog: actualType="${actualType}", displayName="${displayName}", customName="${customName}"`);
      
      // If we have the actual symptom type, use it directly
      if (actualType && actualType !== 'other') {
        const typeMap: Record<string, string> = {
          'headache': 'Headache',
          'fatigue': 'Fatigue', 
          'side_effect': 'Side Effect',
          'pregnancy': 'Pregnancy Symptom'
        };
        if (typeMap[actualType]) {
          return typeMap[actualType];
        }
      }
      
      // For 'other' type or when type is not available, use the display name or fallback to heuristics
      const name = displayName || actualType;
      
      // If we have a custom name (not "Other Symptom"), use it directly
      if (customName && customName !== 'Other Symptom' && customName !== 'Unknown Symptom') {
        return customName;
      }
      
      // If we have a display name that's not the generic "Other Symptom", use it
      if (displayName && displayName !== 'Other Symptom' && displayName !== 'Unknown Symptom') {
        return displayName;
      }
      // Heuristics from tags first - comprehensive tag matching
      const lowerTags = tags.map(t => String(t || '').toLowerCase());
      const fromTags = (() => {
        const pairs: Array<[RegExp, string]> = [
          // Breathing
          [/breathless|shortness-?of-?breath|sob|dyspn(ea|oe)a/, 'Breathlessness'],
          // Swelling
          [/ankle-?swelling|oedema|edema/, 'Ankle swelling'],
          // Pain categories - comprehensive matching
          [/chest-?pain|angina|chest/, 'Chest pain'],
          [/headache|migraine|head/, 'Headache'],
          [/back-?pain|spine|back/, 'Back pain'],
          [/abdominal-?pain|stomach-?pain|belly-?pain|stomach|belly|abdominal/, 'Abdominal pain'],
          [/knee-?pain|knee/, 'Knee pain'],
          [/hip-?pain|hip/, 'Hip pain'],
          [/shoulder-?pain|shoulder/, 'Shoulder pain'],
          [/neck-?pain|neck/, 'Neck pain'],
          [/leg-?pain|leg/, 'Leg pain'],
          [/arm-?pain|arm/, 'Arm pain'],
          [/joint-?pain|joint/, 'Joint pain'],
          [/muscle-?pain|muscle/, 'Muscle pain'],
          // General symptoms
          [/fatigue|tired|exhaust/, 'Fatigue'],
          [/cough/, 'Cough'],
          [/wheeze/, 'Wheeze'],
          [/palpitations?/, 'Palpitations'],
          [/nausea|vomit/, 'Nausea/vomiting'],
          [/dizziness|dizzy/, 'Dizziness'],
          [/fever|temperature/, 'Fever'],
          [/rash|skin/, 'Rash'],
          [/sore-?throat|throat/, 'Sore throat'],
          [/diarrhoea|diarrhea/, 'Diarrhoea'],
          [/constipation/, 'Constipation'],
          [/weight-?gain|weight/, 'Weight gain'],
          // Additional tag patterns
          [/pain/, 'Pain'],
          [/discomfort/, 'Discomfort'],
          [/ache/, 'Ache'],
          [/swelling/, 'Swelling'],
          [/inflammation/, 'Inflammation'],
          [/stiffness/, 'Stiffness'],
          [/weakness/, 'Weakness'],
          [/numbness/, 'Numbness'],
          [/tingling/, 'Tingling'],
          [/burning/, 'Burning'],
          [/throbbing/, 'Throbbing'],
          [/sharp/, 'Sharp pain'],
          [/dull/, 'Dull pain'],
          [/cramping/, 'Cramping'],
          [/spasm/, 'Spasm'],
          [/tremor/, 'Tremor'],
          [/seizure/, 'Seizure'],
          [/confusion/, 'Confusion'],
          [/memory/, 'Memory issues'],
          [/sleep/, 'Sleep issues'],
          [/appetite/, 'Appetite changes'],
          [/mood/, 'Mood changes'],
          [/anxiety/, 'Anxiety'],
          [/depression/, 'Depression'],
          [/stress/, 'Stress'],
          [/blood/, 'Blood issues'],
          [/bleeding/, 'Bleeding'],
          [/bruising/, 'Bruising'],
          [/infection/, 'Infection'],
          [/allergy/, 'Allergy'],
          [/reaction/, 'Reaction'],
          [/side-?effect/, 'Side effect'],
          [/medication/, 'Medication'],
          [/treatment/, 'Treatment'],
          [/surgery/, 'Surgery'],
          [/injury/, 'Injury'],
          [/trauma/, 'Trauma'],
          [/accident/, 'Accident'],
          [/fall/, 'Fall'],
          [/exercise/, 'Exercise related'],
          [/work/, 'Work related'],
          [/stress/, 'Stress related']
        ];
        
        // First pass: exact matches
        for (let i = 0; i < pairs.length; i++) {
          const [re, label] = pairs[i];
          if (lowerTags.find(t => re.test(t))) return label;
        }
        
        // Second pass: partial matches for pain-related tags
        const painTags = lowerTags.filter(t => /pain|ache|discomfort|sore|tender/.test(t));
        if (painTags.length > 0) {
          // Check if any location tags are present
          const locationTags = lowerTags.filter(t => /knee|hip|shoulder|neck|back|leg|arm|joint|muscle|chest|head|stomach|belly|abdominal/.test(t));
          if (locationTags.length > 0) {
            const location = locationTags[0];
            if (/knee/.test(location)) return 'Knee pain';
            if (/hip/.test(location)) return 'Hip pain';
            if (/shoulder/.test(location)) return 'Shoulder pain';
            if (/neck/.test(location)) return 'Neck pain';
            if (/back|spine/.test(location)) return 'Back pain';
            if (/leg/.test(location)) return 'Leg pain';
            if (/arm/.test(location)) return 'Arm pain';
            if (/joint/.test(location)) return 'Joint pain';
            if (/muscle/.test(location)) return 'Muscle pain';
            if (/chest/.test(location)) return 'Chest pain';
            if (/head/.test(location)) return 'Headache';
            if (/stomach|belly|abdominal/.test(location)) return 'Abdominal pain';
          }
          return 'Pain';
        }
        
        return '';
      })();
      if (fromTags) return fromTags;
      
      // Fallback: check symptom name and description for pain-related keywords
      const combinedText = `${name} ${desc}`.toLowerCase();
      const painHeuristics: Array<[RegExp, string]> = [
        [/knee/, 'Knee pain'],
        [/hip/, 'Hip pain'],
        [/shoulder/, 'Shoulder pain'],
        [/neck/, 'Neck pain'],
        [/back/, 'Back pain'],
        [/leg/, 'Leg pain'],
        [/arm/, 'Arm pain'],
        [/joint/, 'Joint pain'],
        [/muscle/, 'Muscle pain'],
        [/chest/, 'Chest pain'],
        [/headache|migraine/, 'Headache'],
        [/stomach|belly|abdominal/, 'Abdominal pain'],
        [/fatigue|tired|exhaust/, 'Fatigue'],
        [/breathless|shortness/, 'Breathlessness'],
        [/cough/, 'Cough'],
        [/wheeze/, 'Wheeze'],
        [/palpitations/, 'Palpitations'],
        [/nausea|vomit/, 'Nausea/vomiting'],
        [/dizziness|dizzy/, 'Dizziness'],
        [/fever|temperature/, 'Fever'],
        [/rash|skin/, 'Rash'],
        [/sore-?throat|throat/, 'Sore throat'],
        [/diarrhoea|diarrhea/, 'Diarrhoea'],
        [/constipation/, 'Constipation'],
        [/weight-?gain|weight/, 'Weight gain']
      ];
      
      for (const [pattern, group] of painHeuristics) {
        if (pattern.test(combinedText)) return group;
      }
      
      // If no key tag or heuristic match, ask LLM to pick group considering reason, name and tags
      if (!openaiApiKey) {
        const raw = name || desc || 'Symptom';
        const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
        return cap.length > 28 ? cap.slice(0, 28) : cap;
      }
      const messages = [
        { role: 'system', content: 'You are a UK clinical assistant. Given appointment reason and a symptom entry (name, tags, text), output strict JSON {"group":"Breathlessness|Chest pain|Cough|Fever|Fatigue|Headache|Ankle swelling|Weight gain|Nausea/vomiting|Palpitations|Dizziness|Abdominal pain|Diarrhoea|Constipation|Back pain|Sore throat|Rash|Knee pain|Hip pain|Shoulder pain|Neck pain|Leg pain|Arm pain|Joint pain|Muscle pain|Other"}. Choose the most relevant group for THIS appointment. Group similar pain symptoms together (e.g., knee pain, leg pain, joint pain should be grouped appropriately).' },
        { role: 'user', content: `Reason: ${String(reason || '').trim()}` },
        { role: 'user', content: `Name: ${name}` },
        { role: 'user', content: `Tags: ${JSON.stringify(tags)}` },
        { role: 'user', content: `Text: ${desc}` }
      ];
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 40, messages })
      });
      const data = await resp.json();
      const parsed = (() => { try { return JSON.parse(String(data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; } })();
      const group = String(parsed?.group || '').trim();
      if (group) return group;
      const fallback = name || desc || 'Symptom';
      const cap = fallback.charAt(0).toUpperCase() + fallback.slice(1);
      return cap.length > 28 ? cap.slice(0, 28) : cap;
    } catch {
      const sd = log?.symptom_data || {};
      const raw = String(log?.symptom_name || sd?.symptom || 'Symptom').trim();
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }

  if (srcLogs && srcLogs.length > 0) {
    console.log(`Processing ${srcLogs.length} symptom logs for frequency analysis`);
    for (let i = 0; i < srcLogs.length; i++) {
      const log = srcLogs[i];
      const symptomData = log.symptom_data || {};
      const groupName = await judgeGroupForLog(log, String(appointmentReason || ''));
      const key = String(groupName || 'Symptom').toLowerCase();
      const symptomName = groupName;
      const sevNum = (() => {
        const a = Number(log.severity_scale);
        if (!isNaN(a) && a > 0) return a;
        const b = Number(symptomData?.socrates?.severity);
        return !isNaN(b) && b > 0 ? b : 0;
      })();
      const date = new Date(log.created_at);
      
      console.log(`Log ${i + 1}: symptom_type="${log.symptom_type}", symptom_name="${log.symptom_name}", customName="${log.symptom_data?.customName || 'none'}" -> Group: "${groupName}" (key: "${key}")`);
      
      if (!symptomGroups.has(key)) {
        symptomGroups.set(key, {
          displayName: symptomName,
          firstLogged: date,
          mostRecent: date,
          count: 1,
          severities: sevNum ? [sevNum] : [],
          datedSeverities: sevNum ? [{ d: date, s: sevNum }] : [],
          functionalImpact: (() => {
            const fi = String(log.functional_impact || symptomData?.report?.functionalImpact || '').trim();
            return fi || 'None';
          })()
        });
        console.log(`  Created new group "${key}" with count 1`);
      } else {
        const group = symptomGroups.get(key)!;
        if (symptomName.length > group.displayName.length) group.displayName = symptomName;
        group.count++;
        if (sevNum) group.severities.push(sevNum);
        if (sevNum) group.datedSeverities.push({ d: date, s: sevNum });
        if (date < group.firstLogged) group.firstLogged = date;
        if (date > group.mostRecent) group.mostRecent = date;
        const fi = String(log.functional_impact || symptomData?.report?.functionalImpact || '').trim();
        if (fi) group.functionalImpact = fi;
        console.log(`  Updated group "${key}" - count now ${group.count}`);
      }
    }
    console.log(`Final symptom groups:`, Array.from(symptomGroups.entries()).map(([k, v]) => `${k}: ${v.count} mentions`));
  }

  // Calculate summary statistics
  const totalSymptoms = srcLogs.length;
  const uniqueSymptoms = symptomGroups.size;
  const avgSeverity = (() => {
    const all = Array.from(symptomGroups.values()).flatMap(g => g.severities);
    if (!all.length) return 0;
    return all.reduce((a, b) => a + b, 0) / all.length;
  })();

  // Create Symptom Frequency Overview (GP-Ready) – only relevant symptoms
  const symptomTableData: PDFTableData = {
    headers: ['Symptom', 'First', 'Recent', 'Mentions', 'Trend', 'Impact'],
    rows: []
  };

  async function judgeRelevantSymptoms(reason: string, ice: string, groups: Map<string, any>): Promise<Set<string>> {
    try {
      const names = Array.from(groups.values()).map((g: any) => g.displayName);
      // Fallback heuristic: token overlap
      const fallback = () => {
        const r = (reason || '').toLowerCase();
        const i = (ice || '').toLowerCase();
        const tokens = new Set((r + ' ' + i).split(/[^a-z0-9]+/).filter(Boolean));
        const set = new Set<string>();
        names.forEach(n => {
          const parts = n.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
          if (!tokens.size || parts.some(p => tokens.has(p))) set.add(n);
        });
        if (set.size === 0) {
          // choose top 3 by recency
          Array.from(groups.values())
            .sort((a: any, b: any) => b.mostRecent.getTime() - a.mostRecent.getTime())
            .slice(0, 3)
            .forEach((g: any) => set.add(g.displayName));
        }
        return set;
      };
      if (!openaiApiKey) return fallback();
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 60,
          messages: [
            { role: 'system', content: 'You are a UK NHS clinical assistant. From a list of symptom names and a reason for appointment plus ICE (Ideas, Concerns, Expectations), select only symptoms directly relevant to this consultation. Output strict JSON: {"relevant":["name1","name2"]}. No commentary.' },
            { role: 'user', content: `Reason: ${reason || '—'}` },
            { role: 'user', content: `ICE: ${ice || '—'}` },
            { role: 'user', content: `Symptoms: ${JSON.stringify(names)}` }
          ]
        })
      });
      const data = await res.json();
      const parsed = (() => { try { return JSON.parse((data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; } })();
      const arr: string[] = Array.isArray(parsed?.relevant) ? parsed.relevant : [];
      if (!arr.length) return fallback();
      return new Set(arr);
    } catch {
      return new Set(Array.from(groups.values()).map((g: any) => g.displayName));
    }
  }

  const relevantSet = await judgeRelevantSymptoms(appointmentReason, String(doctorUnderstanding || ''), symptomGroups);
  console.log(`Relevance filtering: ${relevantSet.size} relevant symptoms out of ${symptomGroups.size} total groups`);

  const freqRows: string[][] = [];
  symptomGroups.forEach((data, _key) => {
    if (relevantSet.size && !relevantSet.has(data.displayName)) {
      console.log(`Filtered out "${data.displayName}" (not relevant)`);
      return;
    }
    const symptomName = data.displayName;
    const firstDate = data.firstLogged.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const lastDate = data.mostRecent.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    // Calculate trend
    let trend = '—';
    if (data.severities.length) {
      const sorted = data.datedSeverities.slice().sort((a, b) => a.d.getTime() - b.d.getTime());
      const nums = sorted.map(x => x.s);
      const last3 = nums.slice(-3);
      const prev3 = nums.slice(-6, -3);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const delta = avg(last3) - avg(prev3);
      trend = delta > 0.5 ? 'Worsening' : delta < -0.5 ? 'Improving' : 'Stable';
    }
    if (data.count === 1) {
      trend = 'New onset';
    }
    
    // Truncate functional impact if too long
    const fi = (data.functionalImpact || '').trim();
    const functionalImpact = fi
      ? (fi.length > 80 ? fi.substring(0, 80) + '…' : fi)
      : 'None';
    
    freqRows.push([
      symptomName,
      firstDate,
      lastDate,
      data.count.toString(),
      trend,
      functionalImpact
    ]);
  });
  
  // Sort by recency, then by count, then cap to 8 rows for brevity
  freqRows.sort((a, b) => {
    // Parse dates in format "DD MMM" (e.g., "22 Aug")
    const parseDate = (dateStr: string) => {
      const [day, month] = dateStr.split(' ');
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, monthMap[month] || 0, parseInt(day) || 1);
    };
    
    const aDate = parseDate(a[2]); // Recent date
    const bDate = parseDate(b[2]);
    if (bDate.getTime() !== aDate.getTime()) {
      return bDate.getTime() - aDate.getTime();
    }
    const aCount = parseInt(a[3]);
    const bCount = parseInt(b[3]);
    return bCount - aCount;
  });
  
  symptomTableData.rows = freqRows.slice(0, 8);

  // Create patient history table (relevance-filtered per spec)
  const userProfile = await getUserProfile(user.id);
  const onboardingData = await getOnboardingData(user.id);

  // Compute clinical reason and ICE (patient's aim) early to drive relevance
  const clinicalReason = await composeReason(appointmentReason);
  const clinicalUnderstanding = String(doctorUnderstanding || '');
  const ice = await composeICE(doctorUnderstanding);

  const defaultTexts = {
    pmh: 'No relevant history provided',
    meds: 'No relevant history provided',
    allergies: 'No known allergies reported',
    family: 'No relevant family history provided',
    investigations: 'No recent investigations provided',
    social: 'No relevant social history provided',
  } as const;

  const toList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((x) => String(x || '').trim()).filter(Boolean);
    const s = String(val || '').trim();
    if (!s) return [];
    return s
      .split(/\n|;|,|\u2022|\||\t/) // split on common separators/bullets
      .map((x) => x.replace(/^[-•\s]+/, '').trim())
      .filter(Boolean);
  };
  const dedup = (arr: string[]) => Array.from(new Set(arr.map((x) => x.trim().toLowerCase()))).map((x) => x.replace(/\s+/g, ' ').trim());
  const cap = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + '…' : s);
  const tok = (s: string) => new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const hasOverlap = (text: string, refTokens: Set<string>) => {
    const t = tok(text);
    let hit = false;
    t.forEach((x) => { if (refTokens.has(x)) hit = true; });
    return hit;
  };

  const reasonTokens = tok(clinicalReason);
  const iceTokens = tok(clinicalUnderstanding);
  const refTokens = new Set<string>();
  reasonTokens.forEach((x) => refTokens.add(x));
  iceTokens.forEach((x) => refTokens.add(x));

  const pmhList = dedup([
    ...toList(onboardingData?.medicalInformation?.chronicConditions),
    ...toList((userProfile as any)?.pastMedicalHistory),
    ...toList((onboardingData as any)?.medicalHistory),
  ]);
  const medsList = dedup([
    ...toList(onboardingData?.medicalInformation?.currentMedications),
    ...toList(medicationsTried),
  ]);
  const allergiesList = dedup([
    ...toList(onboardingData?.medicalInformation?.allergiesAndReactions),
    ...toList((userProfile as any)?.allergies),
    ...toList((onboardingData as any)?.allergies),
  ]);
  const familyList = dedup([
    ...toList((userProfile as any)?.familyHistory),
    ...toList((onboardingData as any)?.familyHistory),
  ]);
  const investigationsList = dedup(toList(recentTests));
  const socialList = dedup([
    ...toList((userProfile as any)?.socialHistory),
    ...toList((onboardingData as any)?.socialHistory),
  ]);

  const filterRelevant = (items: string[]): string[] => items.filter((x) => hasOverlap(x, refTokens));

  // Default heuristic outputs
  let qhPMH = (() => {
    const rel = filterRelevant(pmhList);
    return rel.length ? cap(rel.join(', '), 120) : defaultTexts.pmh;
  })();
  let qhMeds = (() => {
    const rel = filterRelevant(medsList);
    return rel.length ? cap(rel.join(', '), 120) : defaultTexts.meds;
  })();
  let qhAllergies = (() => {
    return allergiesList.length ? cap(allergiesList.join(', '), 120) : defaultTexts.allergies;
  })();
  let qhFamily = (() => {
    const rel = filterRelevant(familyList);
    return rel.length ? cap(rel.join(', '), 120) : defaultTexts.family;
  })();
  let qhInv = (() => {
    const rel = filterRelevant(investigationsList);
    return rel.length ? cap(rel.join(', '), 120) : defaultTexts.investigations;
  })();
  let qhSocial = (() => {
    const rel = filterRelevant(socialList);
    return rel.length ? cap(rel.join(', '), 120) : defaultTexts.social;
  })();

  // If LLM available, ask it to produce concise UK clinical one-liners per field with relevance filter
  if (openaiApiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 220,
          messages: [
            { role: 'system', content: 'You are a UK NHS GP summariser. Create a concise, clinically written Quick History table (6 lines) relevant to the appointment. Use UK clinical terminology, max one line per field, no fluff. If no relevant content for a field, use the provided default text. Output STRICT JSON with keys: pmh, meds, allergies, family, investigations, social.' },
            { role: 'user', content: `Reason: ${clinicalReason || '—'}` },
            { role: 'user', content: `ICE (what patient wants understood): ${clinicalUnderstanding || '—'}` },
            { role: 'user', content: `PMH options: ${JSON.stringify(pmhList)}` },
            { role: 'user', content: `Medications options: ${JSON.stringify(medsList)}` },
            { role: 'user', content: `Allergies: ${JSON.stringify(allergiesList)}` },
            { role: 'user', content: `Family history options: ${JSON.stringify(familyList)}` },
            { role: 'user', content: `Recent investigations options: ${JSON.stringify(investigationsList)}` },
            { role: 'user', content: `Social history options: ${JSON.stringify(socialList)}` },
            { role: 'user', content: `Defaults: ${JSON.stringify(defaultTexts)}` }
          ]
        })
      });
      const data = await res.json();
      const parsed = (() => { try { return JSON.parse((data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; } })();
      if (parsed && typeof parsed === 'object') {
        qhPMH = String(parsed.pmh || qhPMH);
        qhMeds = String(parsed.meds || qhMeds);
        qhAllergies = String(parsed.allergies || qhAllergies);
        qhFamily = String(parsed.family || qhFamily);
        qhInv = String(parsed.investigations || qhInv);
        qhSocial = String(parsed.social || qhSocial);
      }
    } catch {}
  }

  const historyTableData: PDFTableData = {
    headers: ['Field', 'Value'],
    rows: [
      ['Past Medical History', qhPMH || defaultTexts.pmh],
      ['Medications', qhMeds || defaultTexts.meds],
      ['Allergies', (toList(onboardingData?.medicalInformation?.allergiesAndReactions).join(', ') || qhAllergies || defaultTexts.allergies)],
      ['Family History', (toList((onboardingData as any)?.familyHistory).join(', ') || qhFamily || defaultTexts.family)],
      ['Recent Investigations', qhInv || defaultTexts.investigations],
      ['Social History', qhSocial || defaultTexts.social]
    ]
  };

  // Compose SYMPLI INSIGHT (GP-Ready Summary) – EXACTLY 5 bullets with categories
  async function composeSympliInsightsBullets(): Promise<string> {
    // Data-only insights (no interpretation)
    const groups = Array.from(symptomGroups.values());
    const totalLogsCount = (srcLogs || []).length;
    const mostFrequent = (() => {
      if (!groups.length) return 'None';
      const top = groups.slice().sort((a, b) => b.count - a.count)[0];
      const first = top.firstLogged.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const recent = top.mostRecent.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return `${top.displayName}: ${top.count} entr${top.count === 1 ? 'y' : 'ies'} (first ${first}, recent ${recent})`;
    })();
    const severityLine = (() => {
      if (!groups.length) return 'None recorded';
      const top = groups.slice().sort((a, b) => b.count - a.count)[0];
      if (!top.severities.length) return 'None recorded';
      const range = `${Math.min(...top.severities)}–${Math.max(...top.severities)}/10`;
      const last = top.datedSeverities.slice(-1)[0]?.s;
      return `${range}; most recent ${typeof last === 'number' ? `${last}/10` : '—'}`;
    })();
    const impactLine = (() => {
      if (!groups.length) return 'None recorded';
      const top = groups.slice().sort((a, b) => b.count - a.count)[0];
      const txt = String(top.functionalImpact || '').trim();
      return txt ? (txt.length > 120 ? txt.slice(0, 119) + '…' : txt) : 'None recorded';
    })();
    const redFlags = (() => {
      const rf = new Set<string>();
      (srcLogs || []).forEach((l: any) => {
        const desc = String(l.symptom_data?.description || l.description || '').toLowerCase();
        const s = parseInt(String(l.symptom_data?.socrates?.severity || l.severity_scale || '0')) || 0;
        if (s >= 8) rf.add('high severity');
        if (/(syncope|faint|collapse)/.test(desc)) rf.add('syncope');
        if (/(chest pain|central chest pain)/.test(desc)) rf.add('chest pain');
        if (/(breathless|nocturnal breathlessness|orthopnoea)/.test(desc)) rf.add('nocturnal breathlessness');
        if (/(haematemesis|melaena|neurological deficit)/.test(desc)) rf.add('alarm features');
      });
      return rf.size ? Array.from(rf).join(', ') : 'None recorded';
    })();
    // Optional LLM overview for a one-line trend summary, no diagnosis
    let overview = '';
    if (openaiApiKey && groups.length) {
      try {
        const text = groups.map(g => `${g.displayName} | count=${g.count} | severities=${g.severities.join(',')} | first=${g.firstLogged.toISOString()} | recent=${g.mostRecent.toISOString()} | impact=${(g.functionalImpact||'')}`).join('\n');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 80,
            messages: [
              { role: 'system', content: 'You are a UK NHS GP assistant. Write ONE concise, neutral sentence describing trend and co-mentions across symptoms. No diagnosis, no advice. Mention duration if obvious and any commonly co-mentioned features. UK English.' },
              { role: 'user', content: text }
            ]
          })
        });
        const data = await res.json();
        overview = String(data?.choices?.[0]?.message?.content || '').trim();
      } catch {}
    }
    const bullets = [
      `• Most frequent: ${mostFrequent}`,
      `• Severity: ${severityLine}`,
      `• Functional impact: ${impactLine}`,
      `• Red flags: ${redFlags}`,
      `• Counts: Total logs ${totalLogsCount}; Unique symptoms ${symptomGroups.size}`,
    ];
    if (overview) bullets.unshift(`• Overview: ${overview}`);
    return bullets.join('\n');
  }
  const insightsBullets = await composeSympliInsightsBullets();

  // Build Final Log Summary removed per request; helper retained for other sections
  function toSentence(text?: string) {
    const t = String(text || '').trim();
    if (!t) return '';
    const capped = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?]$/.test(capped) ? capped : capped + '.';
  }
  function slugTag(t: string) {
    return '#' + String(t || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function formatBST(dateIso?: string) {
    try {
      const d = dateIso ? new Date(dateIso) : new Date();
      const dd = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const tt = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `${dd} ${tt} BST`;
    } catch { return ''; }
  }
  // Final Log Summary removed

  // Compose patient ICE (Ideas, Concerns, Expectations) from user's free-text
  async function composeICE(rawICE?: string): Promise<{ ideas: string; concerns: string; expectations: string; }> {
    const defaults = { ideas: 'Not provided.', concerns: 'Not provided.', expectations: 'Not provided.' };
    const text = String(rawICE || '').trim();
    if (!text) return defaults;
    const heuristic = () => {
      const t = text.replace(/\s+/g, ' ').trim();
      const lower = t.toLowerCase();
      const pick = (patterns: RegExp[]) => {
        for (let i = 0; i < patterns.length; i++) {
          const p = patterns[i];
          const m = lower.match(p);
          if (m) {
            const idx = m.index || 0;
            const slice = t.slice(idx).replace(/^.*?:\s*/, '').split(/(?=\bideas\b|\bconcerns\b|\bexpectations\b|\bworried\b|\bthink\b|\bexpect\b|\bhope\b)/i)[0];
            return slice.trim();
          }
        }
        return '';
      };
      const ideas = pick([/\b(i think|i believe|ideas|cause|due to)\b/]);
      const concerns = pick([/\b(concern|worried|anxious|fear|risk)\b/]);
      const expectations = pick([/\b(expect|hope|want|would like|goal)\b/]);
      let result = {
        ideas: ideas || '',
        concerns: concerns || '',
        expectations: expectations || '',
      } as { ideas: string; concerns: string; expectations: string };

      // Fallbacks if user provided something but we didn't match patterns
      const nonEmpty = t.length > 0;
      const durationConcern = /(been going|long time|for a while|keeps happening|recurr|persistent|ongoing)/i.test(t);
      if (!result.concerns && nonEmpty && durationConcern) {
        result.concerns = 'Prolonged symptoms';
      }
      if (!result.expectations && nonEmpty) {
        result.expectations = 'Wants clarity on cause and next steps';
      }
      // Fill remaining with defaults
      if (!result.ideas) result.ideas = defaults.ideas;
      if (!result.concerns) result.concerns = defaults.concerns;
      if (!result.expectations) result.expectations = defaults.expectations;
      return result;
    };
    if (!openaiApiKey) return heuristic();
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 120,
          messages: [
            { role: 'system', content: 'You are a UK NHS GP summariser. Extract the patient\'s ICE (Ideas, Concerns, Expectations) from their text. Use UK clinical language, one concise clause per field. If absent, use defaults provided. Output STRICT JSON: {"i":"...","c":"...","e":"..."}.' },
            { role: 'user', content: `Patient free-text: ${text}` },
            { role: 'user', content: 'Defaults: {"i":"Not provided.","c":"Not provided.","e":"Not provided."}' }
          ]
        })
      });
      const data = await res.json();
      const parsed = (() => { try { return JSON.parse((data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; } })();
      if (parsed && typeof parsed === 'object') {
        const i = String(parsed.i || '');
        const c = String(parsed.c || '');
        const e = String(parsed.e || '');
        // If LLM yielded empty-like outputs, apply heuristic fallbacks
        const allMissing = (!i || /not provided\.?$/i.test(i)) && (!c || /not provided\.?$/i.test(c)) && (!e || /not provided\.?$/i.test(e));
        if (allMissing) return heuristic();
        return {
          ideas: i || 'Not provided.',
          concerns: c || 'Not provided.',
          expectations: e || 'Not provided.',
        };
      }
      return heuristic();
    } catch {
      return heuristic();
    }
  }

  // Analyze for red flags and trends
  const hasWorseningTrends = Array.from(symptomGroups.values()).some(data => {
    const nums = data.severities;
    if (nums.length >= 2) {
      const first = nums[0] || 0;
      const last = nums[nums.length - 1] || 0;
      return last > first + 2;
    }
    return false;
  });
  
  const hasHighSeverity = Array.from(symptomGroups.values()).some(data => {
    return data.severities.some(s => s >= 8);
  });
  
  const totalLogs = symptomLogs.length;

  // Clinical recommendations removed as requested

  // Build Symptom Timeline (Decision-Ready Table) – per log, filtered and condensed
  const formatStamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    } catch { return iso; }
  };
  const relTokens = new Set((String(appointmentReason || '') + ' ' + String(doctorUnderstanding || '')).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const isRelevantLog = (l: any) => {
    if (!relTokens.size) return true;
    const hay = [l.symptom_name, l.symptom_data?.symptom, l.description, l.functional_impact, l.treatment_response]
      .filter(Boolean).join(' ').toLowerCase();
    const tags = Array.isArray(l.tags) ? l.tags.map((t: any) => String(t || '').toLowerCase()) : [];
    return hay.split(/[^a-z0-9]+/).some((w: string) => relTokens.has(w)) || tags.some((t: string) => relTokens.has(t));
  };
  const redFlagsOf = (l: any): string[] => {
    const out: string[] = [];
    try {
      const desc = String(l.symptom_data?.description || l.description || '').toLowerCase();
      const s = parseInt(String(l.symptom_data?.socrates?.severity || l.severity_scale || '0')) || 0;
      if (s >= 8) out.push('High severity');
      if (/(nocturnal breathless|orthopnoea|wakes.*breathless)/.test(desc)) out.push('Nocturnal breathlessness');
      if (/(syncope|faint|collapse)/.test(desc)) out.push('Syncope');
      if (/(chest pain|central chest pain)/.test(desc)) out.push('Chest pain');
      if (/(peak flow\s*<\s*50|low peak flow)/.test(desc)) out.push('Low peak flow');
      if (/(haematemesis|melaena)/.test(desc)) out.push('GI bleed');
    } catch {}
    return Array.from(new Set(out));
  };
  const severityDisplay = (l: any) => {
    const n = parseInt(String(l.symptom_data?.socrates?.severity || l.severity_scale || '0')) || 0;
    return n > 0 ? `${n}/10` : '—';
  };
  const oneLineInsight = (l: any): string => {
    const name = String(l.symptom_name || l.symptom_data?.symptom || '').trim();
    // Use processed transcript if available, otherwise fall back to description
    const desc = String(
      l.symptom_data?.processedTranscript || 
      l.additional_context?.processed_transcript || 
      l.symptom_data?.description || 
      l.description || ''
    ).replace(/["""]/g, '').replace(/\s+/g, ' ').trim();
    const assoc = String(l.associated_symptoms || l.symptom_data?.socrates?.associations || '').replace(/["""]/g, '').replace(/\s+/g, ' ').trim();
    const parts: string[] = [];
    if (name) parts.push(name);
    if (desc) parts.push(desc.length > 100 ? desc.slice(0, 99) + '…' : desc);
    if (assoc) parts.push(`assoc: ${assoc.length > 50 ? assoc.slice(0, 49) + '…' : assoc}`);
    const out = parts.join(' ');
    return out ? (/[.!?]$/.test(out) ? out : out + '.') : '—';
  };
  const bySymptom = new Map<string, any[]>();
  (srcLogs || []).slice().sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).forEach((l: any) => {
    const key = String(l.symptom_name || l.symptom_data?.symptom || '').toLowerCase();
    if (!bySymptom.has(key)) bySymptom.set(key, []);
    bySymptom.get(key)!.push(l);
  });
  const findPrev = (l: any): any | null => {
    const key = String(l.symptom_name || l.symptom_data?.symptom || '').toLowerCase();
    const arr = bySymptom.get(key) || [];
    const t = new Date(l.created_at).getTime();
    let prev: any | null = null;
    for (let i = 0; i < arr.length; i++) { const x = arr[i]; const tx = new Date(x.created_at).getTime(); if (tx < t) prev = x; else if (tx >= t) break; }
    return prev;
  };
  const included: any[] = [];
  const earliestBySymptom = new Map<string, any>();
  const latestRelevant: any[] = [];
  const logsChrono = (srcLogs || []).slice().sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  for (let i = 0; i < logsChrono.length; i++) { const l = logsChrono[i];
    if (!isRelevantLog(l)) continue;
    const prev = findPrev(l);
    const rf = redFlagsOf(l);
    const sev = parseInt(String(l.symptom_data?.socrates?.severity || l.severity_scale || '0')) || 0;
    const funcFail = /work|stairs|housework|sleep|pillow|commute|drive|carry/i.test(String(l.functional_impact || ''));
    const stepChange = prev ? (Math.abs(sev - (parseInt(String(prev.symptom_data?.socrates?.severity || prev.severity_scale || '0')) || 0)) >= 2) : false;
    const newSignificant = !prev;
    const treatmentData = Boolean(String(l.treatment_response || '').trim());
    const objective = /(bp|blood pressure|mmhg|glucose|hba1c|fever|temperature|weight)/i.test(String(l.description || l.symptom_data?.description || ''));
    const keep = rf.length > 0 || stepChange || newSignificant || funcFail || treatmentData || objective;
    if (keep) included.push(l);
    const sKey = String(l.symptom_name || l.symptom_data?.symptom || '').toLowerCase();
    if (!earliestBySymptom.has(sKey)) earliestBySymptom.set(sKey, l);
  }
  earliestBySymptom.forEach((val) => { included.push(val); });
  if (logsChrono.length) {
    const last = logsChrono[logsChrono.length - 1];
    if (isRelevantLog(last)) latestRelevant.push(last);
  }
  included.push(...latestRelevant);
  const uniq = new Map<string, any>();
  for (let i = 0; i < included.length; i++) { const l = included[i]; uniq.set(String(l.id), l); }
  const perDay = new Map<string, any[]>();
  Array.from(uniq.values()).forEach(l => {
    const day = String(l.created_at).split('T')[0];
    if (!perDay.has(day)) perDay.set(day, []);
    perDay.get(day)!.push(l);
  });
  const decisionRows: any[] = [];
  perDay.forEach((arr, day) => {
    const scored = arr.slice().sort((a, b) => {
      const score = (x: any) => {
        const rf = redFlagsOf(x).length ? 3 : 0;
        const sev = parseInt(String(x.symptom_data?.socrates?.severity || x.severity_scale || '0')) || 0;
        const func = /work|stairs|sleep|house/.test(String(x.functional_impact || '')) ? 1 : 0;
        const tr = String(x.treatment_response || '').trim() ? 1 : 0;
        return rf + (sev >= 8 ? 2 : sev >= 5 ? 1 : 0) + func + tr;
      };
      return score(b) - score(a);
    });
    const picked: any[] = [];
    for (let i = 0; i < scored.length; i++) { const l = scored[i];
      const insight = oneLineInsight(l);
      if (!picked.find(p => oneLineInsight(p) === insight)) picked.push(l);
      if (picked.length >= 2) break;
    }
    decisionRows.push(...picked);
  });
  decisionRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const capped = decisionRows.length > 12 ? [...decisionRows.slice(0, 11), decisionRows[decisionRows.length - 1]] : decisionRows;
  const timelineTable: PDFTableData = {
    headers: ['Date & Time', 'Symptoms Mentioned', 'Sympli Insight (1 Sentence)', 'Functional Impact', 'Severity', 'Red Flags'],
    rows: capped.map(l => {
      const symptoms = (() => {
        const main = String(l.symptom_name || l.symptom_data?.symptom || '').trim();
        const assoc = String(l.associated_symptoms || l.symptom_data?.socrates?.associations || '').trim();
        return [main, assoc].filter(Boolean).join(', ');
      })();
      const rf = redFlagsOf(l);
      return [
        formatStamp(l.created_at),
        symptoms || '—',
        oneLineInsight(l),
        String(l.functional_impact || l.symptom_data?.report?.functionalImpact || '—'),
        severityDisplay(l),
        rf.length ? rf.join(', ') : '—',
      ];
    })
  };

  // Build Symptom Summaries table (recent unique logs by symptom)
  const recentSorted = (srcLogs || [])
    .slice()
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const seenBySymptom = new Set<string>();
  const recentUnique = recentSorted.filter((log: any) => {
    const name = String(log.symptom_name || log.symptom_data?.symptom || '—');
    if (seenBySymptom.has(name)) return false;
    seenBySymptom.add(name);
    return true;
  }).slice(0, 10);

  // Remove separate symptom summaries section per request (handled by frequency + timeline)

  // Parse appointment date/time for display
  let apptDisplay = appointmentDate || '';
  try {
    if (appointmentDate) {
      const parsed = new Date(appointmentDate);
      if (!isNaN(parsed.getTime())) {
        apptDisplay = parsed.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
    }
  } catch {}

  // Create PDF content structure
  const rephraseClinically = async (text: string): Promise<string> => {
    const t = String(text || '').trim();
    if (!t) return '';
    try {
      if (!openaiApiKey) return t.charAt(0).toUpperCase() + t.slice(1);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a UK NHS clinical summariser. Rewrite the patient\'s sentence as a concise clinical phrasing suitable for a GP letter. Use clinical terms where appropriate. Do NOT include verbatim quotations. If a term is unclear, append (user phrase: <term>) without quotes. Replace empty or negative responses (no/none/nil) with "No impact indicated" when applicable. Output one sentence only.' },
            { role: 'user', content: t }
          ],
          temperature: 0.4,
          max_tokens: 120
        })
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content as string | undefined;
      if (!content) return t.charAt(0).toUpperCase() + t.slice(1);
      return content.trim();
    } catch {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
  };

  async function composeReason(userReason?: string) {
    try {
      // Build a compact JSON summary of the last 5 logs to inform the reason
      const recent = (symptomLogs || []).slice(0, 5).map((l: any) => ({
        when: l.created_at,
        name: String(l.symptom_name || l.symptom_data?.symptom || ''),
        severity: Number(l.severity_scale || l?.symptom_data?.socrates?.severity || 0) || 0,
        impact: String(l.functional_impact || l?.symptom_data?.report?.functionalImpact || '').trim(),
        character: String(l?.symptom_data?.socrates?.character || '').trim(),
      }));
      const fallback = (() => {
        const top = recent[0];
        if (!top) return (userReason || '').trim();
        const sev = top.severity ? ` (severity ${top.severity}/10)` : '';
        return `${top.name}${sev}`.trim();
      })();
      if (!openaiApiKey) return fallback || '';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 80,
          messages: [
            { role: 'system', content: 'You are a UK NHS clinical summariser. Determine the reason for a GP appointment using recent structured logs as primary evidence; treat free-text as supporting. Return ONE short sentence (<=18 words), no preface.' },
            { role: 'user', content: `Free‑text reason (optional): ${String(userReason || '').trim() || '—'}` },
            { role: 'user', content: `Recent logs (most recent first): ${JSON.stringify(recent)}` }
          ]
        })
      });
      const data = await res.json();
      const s = String(data?.choices?.[0]?.message?.content || '').trim();
      return s || fallback || '';
    } catch {
      return (userReason || '').trim();
    }
  }

  // Generate content based on document type
  const pdfContent = await generateDocumentContent({
    documentType,
    user,
    appointmentDate,
    appointmentReason,
    doctorUnderstanding,
    medicationsTried,
    recentTests,
    relevantSymptoms,
    symptomLogs,
    originalLanguage,
    userEdited,
    anonymisedId,
    confirmed,
    formattedDate,
    apptDisplay,
    clinicalReason,
    ice,
    symptomTableData,
    insightsBullets,
    timelineTable,
    historyTableData
  });

  // Return the PDFContent object for PDF generation
  return pdfContent;
}

// Helper function to generate SIMPLI INSIGHT bullet points
function generateSimpliInsights(symptomLogs: any[], symptomGroups: Map<string, any>): string[] {
  const insights: string[] = [];
  
  // Analyze trends
  symptomGroups.forEach((data, symptomName) => {
    const severityLevels = data.severities.filter((s: string) => s !== 'Unknown' && !isNaN(parseInt(s)));
    if (severityLevels.length >= 2) {
      const firstSeverity = parseInt(severityLevels[0]) || 5;
      const lastSeverity = parseInt(severityLevels[severityLevels.length - 1]) || 5;
      const daysBetween = Math.ceil((data.mostRecent.getTime() - data.firstLogged.getTime()) / (1000 * 60 * 60 * 24));
      
      if (lastSeverity > firstSeverity + 2) {
        insights.push(`${symptomName} has worsened progressively over the last ${daysBetween} days and now affects daily activities.`);
      } else if (lastSeverity < firstSeverity - 2) {
        insights.push(`${symptomName} has improved over the last ${daysBetween} days with reduced severity.`);
      }
    }
  });
  
  // Analyze duration
  symptomGroups.forEach((data, symptomName) => {
    const daysBetween = Math.ceil((data.mostRecent.getTime() - data.firstLogged.getTime()) / (1000 * 60 * 60 * 24));
    if (daysBetween >= 21) { // 3+ weeks
      insights.push(`${symptomName} ongoing for ${daysBetween} days with minimal improvement.`);
    }
  });
  
  // Analyze functional impact
  const highImpactSymptoms = Array.from(symptomGroups.entries()).filter(([name, data]) => {
    const impact = data.functionalImpact.toLowerCase();
    return impact.includes('work') || impact.includes('daily') || impact.includes('unable') || impact.includes('affect');
  });
  
  if (highImpactSymptoms.length > 0) {
    insights.push(`Symptoms affecting ability to complete full workdays and routine activities.`);
  }
  
  // Analyze red flags
  const redFlags = symptomLogs.filter(log => {
    const symptomData = log.symptom_data || {};
    const socratesData = symptomData.socrates || {};
    const description = (symptomData.description || '').toLowerCase();
    const severity = parseInt(socratesData.severity) || 0;
    
    return severity >= 8 || 
           description.includes('syncope') || 
           description.includes('breathless') || 
           description.includes('chest pain') ||
           description.includes('severe');
  });
  
  if (redFlags.length > 0) {
    insights.push(`Red flags include high-severity symptoms requiring immediate medical attention.`);
  }
  
  // Analyze emotional impact
  const emotionalLogs = symptomLogs.filter(log => {
    const description = (log.symptom_data?.description || '').toLowerCase();
    return description.includes('anxious') || description.includes('tearful') || description.includes('frustrated') || description.includes('depressed');
  });
  
  if (emotionalLogs.length >= 2) {
    insights.push(`Logs consistently show low mood, frustration, and emotional distress.`);
  }
  
  // Return up to 5 most relevant insights
  return insights.slice(0, 5);
}

// Helper function to get user profile data
async function getUserProfile(userId: string) {
  try {
    const { data: userData, error } = await supabaseService
      .from('users')
      .select('profile')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (!userData?.profile) return null;
    
    // Add debugging
    console.log('Profile type:', typeof userData.profile);
    console.log('Profile value:', userData.profile);
    
    // Handle both string and object profiles
    if (typeof userData.profile === 'string') {
      try {
        return JSON.parse(userData.profile);
      } catch (error) {
        console.error('Error parsing user profile JSON:', error);
        return null;
      }
    } else {
      return userData.profile; // Already an object
    }
  } catch (error) {
    console.error('Error parsing user profile:', error);
    return null;
  }
}

// Helper function to get onboarding data
async function getOnboardingData(userId: string) {
  try {
    const { data: onboardingData, error } = await supabaseService
      .from('onboarding_data')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching onboarding data:', error);
      return null;
    }
    
    return onboardingData;
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return null;
  }
}

// Helper function to get similar patient data based on symptom patterns
async function getSimilarPatientData(symptomLogs: any[]) {
  try {
    if (symptomLogs.length === 0) return [];
    
    // Extract symptom types and patterns
    const symptomTypes = symptomLogs.map(log => log.symptom_data?.type).filter(Boolean);
    const symptomNames = symptomLogs.map(log => log.symptom_data?.symptom).filter(Boolean);
    
    // If no valid symptom data, return empty array
    if (symptomTypes.length === 0 && symptomNames.length === 0) {
      return [];
    }
    
    // Query for similar patterns in the database
    // Use a simpler query to avoid JSON operator issues
    const { data: similarLogs, error } = await supabaseService
      .from('symptom_logs')
      .select('symptom_data, user_id')
      .limit(50);
    
    if (error) {
      console.error('Error fetching similar patient data:', error);
      return [];
    }
    
    // Group by patterns and analyze
    const patternGroups = new Map();
    
    similarLogs?.forEach(log => {
      try {
        const symptomData = log.symptom_data || {};
        if (!symptomData.type || !symptomData.symptom) return; // Skip invalid entries
        
        const pattern = `${symptomData.type}-${symptomData.socrates?.severity || 'unknown'}`;
        
        if (!patternGroups.has(pattern)) {
          patternGroups.set(pattern, {
            count: 0,
            symptoms: new Set(),
            outcomes: []
          });
        }
        
        const group = patternGroups.get(pattern);
        group.count++;
        group.symptoms.add(symptomData.symptom);
      } catch (error) {
        console.warn('Error processing similar log entry:', error);
        // Continue with other entries
      }
    });
    
    // Convert to insights
    const insights = Array.from(patternGroups.entries())
      .filter(([pattern, data]) => data.count >= 2) // Only patterns with multiple occurrences
      .map(([pattern, data]) => ({
        description: `${Array.from(data.symptoms).join(', ')} pattern`,
        frequency: data.count,
        commonOutcomes: 'Similar cases typically require follow-up monitoring'
      }))
      .slice(0, 3); // Limit to top 3 patterns
    
    return insights;
  } catch (error) {
    console.error('Error analyzing similar patient data:', error);
    return [];
  }
}
