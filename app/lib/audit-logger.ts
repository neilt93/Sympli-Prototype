import { createClient } from '@supabase/supabase-js';

// Check if Supabase environment variables are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create Supabase client if environment variables are available
let supabaseService: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseService = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️ Supabase environment variables not configured. Audit logging will use console fallback only.');
}

export interface AuditLogEntry {
  user_id: string;
  action: string;
  resource_type: 'symptom_log' | 'timeline_view' | 'pdf_export' | 'user_profile' | 'consent' | 'login' | 'logout';
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  session_id: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async logAction(
    userId: string,
    action: string,
    resourceType: AuditLogEntry['resource_type'],
    details: Record<string, any> = {},
    resourceId?: string
  ): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        session_id: this.sessionId,
        timestamp: new Date()
      };

                    // Log to Supabase audit table if available
              if (supabaseService) {
                const { error } = await supabaseService
                  .from('audit_logs')
                  .insert([entry]);

                if (error) {
                  console.error('❌ Audit logging failed:', error);
                  // Fallback to console logging for critical actions
                  console.log('🔍 AUDIT LOG:', entry);
                } else {
                  console.log('✅ Audit log recorded:', action, resourceType);
                }
              } else {
                // Fallback to console logging when Supabase is not available
                console.log('🔍 AUDIT LOG (console fallback):', entry);
              }
    } catch (error) {
      console.error('❌ Audit logging error:', error);
    }
  }

  // Specific audit methods for common actions
  public async logSymptomLog(userId: string, action: 'create' | 'view' | 'edit' | 'delete' | 'archive', logId: string, details?: Record<string, any>): Promise<void> {
    await this.logAction(userId, action, 'symptom_log', {
      log_id: logId,
      ...details
    }, logId);
  }

  public async logTimelineView(userId: string, action: 'view' | 'search' | 'filter', details?: Record<string, any>): Promise<void> {
    await this.logAction(userId, action, 'timeline_view', details);
  }

  public async logPDFExport(userId: string, action: 'generate' | 'download' | 'share', reportId: string, details?: Record<string, any>): Promise<void> {
    await this.logAction(userId, action, 'pdf_export', {
      report_id: reportId,
      ...details
    }, reportId);
  }

  public async logConsent(userId: string, action: 'grant' | 'withdraw' | 'update' | 'archive', consentType: string, details?: Record<string, any>): Promise<void> {
    await this.logAction(userId, action, 'consent', {
      consent_type: consentType,
      ...details
    });
  }

  public async logAuthentication(userId: string, action: 'login' | 'logout' | '2fa_enabled' | '2fa_disabled' | '2fa_setup' | '2fa_verify' | '2fa_backup_used' | '2fa_verified', details?: Record<string, any>): Promise<void> {
    await this.logAction(userId, action, action as 'login' | 'logout', details);
  }

  public async logUserProfile(userId: string, action: 'view' | 'edit' | 'delete' | 'anonymize', details?: Record<string, any>): Promise<void> {
    await this.logAction(userId, action, 'user_profile', details);
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Helper functions for common audit scenarios
export const logSymptomCreation = (userId: string, logId: string, symptomType: string) => {
  return auditLogger.logSymptomLog(userId, 'create', logId, {
    symptom_type: symptomType,
    timestamp: new Date().toISOString()
  });
};

export const logPDFGeneration = (userId: string, reportId: string, reportType: string) => {
  return auditLogger.logPDFExport(userId, 'generate', reportId, {
    report_type: reportType,
    timestamp: new Date().toISOString()
  });
};

export const logTimelineAccess = (userId: string, viewType: string, filters?: Record<string, any>) => {
  return auditLogger.logTimelineView(userId, 'view', {
    view_type: viewType,
    filters,
    timestamp: new Date().toISOString()
  });
};
