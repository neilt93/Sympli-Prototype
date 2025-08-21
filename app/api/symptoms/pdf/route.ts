import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFGenerator, PDFContent, PDFTableData } from '../../../lib/pdf-generator';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      appointmentReason,
      doctorUnderstanding,
      medicationsTried,
      recentTests,
      relevantSymptoms
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
      appointmentReason,
      doctorUnderstanding,
      medicationsTried,
      recentTests,
      relevantSymptoms,
      symptomLogs: symptomLogs || []
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
  appointmentReason: string;
  doctorUnderstanding: string;
  medicationsTried: string;
  recentTests: string;
  relevantSymptoms: string[];
  symptomLogs: any[];
}

async function generatePDFContent(data: PDFData): Promise<PDFContent> {
  const { user, appointmentReason, doctorUnderstanding, medicationsTried, recentTests, relevantSymptoms, symptomLogs } = data;
  
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
    headers: ['Symptom', 'First Logged', 'Most Recent', 'No. of Logs', 'Trend', 'Functional Impact'],
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
    
    // Create trend visualization
    let trendDisplay = '';
    if (trend === 'Worsening') {
      trendDisplay = 'Worsening';
    } else if (trend === 'Improving') {
      trendDisplay = 'Improving';
    } else {
      const severity = parseInt(mostCommonSeverity) || 5;
      if (severity <= 3) trendDisplay = 'Mild';
      else if (severity <= 6) trendDisplay = 'Moderate';
      else trendDisplay = 'Severe';
    }
    
    // Truncate functional impact if too long
    const functionalImpact = data.functionalImpact.length > 30 
      ? data.functionalImpact.substring(0, 30) + '...' 
      : data.functionalImpact;
    
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

  // Create PDF content structure
  const pdfContent: PDFContent = {
    title: 'Medical Appointment Report by Sympli',
    patientInfo: {
      email: user.email,
      date: formattedDate
    },
    sections: [
      {
        title: '1. EXECUTIVE SUMMARY',
        content: `Reason for Appointment: ${appointmentReason || 'Comprehensive symptom analysis and health summary'}\n\n` +
                `What the Patient Wants the Doctor to Understand: ${doctorUnderstanding || 'Patient has been tracking symptoms using Sympli Health Companion and seeks comprehensive medical assessment.'}\n\n` +
                `Summary Statistics:\n` +
                `• Total symptom entries: ${totalSymptoms}\n` +
                `• Unique symptoms tracked: ${uniqueSymptoms}\n` +
                `${avgSeverity > 0 ? `• Average severity: ${avgSeverity.toFixed(1)}/10\n` : ''}` +
                `• Tracking period: ${symptomLogs.length > 0 ? 
                  `${Math.ceil((new Date().getTime() - new Date(symptomLogs[0].created_at).getTime()) / (1000 * 60 * 60 * 24))} days` : 
                  'Not specified'}`
      },
      {
        title: '2. SYMPTOM FREQUENCY OVERVIEW',
        content: symptomTableData
      },
      {
        title: '3. SIMPLI INSIGHT (Clinically-Relevant Bullet Summary)',
        content: insightsText
      },
      {
        title: '4. PATIENT HISTORY',
        content: historyTableData
      },

    ],
    footer: `CONFIDENTIAL MEDICAL REPORT | Generated on ${formattedDate} | Sympli Health Companion\nAuto-generated report. Please confirm findings with patient.`
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
