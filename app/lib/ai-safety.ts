export interface AISafetyConfig {
  maxResponseLength: number;
  disallowedTerms: string[];
  requiredDisclaimers: string[];
  medicalLimitations: string[];
  redFlagKeywords: string[];
  severityIndicators: string[];
}

export interface AISafetyCheck {
  passed: boolean;
  warnings: string[];
  disclaimers: string[];
  redFlags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const AI_SAFETY_CONFIG: AISafetyConfig = {
  maxResponseLength: 2000,
  disallowedTerms: [
    'diagnosis', 'diagnose', 'diagnosed', 'diagnostic',
    'treatment', 'treat', 'cure', 'heal', 'medicine', 'medication',
    'doctor says', 'medical advice', 'professional opinion',
    'you have', 'you are suffering from', 'you need to',
    'this is', 'this means', 'this indicates'
  ],
  requiredDisclaimers: [
    'This is not medical advice and should not replace consultation with a healthcare professional.',
    'Always consult with your doctor for proper diagnosis and treatment.',
    'This information is for educational purposes only.',
    'If you are experiencing severe symptoms, seek immediate medical attention.'
  ],
  medicalLimitations: [
    'I cannot provide medical diagnoses',
    'I cannot prescribe treatments',
    'I cannot replace professional medical advice',
    'I can only help you organize and describe your symptoms'
  ],
  redFlagKeywords: [
    'chest pain', 'shortness of breath', 'severe headache',
    'unconscious', 'bleeding', 'broken bone', 'heart attack',
    'stroke', 'seizure', 'suicidal', 'emergency', 'urgent'
  ],
  severityIndicators: [
    'severe', 'intense', 'unbearable', 'debilitating',
    'constant', 'worsening', 'sudden onset', 'sharp',
    'crippling', 'excruciating', 'life-threatening'
  ]
};

export class AISafetyManager {
  private static instance: AISafetyManager;

  private constructor() {}

  public static getInstance(): AISafetyManager {
    if (!AISafetyManager.instance) {
      AISafetyManager.instance = new AISafetyManager();
    }
    return AISafetyManager.instance;
  }

  // Check AI response for safety compliance
  public checkResponse(response: string, context: 'symptom_logging' | 'timeline_view' | 'pdf_generation'): AISafetyCheck {
    const warnings: string[] = [];
    const disclaimers: string[] = [];
    const redFlags: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for disallowed terms
    const foundDisallowedTerms = this.findDisallowedTerms(response);
    if (foundDisallowedTerms.length > 0) {
      warnings.push(`Disallowed terms detected: ${foundDisallowedTerms.join(', ')}`);
      severity = this.upgradeSeverity(severity, 'medium');
    }

    // Check for red flag keywords
    const foundRedFlags = this.findRedFlags(response);
    if (foundRedFlags.length > 0) {
      redFlags.push(...foundRedFlags);
      severity = this.upgradeSeverity(severity, 'high');
    }

    // Check response length
    if (response.length > AI_SAFETY_CONFIG.maxResponseLength) {
      warnings.push(`Response exceeds maximum length (${response.length}/${AI_SAFETY_CONFIG.maxResponseLength})`);
      severity = this.upgradeSeverity(severity, 'medium');
    }

    // Add required disclaimers based on context
    disclaimers.push(...this.getContextualDisclaimers(context));

    // Check for severity indicators
    const severityLevel = this.assessSeverity(response);
    if (severityLevel === 'critical') {
      severity = 'critical';
      warnings.push('Critical severity indicators detected - immediate medical attention may be required');
    }

    return {
      passed: warnings.length === 0 && redFlags.length === 0,
      warnings,
      disclaimers,
      redFlags,
      severity
    };
  }

  // Sanitize AI response to ensure safety
  public sanitizeResponse(response: string, context: 'symptom_logging' | 'timeline_view' | 'pdf_generation'): string {
    let sanitized = response;

    // Remove or replace disallowed terms
    AI_SAFETY_CONFIG.disallowedTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '[medical term]');
    });

    // Add disclaimers if not present
    const disclaimers = this.getContextualDisclaimers(context);
    disclaimers.forEach(disclaimer => {
      if (!sanitized.toLowerCase().includes(disclaimer.toLowerCase())) {
        sanitized += `\n\n${disclaimer}`;
      }
    });

    // Truncate if too long
    if (sanitized.length > AI_SAFETY_CONFIG.maxResponseLength) {
      sanitized = sanitized.substring(0, AI_SAFETY_CONFIG.maxResponseLength - 100) + '...';
    }

    return sanitized;
  }

  // Generate safe AI prompt
  public generateSafePrompt(userInput: string, context: 'symptom_logging' | 'timeline_view' | 'pdf_generation'): string {
    const basePrompt = this.getBasePrompt(context);
    const safetyInstructions = this.getSafetyInstructions(context);
    
    return `${basePrompt}

SAFETY INSTRUCTIONS:
${safetyInstructions}

USER INPUT:
${userInput}

Remember: You are a symptom logging assistant, not a medical professional. Focus on helping users describe and organize their symptoms clearly for their healthcare providers.`;
  }

  // Check user input for red flags
  public checkUserInput(input: string): {
    hasRedFlags: boolean;
    redFlags: string[];
    requiresUrgentAttention: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const redFlags = this.findRedFlags(input);
    const severity = this.assessSeverity(input);
    const requiresUrgentAttention = severity === 'critical' || redFlags.length > 2;

    return {
      hasRedFlags: redFlags.length > 0,
      redFlags,
      requiresUrgentAttention,
      severity
    };
  }

  // Validate symptom log content
  public validateSymptomLog(content: string): {
    isValid: boolean;
    warnings: string[];
    redFlags: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const redFlags: string[] = [];
    const recommendations: string[] = [];

    // Check for diagnostic language
    const diagnosticTerms = this.findDisallowedTerms(content);
    if (diagnosticTerms.length > 0) {
      warnings.push('Avoid diagnostic language - focus on describing symptoms');
      recommendations.push('Use descriptive language instead of diagnostic terms');
    }

    // Check for red flags
    const foundRedFlags = this.findRedFlags(content);
    if (foundRedFlags.length > 0) {
      redFlags.push(...foundRedFlags);
      recommendations.push('Consider seeking immediate medical attention for these symptoms');
    }

    // Check for severity
    const severity = this.assessSeverity(content);
    if (severity === 'high' || severity === 'critical') {
      warnings.push('High severity symptoms detected');
      recommendations.push('Consider discussing these symptoms with a healthcare professional');
    }

    return {
      isValid: warnings.length === 0 && redFlags.length === 0,
      warnings,
      redFlags,
      recommendations
    };
  }

  // Private helper methods
  private findDisallowedTerms(text: string): string[] {
    return AI_SAFETY_CONFIG.disallowedTerms.filter(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(text)
    );
  }

  private findRedFlags(text: string): string[] {
    return AI_SAFETY_CONFIG.redFlagKeywords.filter(keyword => 
      new RegExp(`\\b${keyword}\\b`, 'i').test(text)
    );
  }

  private assessSeverity(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityCount = AI_SAFETY_CONFIG.severityIndicators.filter(indicator => 
      new RegExp(`\\b${indicator}\\b`, 'i').test(text)
    ).length;

    if (severityCount >= 5) return 'critical';
    if (severityCount >= 3) return 'high';
    if (severityCount >= 1) return 'medium';
    return 'low';
  }

  private upgradeSeverity(current: 'low' | 'medium' | 'high' | 'critical', newLevel: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(newLevel);
    return levels[Math.max(currentIndex, newIndex)] as 'low' | 'medium' | 'high' | 'critical';
  }

  private getContextualDisclaimers(context: 'symptom_logging' | 'timeline_view' | 'pdf_generation'): string[] {
    const baseDisclaimers = [AI_SAFETY_CONFIG.requiredDisclaimers[0]];

    switch (context) {
      case 'symptom_logging':
        return [
          ...baseDisclaimers,
          'This symptom log is for your personal health tracking and to share with your healthcare provider.'
        ];
      case 'timeline_view':
        return [
          ...baseDisclaimers,
          'This timeline shows your symptom patterns and should be discussed with your healthcare provider.'
        ];
      case 'pdf_generation':
        return [
          ...baseDisclaimers,
          'This report is generated from your symptom logs and should be reviewed by a healthcare professional.',
          'The information in this report is based on your self-reported symptoms and may not be complete.'
        ];
      default:
        return baseDisclaimers;
    }
  }

  private getBasePrompt(context: 'symptom_logging' | 'timeline_view' | 'pdf_generation'): string {
    switch (context) {
      case 'symptom_logging':
        return 'You are a helpful symptom logging assistant. Your role is to help users describe their symptoms clearly and organize their health information for their healthcare providers.';
      case 'timeline_view':
        return 'You are a helpful health timeline assistant. Your role is to help users understand patterns in their symptom history and prepare for discussions with healthcare providers.';
      case 'pdf_generation':
        return 'You are a helpful report generation assistant. Your role is to create clear, organized summaries of symptom information for healthcare providers.';
      default:
        return 'You are a helpful health assistant. Your role is to support users in managing their health information.';
    }
  }

  private getSafetyInstructions(context: 'symptom_logging' | 'timeline_view' | 'pdf_generation'): string {
    return `- DO NOT provide medical diagnoses, treatments, or prescriptions
- DO NOT make claims about what conditions the user may have
- DO NOT give medical advice or recommendations
- DO focus on helping users describe symptoms clearly
- DO help organize information for healthcare providers
- DO include appropriate disclaimers
- DO flag potential red flags for medical attention
- DO use neutral, descriptive language
- DO emphasize the importance of consulting healthcare professionals`;
  }

  // Generate safety report
  public generateSafetyReport(): {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    commonIssues: string[];
    recommendations: string[];
  } {
    // This would track safety check statistics over time
    return {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      commonIssues: [],
      recommendations: [
        'Regularly review and update disallowed terms list',
        'Monitor for new diagnostic language patterns',
        'Ensure all AI responses include appropriate disclaimers',
        'Maintain clear boundaries between assistance and medical advice'
      ]
    };
  }
}

export const aiSafetyManager = AISafetyManager.getInstance();
