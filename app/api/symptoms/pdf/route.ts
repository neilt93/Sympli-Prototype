import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
      anonymisedId
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
}

// Deprecated emoji marker removed; use plain text/numbering for reliability

async function generatePDFContent(data: PDFData): Promise<PDFContent> {
  const { user, appointmentDate, appointmentReason, doctorUnderstanding, medicationsTried, recentTests, relevantSymptoms, symptomLogs, originalLanguage, userEdited, anonymisedId, confirmed } = data;
  
  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

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
          functionalImpact: (() => {
            const fi = String(log.functional_impact || symptomData?.report?.functionalImpact || '').trim();
            return fi || 'None';
          })()
        });
      } else {
        const group = symptomGroups.get(key)!;
        // Keep the nicest-cased display name (prefer longer, latest)
        if (symptomName.length > group.displayName.length) group.displayName = symptomName;
        group.count++;
        if (sevNum) group.severities.push(sevNum);
        if (sevNum) group.datedSeverities.push({ d: date, s: sevNum });
        if (date < group.firstLogged) group.firstLogged = date;
        if (date > group.mostRecent) group.mostRecent = date;
        // update functional impact if we have a non-empty one
        const fi = String(log.functional_impact || symptomData?.report?.functionalImpact || '').trim();
        if (fi) group.functionalImpact = fi;
      }
    });
  }

  // Calculate summary statistics
  const totalSymptoms = symptomLogs.length;
  const uniqueSymptoms = symptomGroups.size;
  const avgSeverity = (() => {
    const all = Array.from(symptomGroups.values()).flatMap(g => g.severities);
    if (!all.length) return 0;
    return all.reduce((a, b) => a + b, 0) / all.length;
  })();

  // Create symptom frequency table (filtered to relevant symptoms)
  const symptomTableData: PDFTableData = {
    headers: ['Symptom', 'First', 'Recent', 'Logs', 'Trend', 'Impact'],
    rows: []
  };

  async function judgeRelevantSymptoms(reason: string, groups: Map<string, any>): Promise<Set<string>> {
    try {
      const names = Array.from(groups.values()).map((g: any) => g.displayName);
      // Fallback heuristic: token overlap
      const fallback = () => {
        const r = reason.toLowerCase();
        const set = new Set<string>();
        names.forEach(n => { if (!reason || r.includes(n.toLowerCase().split(' ')[0])) set.add(n); });
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
            { role: 'system', content: 'You are a UK NHS clinical assistant. From a list of symptom names and a reason for appointment, select only those symptoms directly relevant to the reason. Output strict JSON: {"relevant":["name1","name2"]}. No commentary.' },
            { role: 'user', content: `Reason: ${reason || '—'}` },
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

  const relevantSet = await judgeRelevantSymptoms(await composeReason(appointmentReason), symptomGroups);

  symptomGroups.forEach((data, _key) => {
    if (relevantSet.size && !relevantSet.has(data.displayName)) return;
    const symptomName = data.displayName;
    const firstDate = data.firstLogged.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const lastDate = data.mostRecent.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    // Calculate trend
    let trend = '—';
    let sevMin = '—', sevMax = '—', sevLast = '—';
    if (data.severities.length) {
      const sorted = data.datedSeverities.slice().sort((a, b) => a.d.getTime() - b.d.getTime());
      const nums = sorted.map(x => x.s);
      const last3 = nums.slice(-3);
      const prev3 = nums.slice(-6, -3);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const delta = avg(last3) - avg(prev3);
      trend = delta > 0.5 ? 'worsening' : delta < -0.5 ? 'improving' : 'stable';
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const last = nums[nums.length - 1];
      sevMin = String(min);
      sevMax = String(max);
      sevLast = String(last);
    }
    
    // Get most common severity for trend display
    // Compose trend/severity display
    // Trend should be a single word only
    const trendDisplay = trend !== '—' ? trend : '—';
    
    // Truncate functional impact if too long
    const fi = (data.functionalImpact || '').trim();
    const functionalImpact = fi
      ? (fi.length > 40 ? fi.substring(0, 40) + '…' : fi)
      : 'None';
    
    symptomTableData.rows.push([
      symptomName,
      firstDate,
      lastDate,
      data.count.toString(),
      trendDisplay,
      functionalImpact
    ]);
  });

  // Create patient history table
  const userProfile = await getUserProfile(user.id);
  const onboardingData = await getOnboardingData(user.id);
  
  const historyTableData: PDFTableData = {
    headers: ['Field', 'Value'],
    rows: [
      ['Past Medical History', userProfile?.pastMedicalHistory || onboardingData?.medicalHistory || 'No relevant history provided by patient'],
      ['Medications', medicationsTried || 'No medications currently reported'],
      ['Allergies', userProfile?.allergies || onboardingData?.allergies || 'No known allergies reported'],
      ['Family History', userProfile?.familyHistory || onboardingData?.familyHistory || 'No relevant family history provided'],
      ['Recent Investigations', recentTests || 'No recent investigations reported'],
      ['Social History', userProfile?.socialHistory || onboardingData?.socialHistory || 'Social history not provided by patient']
    ]
  };

  // Prepare a concise SYMPLI INSIGHT paragraph instead of bullets
  const insights = generateSimpliInsights(symptomLogs, symptomGroups);
  const topThree = Array.from(symptomGroups.values())
    .sort((a: any, b: any) => b.count - a.count || b.mostRecent.getTime() - a.mostRecent.getTime())
    .slice(0, 3)
    .map(g => {
      const last = g.severities.length ? g.severities[g.severities.length - 1] : 0;
      const lastText = last ? `${last}/10` : '—';
      const sorted = g.datedSeverities.slice().sort((a: any, b: any) => a.d.getTime() - b.d.getTime());
      const nums = sorted.map((x: any) => x.s);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const delta = avg(nums.slice(-3)) - avg(nums.slice(-6, -3));
      const trend = delta > 0.5 ? 'worsening' : delta < -0.5 ? 'improving' : 'stable';
      const impact = (g.functionalImpact || '').trim();
      return `${g.displayName.toLowerCase()}: last ${lastText}, ${trend}${impact ? `, impact: ${impact}` : ''}`;
    });
  async function composeInsightParagraph(): Promise<string> {
    try {
      const context = {
        top: topThree,
        anyRedFlags: hasHighSeverity,
      };
      if (!openaiApiKey) {
        const parts = topThree.length ? topThree.join('; ') : 'No recent symptom patterns stand out.';
        return `Overall, symptoms are ${hasWorseningTrends ? 'trending worse' : hasHighSeverity ? 'significant at times' : 'mostly stable'}. Key items: ${parts}.`;
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 90,
          messages: [
            { role: 'system', content: 'Write a single short paragraph (<= 70 words) that ties together key symptom patterns for a GP. No diagnosis, no recommendations. Use UK clinical tone. Mention trend (worsening/improving/stable) and functional impact if present. Do not repeat patient name or meta text.' },
            { role: 'user', content: `Data to summarise: ${JSON.stringify(context)}` }
          ]
        })
      });
      const data = await res.json();
      const out = String(data?.choices?.[0]?.message?.content || '').trim();
      return out || 'Overall symptom pattern appears stable with intermittent impact on daily activities.';
    } catch {
      return 'Overall symptom pattern appears stable with intermittent impact on daily activities.';
    }
  }
  const insightsText = await composeInsightParagraph();

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

  // Build Symptom Timeline table grouped by date (most recent 7 days with logs)
  const byDate = new Map<string, any[]>();
  for (const log of (symptomLogs || [])) {
    const d = new Date(log.created_at);
    const key = d.toISOString().split('T')[0];
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(log);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)).slice(0, 10);
  type DayRow = { key: string; dateDisplay: string; symptoms: string; symptomsArray: string[]; tags: string[]; impact: string; emotions: string; maxSev: number; red: string };
  const dayRows: DayRow[] = sortedDates.map(key => {
    const logs = byDate.get(key)!;
    const dateDisplay = new Date(key).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
    const symptomSet = new Set<string>(logs.map(l => String(l.symptom_name || l.symptom_data?.symptom || '—')));
    const symptomsArray = Array.from(symptomSet);
    const symptoms = symptomsArray.join(', ');
    const tagsSet = new Set<string>();
    for (const l of logs) {
      const t = Array.isArray(l.tags) ? l.tags : [];
      for (const tag of t) {
        const v = String(tag || '').trim();
        if (v) tagsSet.add(v);
      }
    }
    const tags = Array.from(tagsSet);
    const impacts = Array.from(new Set(logs.map(l => String(l.functional_impact || l.symptom_data?.report?.functionalImpact || '').trim()).filter(Boolean)));
    const impact = impacts.length ? (impacts.join(' | ').slice(0, 50) + (impacts.join(' | ').length > 50 ? '…' : '')) : '—';
    const emotions = (() => {
      const bucket = new Set<string>();
      for (const l of logs) {
        const desc = String(l.symptom_data?.description || '').toLowerCase();
        if (!desc) continue;
        if (desc.includes('anxious')) bucket.add('Anxious');
        if (desc.includes('tearful')) bucket.add('Tearful');
        if (desc.includes('frustrated')) bucket.add('Frustrated');
        if (desc.includes('depressed')) bucket.add('Low mood');
      }
      return bucket.size ? Array.from(bucket).join(', ') : '—';
    })();
    const sevNums = logs.map(l => parseInt(String(l.severity_scale ?? l.symptom_data?.socrates?.severity ?? '')) || 0);
    const maxSev = Math.max(...sevNums, 0);
    const red = logs.some(l => {
      const d = String(l.symptom_data?.description || '').toLowerCase();
      const s = parseInt(String(l.symptom_data?.socrates?.severity || l.severity_scale || '0')) || 0;
      return (s >= 8 || d.includes('syncope') || d.includes('breathless') || d.includes('chest pain') || d.includes('severe'));
    }) ? 'Yes' : 'No';
    return { key, dateDisplay, symptoms, symptomsArray, tags, impact, emotions, maxSev, red };
  });

  async function judgeTimeline(reason: string, rows: DayRow[]): Promise<DayRow[]> {
    try {
      if (!openaiApiKey) {
        const r = String(reason || '').toLowerCase();
        const tokens = new Set(r.split(/[^a-z0-9]+/i).filter(Boolean));
        const score = (row: DayRow) => {
          const nameHit = row.symptomsArray.some(n => {
            const w = String(n || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            return w.some(x => tokens.has(x));
          }) ? 1 : 0;
          const tagHit = row.tags.some(t => tokens.has(String(t || '').toLowerCase())) ? 0.5 : 0;
          const sev = (row.maxSev || 0) / 10;
          // Recency bias via sortedDates order is already applied; add small tie-breaker by key string
          const recencyBias = 0; // already sorted
          return nameHit + tagHit + sev + recencyBias;
        };
        return rows.slice().sort((a, b) => score(b) - score(a)).slice(0, 7);
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 120,
          messages: [
            { role: 'system', content: 'Select and rank the most relevant days to the GP appointment reason using UK clinical judgement. Strongly prefer days where symptom names or database tags match (exactly or semantically) the reason for appointment. Secondarily, prefer higher severity and recent timing. Return strict JSON: {"order":[index...]}. No commentary.' },
            { role: 'user', content: `Reason: ${reason || '—'}` },
            { role: 'user', content: `Days: ${JSON.stringify(rows.map((r, i) => ({ i, date: r.dateDisplay, symptoms: r.symptomsArray, tags: r.tags, maxSev: r.maxSev, impact: r.impact })))}` }
          ]
        })
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

  const rankedRows = await judgeTimeline(await composeReason(appointmentReason), dayRows);
  const timelineTable: PDFTableData = {
    headers: ['Date', 'Symptoms Mentioned', 'Sympli Insight (one line)', 'Functional Impact', 'Emotion', 'Max Severity', 'Red Flags'],
    rows: rankedRows.map(r => {
      const oneLineInsight = r.maxSev > 0 ? `max severity ${r.maxSev}/10` : '—';
      return [r.dateDisplay, r.symptoms, oneLineInsight, r.impact, r.emotions, r.maxSev ? `${r.maxSev}/10` : '—', r.red];
    })
  };

  // Build Symptom Summaries table (recent unique logs by symptom)
  const recentSorted = (symptomLogs || [])
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
            { role: 'system', content: 'You are a UK NHS clinical summariser. Rewrite the patient\'s sentence as a concise clinical phrasing suitable for a GP letter. Use clinical terms where appropriate. Only include verbatim patient quotes (in double quotes) if a specific phrase must be preserved. Output one sentence only.' },
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
            { role: 'system', content: 'You are a UK NHS clinical summariser. Decide the single most likely reason for a GP appointment using recent structured logs as primary evidence; treat free-text as supporting. Return ONE short sentence (<=18 words), no preface.' },
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

  const clinicalReason = await composeReason(appointmentReason);
  const clinicalUnderstanding = doctorUnderstanding ? await rephraseClinically(doctorUnderstanding) : '';
  const pdfContent: PDFContent = {
    title: 'Medical Appointment Report by Sympli',
    patientInfo: {
      email: user.email,
      date: formattedDate,
      name: user?.user_metadata?.full_name || undefined,
      anonymisedId: anonymisedId,
      appointmentDate: apptDisplay
    },
    confirmed: Boolean(confirmed),
    originalLanguage: originalLanguage,
    userEdited: Boolean(userEdited),
    sections: [
      {
        title: `1. EXECUTIVE SUMMARY (Quick Appointment Context)${userEdited ? ' (User-edited)' : ''}`,
        content: [
          `Reason for Appointment: ${clinicalReason || 'Not provided.'}`,
          `What the Patient Wants the Doctor to Understand: ${clinicalUnderstanding || 'Not provided.'}`
        ].join('\n')
      },
      {
        title: `2. SYMPTOM FREQUENCY OVERVIEW${userEdited ? ' (User-edited)' : ''}`,
        content: symptomTableData
      },
      {
        title: `3. SYMPLI INSIGHT (Clinically Relevant Summary)${userEdited ? ' (User-edited)' : ''}`,
        content: insightsText
      },
      {
        title: `4. SYMPTOM TIMELINE (Structured Table)${userEdited ? ' (User-edited)' : ''}`,
        content: timelineTable
      },
      {
        title: `5. QUICK HISTORY OF PATIENT${userEdited ? ' (User-edited)' : ''}`,
        content: historyTableData
      },
      // Removed section 6 per spec – summaries folded into timeline/frequency
      {
        title: '7. ATTACHMENTS (To be implemented)',
        content: 'Attachments uploaded by the patient will appear here in a future update.'
      }
    ],
    footer: `CONFIDENTIAL MEDICAL REPORT | Generated on ${formattedDate} | Sympli\nAuto-generated report. Please confirm findings with patient.`
  };

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
