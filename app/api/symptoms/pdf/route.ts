import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFGenerator, PDFContent, PDFTableData } from '../../../lib/pdf-generator';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
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

    console.log('Generating GP PDF for user:', user.email);

    const {
      appointmentDate,
      appointmentReason,
      doctorUnderstanding,
      medicationsTried,
      recentTests,
      relevantSymptoms,
      originalLanguage,
      userEdited,
      anonymisedId,
      confirmed,
    } = body;

    const { data: symptomLogs, error: fetchError } = await supabaseService
      .from('symptom_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching symptom logs for PDF:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch symptom data for PDF' }, { status: 500 });
    }

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
      confirmed: Boolean(confirmed),
    });

    const pdfGenerator = new PDFGenerator();
    const pdfDataUri = pdfGenerator.generatePDF(pdfContent);

    return NextResponse.json({ pdfDataUri, message: 'PDF generated successfully' });
  } catch (error) {
    console.error('Error in PDF generation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Types ────────────────────────────────────────────────────

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
}

type SymptomGroup = {
  displayName: string;
  firstLogged: Date;
  mostRecent: Date;
  count: number;
  severities: number[];
  datedSeverities: Array<{ d: Date; s: number }>;
  functionalImpact: string;
  location: string;
  character: string;
  onsetTime: string;
  associatedSymptoms: string;
  exacerbatingFactors: string;
  triggers: string;
  patterns: string;
  treatmentResponse: string;
  emotionalImpact: string;
  description: string;
};

type DayRow = {
  key: string;
  dateDisplay: string;
  symptomsArray: string[];
  maxSev: number;
  keyDetail: string;
};

// ── Utilities ────────────────────────────────────────────────

const EMPTY_VALUE_TOKENS = new Set([
  '', 'none', 'n/a', 'na', 'nil', 'no', 'unknown', 'not sure',
  'not applicable', 'none reported', 'not mentioned',
]);

function cleanText(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function hasMeaningfulContent(value: unknown): boolean {
  const t = cleanText(value);
  if (!t) return false;
  const normalised = t.toLowerCase().replace(/[.!?]+$/g, '').trim();
  return !EMPTY_VALUE_TOKENS.has(normalised);
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const trimmed = cleanText(v);
    if (!hasMeaningfulContent(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function truncateCell(value: string, maxChars: number): string {
  const text = cleanText(value).replace(/\s+/g, ' ');
  if (!text) return '\u2014';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}\u2026`;
}

function parseSeverityValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(10, Math.round(value)));
  }
  const t = cleanText(value);
  if (!t) return 0;
  const match = t.match(/\b(10|[0-9])\b/);
  if (match) return Math.max(0, Math.min(10, parseInt(match[1], 10)));
  const lower = t.toLowerCase();
  if (/\b(excruciating|unbearable|very severe)\b/.test(lower)) return 9;
  if (/\b(severe)\b/.test(lower)) return 8;
  if (/\b(moderate)\b/.test(lower)) return 5;
  if (/\b(mild)\b/.test(lower)) return 3;
  return 0;
}

function humanDuration(first: Date, most: Date): string {
  const days = Math.max(1, Math.ceil((most.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  if (days <= 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.round(days / 7);
  if (days < 30) return weeks === 1 ? '1 week' : `${weeks} weeks`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

function bestOf(...values: unknown[]): string {
  for (const v of values) {
    const t = cleanText(v);
    if (hasMeaningfulContent(t)) return t;
  }
  return '';
}

function extractSocrates(log: any, field: string): string {
  return bestOf(
    log?.[field],
    log?.symptom_data?.socrates?.[field],
    log?.symptom_data?.[field],
  );
}

// ── Main content generation ──────────────────────────────────

async function generatePDFContent(data: PDFData): Promise<PDFContent> {
  const {
    user, appointmentDate, appointmentReason, doctorUnderstanding,
    medicationsTried, recentTests, symptomLogs,
    originalLanguage, userEdited, anonymisedId, confirmed,
  } = data;

  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0];

  // ── Group symptoms by normalised name ──────────────────────
  const symptomGroups: Map<string, SymptomGroup> = new Map();

  if (symptomLogs && symptomLogs.length > 0) {
    symptomLogs.forEach(log => {
      const symptomData = log.symptom_data || {};
      const rawName = String(log.symptom_name || symptomData.symptom || 'Unknown Symptom').trim();
      const key = rawName.toLowerCase();
      const symptomName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const sevNum = (() => {
        const a = Number(log.severity_scale);
        if (!isNaN(a) && a > 0) return a;
        const b = Number(symptomData?.socrates?.severity);
        return !isNaN(b) && b > 0 ? b : 0;
      })();
      const date = new Date(log.created_at);

      if (!symptomGroups.has(key)) {
        symptomGroups.set(key, {
          displayName: symptomName,
          firstLogged: date,
          mostRecent: date,
          count: 1,
          severities: sevNum ? [sevNum] : [],
          datedSeverities: sevNum ? [{ d: date, s: sevNum }] : [],
          functionalImpact: bestOf(log.functional_impact, symptomData?.report?.functionalImpact),
          location: extractSocrates(log, 'location'),
          character: bestOf(extractSocrates(log, 'character'), extractSocrates(log, 'character_description')),
          onsetTime: bestOf(extractSocrates(log, 'onset_time'), extractSocrates(log, 'onset')),
          associatedSymptoms: bestOf(extractSocrates(log, 'associated_symptoms'), extractSocrates(log, 'associations')),
          exacerbatingFactors: bestOf(extractSocrates(log, 'exacerbating_factors'), extractSocrates(log, 'exacerbating')),
          triggers: bestOf(log.triggers, symptomData?.triggers),
          patterns: bestOf(log.patterns, symptomData?.patterns),
          treatmentResponse: bestOf(log.treatment_response, symptomData?.treatment_response, symptomData?.socrates?.treatment),
          emotionalImpact: bestOf(log.emotional_impact, symptomData?.report?.emotionalImpact),
          description: bestOf(log.description, symptomData?.description),
        });
      } else {
        const group = symptomGroups.get(key)!;
        if (symptomName.length > group.displayName.length) group.displayName = symptomName;
        group.count++;
        if (sevNum) group.severities.push(sevNum);
        if (sevNum) group.datedSeverities.push({ d: date, s: sevNum });
        if (date < group.firstLogged) group.firstLogged = date;
        if (date > group.mostRecent) group.mostRecent = date;

        const updateIfEmpty = (field: keyof SymptomGroup, val: string) => {
          if (val && !hasMeaningfulContent((group as any)[field])) (group as any)[field] = val;
        };
        updateIfEmpty('functionalImpact', bestOf(log.functional_impact, symptomData?.report?.functionalImpact));
        updateIfEmpty('location', extractSocrates(log, 'location'));
        updateIfEmpty('character', bestOf(extractSocrates(log, 'character'), extractSocrates(log, 'character_description')));
        updateIfEmpty('onsetTime', bestOf(extractSocrates(log, 'onset_time'), extractSocrates(log, 'onset')));
        updateIfEmpty('associatedSymptoms', bestOf(extractSocrates(log, 'associated_symptoms'), extractSocrates(log, 'associations')));
        updateIfEmpty('exacerbatingFactors', bestOf(extractSocrates(log, 'exacerbating_factors'), extractSocrates(log, 'exacerbating')));
        updateIfEmpty('triggers', bestOf(log.triggers, symptomData?.triggers));
        updateIfEmpty('patterns', bestOf(log.patterns, symptomData?.patterns));
        updateIfEmpty('treatmentResponse', bestOf(log.treatment_response, symptomData?.treatment_response, symptomData?.socrates?.treatment));
        updateIfEmpty('emotionalImpact', bestOf(log.emotional_impact, symptomData?.report?.emotionalImpact));
        updateIfEmpty('description', bestOf(log.description, symptomData?.description));
      }
    });
  }

  // ── Compute reason and understanding ───────────────────────
  const clinicalReason = await composeReason(appointmentReason, symptomLogs);
  const clinicalUnderstanding = doctorUnderstanding ? await rephraseClinically(doctorUnderstanding) : '';

  // ── Relevance filtering ────────────────────────────────────
  const relevantSet = await judgeRelevantSymptoms(clinicalReason, symptomGroups);

  // ── Section 1: Appointment Context ─────────────────────────
  const contextText = [
    `Reason for Appointment: ${clinicalReason || 'Not provided.'}`,
    clinicalUnderstanding ? `What the Patient Wants the Doctor to Understand: ${clinicalUnderstanding}` : '',
  ].filter(Boolean).join('\n');

  // ── Section 2: Symptom Overview (compact 5-col table) ──────
  const overviewTable: PDFTableData = {
    headers: ['Symptom', 'Duration', 'Severity (range)', 'Trend', 'Character / Location'],
    rows: [],
  };

  symptomGroups.forEach((g) => {
    if (relevantSet.size && !relevantSet.has(g.displayName)) return;

    const duration = g.count === 1 ? 'Single log' : humanDuration(g.firstLogged, g.mostRecent);

    let sevRange = '\u2014';
    if (g.severities.length) {
      const min = Math.min(...g.severities);
      const max = Math.max(...g.severities);
      sevRange = min === max ? `${min}/10` : `${min}\u2013${max}/10`;
    }

    let trend = '\u2014';
    if (g.severities.length >= 2) {
      const sorted = g.datedSeverities.slice().sort((a, b) => a.d.getTime() - b.d.getTime());
      const nums = sorted.map(x => x.s);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const delta = avg(nums.slice(-3)) - avg(nums.slice(-6, -3));
      trend = delta > 0.5 ? 'Worsening' : delta < -0.5 ? 'Improving' : 'Stable';
    }

    const charLoc = [g.character, g.location].filter(Boolean).join(', ');

    overviewTable.rows.push([
      g.displayName,
      duration,
      sevRange,
      trend,
      truncateCell(charLoc, 50) || '\u2014',
    ]);
  });

  // ── Section 3: Clinical Narrative ──────────────────────────
  const narrativeText = await composeNarrativeParagraphs(symptomGroups, clinicalReason);

  // ── Section 4: Symptom Timeline (compact 4-col table) ──────
  const byDate = new Map<string, any[]>();
  for (const log of (symptomLogs || [])) {
    const d = new Date(log.created_at);
    const k = d.toISOString().split('T')[0];
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(log);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)).slice(0, 10);

  const dayRows: DayRow[] = sortedDates.map(dateKey => {
    const logs = byDate.get(dateKey)!;
    const dateDisplay = new Date(dateKey).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
    const symptomSet = new Set<string>(logs.map((l: any) => String(l.symptom_name || l.symptom_data?.symptom || '\u2014')));
    const symptomsArray = Array.from(symptomSet);
    const sevNums = logs.map((l: any) => parseSeverityValue(l?.severity_scale ?? l?.symptom_data?.socrates?.severity));
    const maxSev = Math.max(...sevNums, 0);

    // Build key detail from SOCRATES data
    const details: string[] = [];
    for (const l of logs) {
      const char = bestOf(extractSocrates(l, 'character'), extractSocrates(l, 'character_description'));
      const loc = extractSocrates(l, 'location');
      const exac = bestOf(extractSocrates(l, 'exacerbating_factors'), extractSocrates(l, 'exacerbating'));
      const parts = [char, loc, exac].filter(Boolean);
      if (parts.length) details.push(parts.join(', '));
    }
    let keyDetail = dedupeStrings(details).join('; ');
    if (!keyDetail) {
      for (const l of logs) {
        const desc = bestOf(l.description, l.symptom_data?.description);
        if (desc) { keyDetail = truncateCell(desc, 60); break; }
      }
    }

    return { key: dateKey, dateDisplay, symptomsArray, maxSev, keyDetail: keyDetail || '\u2014' };
  });

  const rankedRows = await judgeTimeline(clinicalReason, dayRows);
  const timelineTable: PDFTableData = {
    headers: ['Date', 'Symptoms Logged', 'Severity', 'Key Detail'],
    rows: rankedRows.map(r => [
      r.dateDisplay,
      r.symptomsArray.join(', '),
      r.maxSev ? `${r.maxSev}/10` : '\u2014',
      truncateCell(r.keyDetail, 60),
    ]),
  };

  // ── Section 5: Patient Background (conditional) ────────────
  const userProfile = await getUserProfile(user.id);
  const onboardingData = await getOnboardingData(user.id);

  const historyFields: [string, string][] = [
    ['Past Medical History', bestOf(userProfile?.pastMedicalHistory, onboardingData?.medicalHistory)],
    ['Medications', cleanText(medicationsTried)],
    ['Allergies', bestOf(userProfile?.allergies, onboardingData?.allergies)],
    ['Family History', bestOf(userProfile?.familyHistory, onboardingData?.familyHistory)],
    ['Recent Investigations', cleanText(recentTests)],
    ['Social History', bestOf(userProfile?.socialHistory, onboardingData?.socialHistory)],
  ];
  const meaningfulFields = historyFields.filter(([, v]) => hasMeaningfulContent(v));

  // ── Parse appointment date ─────────────────────────────────
  let apptDisplay = appointmentDate || '';
  try {
    if (appointmentDate) {
      const parsed = new Date(appointmentDate);
      if (!isNaN(parsed.getTime())) {
        apptDisplay = parsed.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
    }
  } catch { /* keep raw string */ }

  // ── Assemble sections ──────────────────────────────────────
  const uniqueCount = overviewTable.rows.length || symptomGroups.size;
  const sections: PDFContent['sections'] = [
    {
      title: 'Appointment Context',
      content: contextText,
    },
    {
      title: 'Symptom Overview',
      description: `Overview of ${uniqueCount} symptom${uniqueCount !== 1 ? 's' : ''} logged over the reporting period. Severity is patient-reported 1\u201310.`,
      content: overviewTable,
    },
    {
      title: 'Clinical Narrative',
      description: 'Summary of symptom progression, patterns, and functional impact based on patient-reported data.',
      content: narrativeText,
    },
    {
      title: 'Symptom Timeline',
      description: 'Day-by-day log ordered by clinical relevance to appointment reason.',
      content: timelineTable,
    },
  ];

  if (meaningfulFields.length >= 2) {
    sections.push({
      title: 'Patient Background',
      content: {
        headers: ['Field', 'Value'],
        rows: meaningfulFields.map(([label, value]) => [label, value]),
      },
    });
  }

  return {
    title: 'Medical Appointment Report',
    patientInfo: {
      email: user.email,
      date: formattedDate,
      name: user?.user_metadata?.full_name || undefined,
      anonymisedId: anonymisedId,
      appointmentDate: apptDisplay,
    },
    confirmed: Boolean(confirmed),
    originalLanguage: originalLanguage,
    userEdited: Boolean(userEdited),
    sections,
    footer: `CONFIDENTIAL MEDICAL REPORT | Generated on ${formattedDate} | Sympli\nAuto-generated report. Please confirm findings with patient.`,
  };
}

// ── AI helpers ───────────────────────────────────────────────

async function composeReason(userReason: string | undefined, symptomLogs: any[]): Promise<string> {
  try {
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 80,
        messages: [
          { role: 'system', content: 'You are a UK NHS clinical summariser. Decide the single most likely reason for a GP appointment using recent structured logs as primary evidence; treat free-text as supporting. Return ONE short sentence (<=18 words), no preface.' },
          { role: 'user', content: `Free-text reason (optional): ${String(userReason || '').trim() || '\u2014'}` },
          { role: 'user', content: `Recent logs (most recent first): ${JSON.stringify(recent)}` },
        ],
      }),
    });
    const data = await res.json();
    const s = String(data?.choices?.[0]?.message?.content || '').trim();
    return s || fallback || '';
  } catch {
    return (userReason || '').trim();
  }
}

async function rephraseClinically(text: string): Promise<string> {
  const t = String(text || '').trim();
  if (!t) return '';
  try {
    if (!openaiApiKey) return t.charAt(0).toUpperCase() + t.slice(1);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a UK NHS clinical summariser. Rewrite the patient\'s sentence as a concise clinical phrasing suitable for a GP letter. Use clinical terms where appropriate. Only include verbatim patient quotes (in double quotes) if a specific phrase must be preserved. Output one sentence only.' },
          { role: 'user', content: t },
        ],
        temperature: 0.4,
        max_tokens: 120,
      }),
    });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    if (!content) return t.charAt(0).toUpperCase() + t.slice(1);
    return content.trim();
  } catch {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
}

async function judgeRelevantSymptoms(reason: string, groups: Map<string, SymptomGroup>): Promise<Set<string>> {
  try {
    const names = Array.from(groups.values()).map(g => g.displayName);
    const fallback = () => {
      const r = reason.toLowerCase();
      const set = new Set<string>();
      names.forEach(n => {
        if (!reason || r.includes(n.toLowerCase().split(' ')[0])) set.add(n);
      });
      if (set.size === 0) {
        Array.from(groups.values())
          .sort((a, b) => b.mostRecent.getTime() - a.mostRecent.getTime())
          .slice(0, 3)
          .forEach(g => set.add(g.displayName));
      }
      return set;
    };
    if (!openaiApiKey) return fallback();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 60,
        messages: [
          { role: 'system', content: 'You are a UK NHS clinical assistant. From a list of symptom names and a reason for appointment, select only those symptoms directly relevant to the reason. Output strict JSON: {"relevant":["name1","name2"]}. No commentary.' },
          { role: 'user', content: `Reason: ${reason || '\u2014'}` },
          { role: 'user', content: `Symptoms: ${JSON.stringify(names)}` },
        ],
      }),
    });
    const data = await res.json();
    const parsed = (() => { try { return JSON.parse((data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; } })();
    const arr: string[] = Array.isArray(parsed?.relevant) ? parsed.relevant : [];
    if (!arr.length) return fallback();
    return new Set(arr);
  } catch {
    return new Set(Array.from(groups.values()).map(g => g.displayName));
  }
}

async function composeNarrativeParagraphs(groups: Map<string, SymptomGroup>, reason: string): Promise<string> {
  const groupSummaries = Array.from(groups.values()).map(g => {
    const sorted = g.datedSeverities.slice().sort((a, b) => a.d.getTime() - b.d.getTime());
    const nums = sorted.map(x => x.s);
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const delta = nums.length >= 2 ? avg(nums.slice(-3)) - avg(nums.slice(-6, -3)) : 0;
    const trend = delta > 0.5 ? 'worsening' : delta < -0.5 ? 'improving' : 'stable';
    return {
      name: g.displayName,
      count: g.count,
      duration: g.count === 1 ? '1 day' : humanDuration(g.firstLogged, g.mostRecent),
      severityRange: nums.length ? `${Math.min(...nums)}\u2013${Math.max(...nums)}/10` : 'not recorded',
      trend,
      location: g.location || undefined,
      character: g.character || undefined,
      triggers: g.triggers || undefined,
      patterns: g.patterns || undefined,
      exacerbatingFactors: g.exacerbatingFactors || undefined,
      associatedSymptoms: g.associatedSymptoms || undefined,
      treatmentResponse: g.treatmentResponse || undefined,
      emotionalImpact: g.emotionalImpact || undefined,
      functionalImpact: g.functionalImpact || undefined,
      description: g.description || undefined,
    };
  });

  const fallbackNarrative = () => {
    const parts: string[] = [];
    for (const g of groupSummaries) {
      let line = `The patient reports ${g.name.toLowerCase()}`;
      if (g.duration !== '1 day') line += ` over ${g.duration}`;
      if (g.severityRange !== 'not recorded') line += ` with severity ${g.severityRange}`;
      line += `. The trend appears ${g.trend}.`;
      if (g.functionalImpact) line += ` Functional impact: ${g.functionalImpact}.`;
      parts.push(line);
    }
    return parts.join('\n\n') || 'No symptom data available for narrative generation.';
  };

  if (!openaiApiKey) return fallbackNarrative();

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: `You are a UK NHS clinical summariser writing for a GP letter. Write 2\u20134 paragraphs (150\u2013300 words total) that describe symptom progression, patterns, correlations, severity trends, and functional impact.

Rules:
- NEVER diagnose or suggest diagnoses
- Use "The patient reports\u2026", "Severity has trended\u2026", "Functional impact includes\u2026"
- Mention specific SOCRATES details (character, location, triggers, exacerbating factors) when available
- Note treatment responses and emotional impact where relevant
- Use UK English and professional clinical tone
- Do not repeat the section title or add meta-commentary`,
          },
          {
            role: 'user',
            content: `Reason for appointment: ${reason || '\u2014'}\n\nSymptom data:\n${JSON.stringify(groupSummaries, null, 2)}`,
          },
        ],
      }),
    });
    const data = await res.json();
    const out = String(data?.choices?.[0]?.message?.content || '').trim();
    return out || fallbackNarrative();
  } catch {
    return fallbackNarrative();
  }
}

async function judgeTimeline(reason: string, rows: DayRow[]): Promise<DayRow[]> {
  try {
    if (!openaiApiKey || rows.length <= 7) {
      const r = String(reason || '').toLowerCase();
      const tokens = new Set(r.split(/[^a-z0-9]+/i).filter(Boolean));
      const score = (row: DayRow) => {
        const nameHit = row.symptomsArray.some(n => {
          const w = String(n || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
          return w.some(x => tokens.has(x));
        }) ? 1 : 0;
        const sev = (row.maxSev || 0) / 10;
        return nameHit + sev;
      };
      return rows.slice().sort((a, b) => score(b) - score(a)).slice(0, 7);
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 120,
        messages: [
          { role: 'system', content: 'Select and rank the most relevant days to the GP appointment reason. Prefer days where symptom names match the reason, higher severity, and recent timing. Return strict JSON: {"order":[index...]}. No commentary.' },
          { role: 'user', content: `Reason: ${reason || '\u2014'}` },
          { role: 'user', content: `Days: ${JSON.stringify(rows.map((r, i) => ({ i, date: r.dateDisplay, symptoms: r.symptomsArray, maxSev: r.maxSev })))}` },
        ],
      }),
    });
    const data = await res.json();
    const parsed = (() => { try { return JSON.parse((data?.choices?.[0]?.message?.content || '').trim()); } catch { return null; } })();
    const order: number[] = Array.isArray(parsed?.order) ? parsed.order.filter((n: any) => Number.isInteger(n)) : [];
    const ranked = order.map((i: number) => rows[i]).filter(Boolean).slice(0, 7);
    return ranked.length ? ranked : rows.slice(0, 7);
  } catch {
    return rows.slice(0, 7);
  }
}

// ── Database helpers ─────────────────────────────────────────

async function getUserProfile(userId: string) {
  try {
    const { data: userData, error } = await supabaseService
      .from('users')
      .select('profile')
      .eq('id', userId)
      .single();

    if (error || !userData?.profile) return null;

    if (typeof userData.profile === 'string') {
      try { return JSON.parse(userData.profile); } catch { return null; }
    }
    return userData.profile;
  } catch {
    return null;
  }
}

async function getOnboardingData(userId: string) {
  try {
    const { data: onboardingData, error } = await supabaseService
      .from('onboarding_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return onboardingData;
  } catch {
    return null;
  }
}
