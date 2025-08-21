const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Demo user data
const DEMO_USER = {
  email: 'demo@sympli.health',
  full_name: 'Demo Patient',
  role: 'user',
  onboarding_complete: true
};

// Realistic symptom data for GP demo
const DEMO_SYMPTOMS = [
  {
    symptom_type: 'headache',
    severity: 'moderate',
    frequency: 'intermittent',
    duration: '2-3 hours',
    triggers: ['stress', 'screen time', 'dehydration'],
    impact: 'affects concentration at work',
    emotional_impact: 'frustrated',
    red_flags: false,
    attachments: ['photo'],
    notes: 'Tension-type headache, usually in the afternoon'
  },
  {
    symptom_type: 'fatigue',
    severity: 'mild',
    frequency: 'daily',
    duration: 'all day',
    triggers: ['poor sleep', 'stress'],
    impact: 'difficulty completing daily tasks',
    emotional_impact: 'tired',
    red_flags: false,
    attachments: [],
    notes: 'General tiredness, worse in the morning'
  },
  {
    symptom_type: 'chest pain',
    severity: 'severe',
    frequency: 'episodic',
    duration: '5-10 minutes',
    triggers: ['exercise', 'stress'],
    impact: 'prevents physical activity',
    emotional_impact: 'anxious',
    red_flags: true,
    attachments: [],
    notes: 'Sharp pain in left chest, radiates to arm'
  },
  {
    symptom_type: 'dizziness',
    severity: 'moderate',
    frequency: 'intermittent',
    duration: '30 seconds to 2 minutes',
    triggers: ['standing up quickly', 'dehydration'],
    impact: 'afraid to drive',
    emotional_impact: 'concerned',
    red_flags: false,
    attachments: [],
    notes: 'Lightheadedness when changing positions'
  },
  {
    symptom_type: 'back pain',
    severity: 'moderate',
    frequency: 'daily',
    duration: 'varies',
    triggers: ['sitting for long periods', 'lifting'],
    impact: 'difficulty with household chores',
    emotional_impact: 'frustrated',
    red_flags: false,
    attachments: ['photo'],
    notes: 'Lower back pain, worse in the evening'
  },
  {
    symptom_type: 'shortness of breath',
    severity: 'mild',
    frequency: 'intermittent',
    duration: 'few minutes',
    triggers: ['exercise', 'anxiety'],
    impact: 'limits physical activity',
    emotional_impact: 'worried',
    red_flags: false,
    attachments: [],
    notes: 'Difficulty catching breath during moderate exercise'
  },
  {
    symptom_type: 'abdominal pain',
    severity: 'moderate',
    frequency: 'intermittent',
    duration: '1-2 hours',
    triggers: ['certain foods', 'stress'],
    impact: 'affects eating habits',
    emotional_impact: 'uncomfortable',
    red_flags: false,
    attachments: [],
    notes: 'Cramping pain in lower abdomen'
  },
  {
    symptom_type: 'joint pain',
    severity: 'mild',
    frequency: 'daily',
    duration: 'varies',
    triggers: ['weather changes', 'overuse'],
    impact: 'affects mobility',
    emotional_impact: 'frustrated',
    red_flags: false,
    attachments: ['photo'],
    notes: 'Knee and hip pain, worse in cold weather'
  }
];

// Generate realistic timestamps over the past 6 months
function generateTimestamps(count) {
  const timestamps = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
  
  for (let i = 0; i < count; i++) {
    const randomTime = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));
    timestamps.push(randomTime);
  }
  
  return timestamps.sort((a, b) => a - b);
}

// Generate symptom log entry
function generateSymptomLog(symptom, timestamp) {
  const severityEmojis = {
    'mild': '🟢',
    'moderate': '🟡',
    'severe': '🔴'
  };

  const impactLevels = {
    'mild': 'minimal impact on daily activities',
    'moderate': 'some impact on daily activities',
    'severe': 'significant impact on daily activities'
  };

  return {
    user_id: DEMO_USER.id,
    symptom_type: symptom.symptom_type,
    severity: symptom.severity,
    severity_emoji: severityEmojis[symptom.severity],
    frequency: symptom.frequency,
    duration: symptom.duration,
    triggers: symptom.triggers,
    impact: symptom.impact,
    impact_level: impactLevels[symptom.severity],
    emotional_impact: symptom.emotional_impact,
    red_flags: symptom.red_flags,
    red_flag_indicators: symptom.red_flags ? ['requires immediate attention'] : [],
    attachments: symptom.attachments,
    notes: symptom.notes,
    created_at: timestamp.toISOString(),
    updated_at: timestamp.toISOString(),
    tags: [symptom.symptom_type, symptom.severity, symptom.frequency],
    is_archived: false
  };
}

// Generate AI summary for symptom
function generateAISummary(symptom, logs) {
  const totalLogs = logs.length;
  const severityBreakdown = logs.reduce((acc, log) => {
    acc[log.severity] = (acc[log.severity] || 0) + 1;
    return acc;
  }, {});

  return {
    symptom_type: symptom.symptom_type,
    total_occurrences: totalLogs,
    severity_distribution: severityBreakdown,
    most_common_triggers: symptom.triggers,
    typical_duration: symptom.duration,
    impact_summary: symptom.impact,
    emotional_pattern: symptom.emotional_impact,
    red_flags_present: symptom.red_flags,
    recommendations: [
      'Continue monitoring symptom patterns',
      'Consider discussing with healthcare provider',
      'Track triggers and avoid when possible'
    ],
    generated_at: new Date().toISOString()
  };
}

// Main function to populate demo data
async function populateDemoData() {
  try {
    console.log('🚀 Starting demo data population...');

    // 1. Create or get demo user
    console.log('📝 Setting up demo user...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', DEMO_USER.email)
      .single();

    let demoUserId;
    if (existingUser) {
      demoUserId = existingUser.id;
      console.log('✅ Demo user already exists');
    } else {
      // Create demo user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: DEMO_USER.email,
          full_name: DEMO_USER.full_name,
          role: DEMO_USER.role,
          onboarding_complete: DEMO_USER.onboarding_complete,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create demo user: ${userError.message}`);
      }

      demoUserId = newUser.id;
      console.log('✅ Demo user created');
    }

    DEMO_USER.id = demoUserId;

    // 2. Generate symptom logs
    console.log('📊 Generating symptom logs...');
    const allLogs = [];
    const timestamps = generateTimestamps(50); // 50 logs over 6 months

    DEMO_SYMPTOMS.forEach((symptom, index) => {
      const symptomLogs = [];
      const logsPerSymptom = Math.floor(timestamps.length / DEMO_SYMPTOMS.length);
      const startIndex = index * logsPerSymptom;
      const endIndex = startIndex + logsPerSymptom;

      for (let i = startIndex; i < endIndex; i++) {
        if (timestamps[i]) {
          const log = generateSymptomLog(symptom, timestamps[i]);
          symptomLogs.push(log);
          allLogs.push(log);
        }
      }
    });

    // 3. Insert symptom logs
    console.log('💾 Inserting symptom logs...');
    const { error: logsError } = await supabase
      .from('symptom_logs')
      .insert(allLogs);

    if (logsError) {
      throw new Error(`Failed to insert symptom logs: ${logsError.message}`);
    }

    console.log(`✅ Inserted ${allLogs.length} symptom logs`);

    // 4. Generate AI summaries
    console.log('🤖 Generating AI summaries...');
    const summaries = DEMO_SYMPTOMS.map(symptom => {
      const symptomLogs = allLogs.filter(log => log.symptom_type === symptom.symptom_type);
      return generateAISummary(symptom, symptomLogs);
    });

    // 5. Insert AI summaries
    const { error: summariesError } = await supabase
      .from('symptom_summaries')
      .insert(summaries);

    if (summariesError) {
      console.warn('⚠️ Could not insert summaries (table may not exist):', summariesError.message);
    } else {
      console.log(`✅ Inserted ${summaries.length} AI summaries`);
    }

    // 6. Create consent records
    console.log('📋 Creating consent records...');
    const consentRecords = [
      {
        user_id: demoUserId,
        consent_type: 'gdpr',
        consent_method: 'digital',
        consent_status: 'granted',
        consent_details: {
          data_processing: true,
          data_sharing: false,
          research_participation: false
        },
        created_at: new Date().toISOString()
      },
      {
        user_id: demoUserId,
        consent_type: 'data_processing',
        consent_method: 'digital',
        consent_status: 'granted',
        consent_details: {
          symptom_logging: true,
          ai_analysis: true,
          report_generation: true
        },
        created_at: new Date().toISOString()
      }
    ];

    const { error: consentError } = await supabase
      .from('consent_records')
      .insert(consentRecords);

    if (consentError) {
      console.warn('⚠️ Could not insert consent records:', consentError.message);
    } else {
      console.log('✅ Consent records created');
    }

    // 7. Create audit logs for demo activities
    console.log('📝 Creating audit logs...');
    const auditLogs = allLogs.map(log => ({
      user_id: demoUserId,
      action: 'create',
      resource_type: 'symptom_log',
      resource_id: log.id,
      details: {
        symptom_type: log.symptom_type,
        severity: log.severity,
        demo_data: true
      },
      timestamp: log.created_at,
      session_id: 'demo_session'
    }));

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert(auditLogs);

    if (auditError) {
      console.warn('⚠️ Could not insert audit logs:', auditError.message);
    } else {
      console.log('✅ Audit logs created');
    }

    // 8. Generate demo report
    console.log('📄 Generating demo PDF report...');
    const demoReport = {
      user_id: demoUserId,
      report_type: 'gp_summary',
      report_data: {
        patient_name: DEMO_USER.full_name,
        report_date: new Date().toISOString(),
        symptoms_overview: DEMO_SYMPTOMS.map(s => ({
          type: s.symptom_type,
          severity: s.severity,
          frequency: s.frequency,
          red_flags: s.red_flags
        })),
        total_symptoms: DEMO_SYMPTOMS.length,
        red_flags_present: DEMO_SYMPTOMS.some(s => s.red_flags),
        recommendations: [
          'Review symptom patterns with patient',
          'Consider further investigation for chest pain',
          'Monitor fatigue and sleep patterns',
          'Address stress management strategies'
        ]
      },
      created_at: new Date().toISOString()
    };

    const { error: reportError } = await supabase
      .from('reports')
      .insert([demoReport]);

    if (reportError) {
      console.warn('⚠️ Could not insert demo report:', reportError.message);
    } else {
      console.log('✅ Demo PDF report generated');
    }

    // 9. Summary
    console.log('\n🎉 Demo data population completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • Demo user: ${DEMO_USER.email}`);
    console.log(`   • Symptom logs: ${allLogs.length}`);
    console.log(`   • Symptom types: ${DEMO_SYMPTOMS.length}`);
    console.log(`   • Time span: 6 months`);
    console.log(`   • Red flags present: ${DEMO_SYMPTOMS.filter(s => s.red_flags).length}`);
    console.log('\n🔗 Demo account ready for GP presentation!');

    return {
      success: true,
      demoUserId,
      logCount: allLogs.length,
      symptomTypes: DEMO_SYMPTOMS.length
    };

  } catch (error) {
    console.error('❌ Demo data population failed:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  populateDemoData()
    .then(result => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDemoData, DEMO_USER, DEMO_SYMPTOMS };
