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
      anonymisedId
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
}

// Deprecated emoji marker removed; use plain text/numbering for reliability

async function generatePDFContent(data: PDFData): Promise<PDFContent> {
  const { user, appointmentDate, appointmentReason, doctorUnderstanding, medicationsTried, recentTests, relevantSymptoms, symptomLogs, originalLanguage, userEdited, anonymisedId } = data;
  
  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Group symptoms by name and calculate frequency data
  const symptomGroups = new Map();
  
  if (symptomLogs && symptomLogs.length > 0) {
    symptomLogs.forEach(log => {
      const symptomData = log.symptom_data || {};
      const symptomName = symptomData.symptom || 'Unknown Symptom';
      const severity = symptomData.socrates?.severity || 'Unknown';
      const date = new Date(log.created_at);
      
      if (!symptomGroups.has(symptomName)) {
        symptomGroups.set(symptomName, {
          firstLogged: date,
          mostRecent: date,
          count: 1,
          severities: [severity],
          functionalImpact: symptomData.description || 'Functional impact not reported by patient'
        });
      } else {
        const group = symptomGroups.get(symptomName);
        group.count++;
        group.severities.push(severity);
        if (date < group.firstLogged) group.firstLogged = date;
        if (date > group.mostRecent) group.mostRecent = date;
      }
    });
  }

  // Calculate summary statistics
  const totalSymptoms = symptomLogs.length;
  const uniqueSymptoms = symptomGroups.size;
  const avgSeverity = Array.from(symptomGroups.values())
    .flatMap(data => data.severities.filter(s => s !== 'Unknown'))
    .reduce((sum, s) => sum + parseInt(s), 0) / 
    Array.from(symptomGroups.values())
      .flatMap(data => data.severities.filter(s => s !== 'Unknown')).length || 0;

  // Create symptom frequency table
  const symptomTableData: PDFTableData = {
    headers: ['Symptom', 'First', 'Recent', 'Logs', 'Trend', 'Impact'],
    rows: []
  };

  symptomGroups.forEach((data, symptomName) => {
    const firstDate = data.firstLogged.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const lastDate = data.mostRecent.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    // Calculate trend
    const severityLevels = data.severities.filter(s => s !== 'Unknown');
    let trend = 'Stable';
    if (severityLevels.length >= 2) {
      const firstSeverity = parseInt(severityLevels[0]) || 5;
      const lastSeverity = parseInt(severityLevels[severityLevels.length - 1]) || 5;
      if (lastSeverity > firstSeverity + 2) trend = 'Worsening';
      else if (lastSeverity < firstSeverity - 2) trend = 'Improving';
    }
    
    // Get most common severity for trend display
    const severityCounts: Record<string, number> = {};
    data.severities.forEach(s => {
      severityCounts[s] = (severityCounts[s] || 0) + 1;
    });
    const mostCommonSeverity = Object.keys(severityCounts).reduce((a, b) => 
      severityCounts[a] > severityCounts[b] ? a : b
    );
    
    // Create trend visualization as plain text
    const commonSeverityNumeric = parseInt(mostCommonSeverity) || 0;
    let trendDisplay = trend;
    if (commonSeverityNumeric > 0) {
      trendDisplay += ` (common ${commonSeverityNumeric}/10)`;
    }
    
    // Truncate functional impact if too long
    const fi = (data.functionalImpact || '').trim();
    const functionalImpact = fi
      ? (fi.length > 40 ? fi.substring(0, 40) + '…' : fi)
      : '—';
    
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

  // Generate insights
  const insights = generateSimpliInsights(symptomLogs, symptomGroups);
  let insightsText = '';
  if (insights.length > 0) {
    insights.forEach(insight => {
      insightsText += `• ${insight}\n`;
    });
  } else {
    symptomGroups.forEach((data, symptomName) => {
      const severity = data.severities.find(s => s !== 'Unknown') || 'Unknown';
      const daysBetween = Math.ceil((data.mostRecent - data.firstLogged) / (1000 * 60 * 60 * 24));
      const functionalImpact = data.functionalImpact !== 'Not specified' ? data.functionalImpact : 'Impact on daily activities not specified';
      
      insightsText += `• ${symptomName}: ${severity}/10 severity, ongoing for ${daysBetween} days. ${functionalImpact}.\n`;
    });
  }

  // Analyze for red flags and trends
  const hasWorseningTrends = Array.from(symptomGroups.values()).some(data => {
    const severityLevels = data.severities.filter(s => s !== 'Unknown');
    if (severityLevels.length >= 2) {
      const firstSeverity = parseInt(severityLevels[0]) || 5;
      const lastSeverity = parseInt(severityLevels[severityLevels.length - 1]) || 5;
      return lastSeverity > firstSeverity + 2;
    }
    return false;
  });
  
  const hasHighSeverity = Array.from(symptomGroups.values()).some(data => {
    return data.severities.some(s => parseInt(s) >= 8);
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
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)).slice(0, 7);
  const timelineTable: PDFTableData = {
    headers: ['Date', 'Symptoms Mentioned', 'Simpli Insight (1 sentence)', 'Functional Impact', 'Emotion', 'Max Severity', 'Red Flags'],
    rows: sortedDates.map(key => {
      const logs = byDate.get(key)!;
      const dateDisplay = new Date(key).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
      const symptoms = Array.from(new Set(logs.map(l => String(l.symptom_name || l.symptom_data?.symptom || '—')))).join(', ');
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
      const redFlags = logs.some(l => {
        const d = String(l.symptom_data?.description || '').toLowerCase();
        const s = parseInt(String(l.symptom_data?.socrates?.severity || l.severity_scale || '0')) || 0;
        return (s >= 8 || d.includes('syncope') || d.includes('breathless') || d.includes('chest pain') || d.includes('severe'));
      }) ? 'Yes' : 'No';
      const oneLineInsight = (() => {
        const parts: string[] = [];
        if (maxSev > 0) parts.push(`Max severity ${maxSev}/10`);
        const triggers = Array.from(new Set(logs.map(l => String(l.triggers || l.symptom_data?.report?.triggers || '').trim()).filter(Boolean)));
        if (triggers.length) parts.push(`Triggers: ${triggers.slice(0, 2).join(', ')}`);
        return parts.length ? parts.join('; ') : '—';
      })();
      return [dateDisplay, symptoms, oneLineInsight, impact, emotions, maxSev ? `${maxSev}/10` : '—', redFlags];
    })
  };

  // Build Symptom Summaries table (recent logs)
  const recentForSummaries = (symptomLogs || []).slice(0, 10);
  const summariesTable: PDFTableData = {
    headers: ['Date & Time', 'Symptom', 'Summary'],
    rows: recentForSummaries.map(log => {
      const dt = new Date(log.created_at);
      const dtDisplay = dt.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const symptom = String(log.symptom_name || log.symptom_data?.symptom || '—');
      const sevNum = parseInt(String(log.severity_scale ?? log.symptom_data?.socrates?.severity ?? '')) || 0;
      const timeCourse = String(log.time_course || log.symptom_data?.socrates?.timeCourse || '').trim();
      const triggers = String(log.triggers || log.symptom_data?.report?.triggers || '').trim();
      const impact = String(log.functional_impact || log.symptom_data?.report?.functionalImpact || '').trim();
      const character = String(log.symptom_data?.socrates?.character || '').trim();
      const summaryParts: string[] = [];
      if (sevNum) summaryParts.push(`Severity ${sevNum}/10`);
      if (character) summaryParts.push(character);
      if (timeCourse) summaryParts.push(timeCourse);
      if (triggers) summaryParts.push(`Triggers: ${triggers}`);
      if (impact) summaryParts.push(`Impact: ${impact}`);
      const summaryJoined = summaryParts.join('; ');
      const summary = summaryJoined ? (summaryJoined.length > 110 ? summaryJoined.slice(0, 110) + '…' : summaryJoined) : '—';
      return [dtDisplay, symptom, summary];
    })
  };

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

  const clinicalReason = appointmentReason ? await rephraseClinically(appointmentReason) : '';
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
        title: `3. SIMPLI INSIGHT (Clinically Relevant Bullet Summary)${userEdited ? ' (User-edited)' : ''}`,
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
      {
        title: `6. SYMPTOM SUMMARIES (Recent Logs)${userEdited ? ' (User-edited)' : ''}`,
        content: summariesTable
      },
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
