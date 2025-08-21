import { createClient } from '@supabase/supabase-js';
import { auditLogger } from './audit-logger';

// Check if Supabase environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create Supabase client if environment variables are available
let supabaseService: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseService = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️ Supabase environment variables not configured. Data retention will use fallback mode.');
}

export interface RetentionPolicy {
  dataType: 'user_profile' | 'symptom_log' | 'audit_log' | 'consent_record' | 'backup_data';
  retentionPeriod: number; // in days
  action: 'anonymize' | 'delete' | 'archive';
  description: string;
  gdprArticle: string;
  nhsRequirement: string;
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataType: 'user_profile',
    retentionPeriod: 730, // 2 years
    action: 'anonymize',
    description: 'User profiles are anonymized after 2 years of inactivity',
    gdprArticle: 'Article 5(1)(e) - Storage limitation',
    nhsRequirement: 'NHS DSPT 1.1 - Personal confidential data is handled and stored securely'
  },
  {
    dataType: 'symptom_log',
    retentionPeriod: 2555, // 7 years (medical records standard)
    action: 'archive',
    description: 'Symptom logs are archived after 7 years for medical record compliance',
    gdprArticle: 'Article 9(2)(h) - Healthcare provision',
    nhsRequirement: 'NHS Records Management Code of Practice'
  },
  {
    dataType: 'audit_log',
    retentionPeriod: 2555, // 7 years
    action: 'delete',
    description: 'Audit logs are deleted after 7 years for compliance',
    gdprArticle: 'Article 30 - Records of processing activities',
    nhsRequirement: 'NHS DSPT 1.4 - Personal confidential data is disposed of securely'
  },
  {
    dataType: 'consent_record',
    retentionPeriod: 2555, // 7 years
    action: 'archive',
    description: 'Consent records are archived for 7 years as proof of compliance',
    gdprArticle: 'Article 7 - Conditions for consent',
    nhsRequirement: 'NHS DSPT 2.1 - Staff are aware of their responsibilities'
  },
  {
    dataType: 'backup_data',
    retentionPeriod: 30, // 30 days
    action: 'delete',
    description: 'Backup data is deleted after 30 days',
    gdprArticle: 'Article 5(1)(e) - Storage limitation',
    nhsRequirement: 'NHS DSPT 1.4 - Personal confidential data is disposed of securely'
  }
];

export class DataRetentionManager {
  private static instance: DataRetentionManager;

  private constructor() {}

  public static getInstance(): DataRetentionManager {
    if (!DataRetentionManager.instance) {
      DataRetentionManager.instance = new DataRetentionManager();
    }
    return DataRetentionManager.instance;
  }

  // Check for data that needs retention action
  public async checkRetentionRequirements(): Promise<{
    userProfiles: string[];
    symptomLogs: string[];
    auditLogs: string[];
    consentRecords: string[];
    backupData: string[];
  }> {
    const now = new Date();
    const results = {
      userProfiles: [] as string[],
      symptomLogs: [] as string[],
      auditLogs: [] as string[],
      consentRecords: [] as string[],
      backupData: [] as string[]
    };

    try {
      // Check user profiles (inactive for 2+ years)
      if (supabaseService) {
        const userProfilePolicy = RETENTION_POLICIES.find(p => p.dataType === 'user_profile')!;
        const userProfileCutoff = new Date(now.getTime() - userProfilePolicy.retentionPeriod * 24 * 60 * 60 * 1000);
        
        const { data: inactiveUsers } = await supabaseService
          .from('users')
          .select('id')
          .lt('last_login', userProfileCutoff.toISOString())
          .eq('is_active', true);

        if (inactiveUsers) {
          results.userProfiles = inactiveUsers.map(u => u.id);
        }
      }

      // Check symptom logs (older than 7 years)
      if (supabaseService) {
        const symptomLogPolicy = RETENTION_POLICIES.find(p => p.dataType === 'symptom_log')!;
        const symptomLogCutoff = new Date(now.getTime() - symptomLogPolicy.retentionPeriod * 24 * 60 * 60 * 1000);
        
        const { data: oldSymptomLogs } = await supabaseService
          .from('symptom_logs')
          .select('id')
          .lt('created_at', symptomLogCutoff.toISOString())
          .eq('is_archived', false);

        if (oldSymptomLogs) {
          results.symptomLogs = oldSymptomLogs.map(l => l.id);
        }
      }

      // Check audit logs (older than 7 years)
      if (supabaseService) {
        const auditLogPolicy = RETENTION_POLICIES.find(p => p.dataType === 'audit_log')!;
        const auditLogCutoff = new Date(now.getTime() - auditLogPolicy.retentionPeriod * 24 * 60 * 60 * 1000);
        
        const { data: oldAuditLogs } = await supabaseService
          .from('audit_logs')
          .select('id')
          .lt('timestamp', auditLogCutoff.toISOString());

        if (oldAuditLogs) {
          results.auditLogs = oldAuditLogs.map(l => l.id);
        }
      }

      // Check consent records (older than 7 years)
      if (supabaseService) {
        const consentPolicy = RETENTION_POLICIES.find(p => p.dataType === 'consent_record')!;
        const consentCutoff = new Date(now.getTime() - consentPolicy.retentionPeriod * 24 * 60 * 60 * 1000);
        
        const { data: oldConsentRecords } = await supabaseService
          .from('consent_records')
          .select('id')
          .lt('created_at', consentCutoff.toISOString())
          .eq('is_archived', false);

        if (oldConsentRecords) {
          results.consentRecords = oldConsentRecords.map(c => c.id);
        }
      }

      // Check backup data (older than 30 days)
      if (supabaseService) {
        const backupPolicy = RETENTION_POLICIES.find(p => p.dataType === 'backup_data')!;
        const backupCutoff = new Date(now.getTime() - backupPolicy.retentionPeriod * 24 * 60 * 60 * 1000);
        
        const { data: oldBackupData } = await supabaseService
          .from('backup_data')
          .select('id')
          .lt('created_at', backupCutoff.toISOString());

        if (oldBackupData) {
          results.backupData = oldBackupData.map(b => b.id);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to check retention requirements:', error);
      return results;
    }
  }

  // Anonymize user profile data
  public async anonymizeUserProfile(userId: string): Promise<boolean> {
    try {
      if (!supabaseService) {
        console.warn('⚠️ Supabase not available. User anonymization skipped.');
        return false;
      }

      const { error } = await supabaseService
        .from('users')
        .update({
          full_name: '[ANONYMIZED]',
          email: `anonymized_${userId}@deleted.local`,
          date_of_birth: null,
          phone_number: null,
          is_active: false,
          anonymized_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to anonymize user: ${error.message}`);
      }

      // Log the anonymization
      await auditLogger.logUserProfile(userId, 'anonymize', {
        timestamp: new Date().toISOString(),
        reason: 'retention_policy',
        policy: 'user_profile_2_years'
      });

      console.log(`✅ User profile anonymized: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to anonymize user profile:', error);
      return false;
    }
  }

  // Archive symptom logs
  public async archiveSymptomLogs(logIds: string[]): Promise<boolean> {
    try {
      if (!supabaseService) {
        console.warn('⚠️ Supabase not available. Symptom log archiving skipped.');
        return false;
      }

      const { error } = await supabaseService
        .from('symptom_logs')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archive_reason: 'retention_policy_7_years'
        })
        .in('id', logIds);

      if (error) {
        throw new Error(`Failed to archive symptom logs: ${error.message}`);
      }

      // Log the archiving
      for (const logId of logIds) {
        await auditLogger.logSymptomLog('system', 'archive', logId, {
          timestamp: new Date().toISOString(),
          reason: 'retention_policy',
          policy: 'symptom_log_7_years'
        });
      }

      console.log(`✅ Archived ${logIds.length} symptom logs`);
      return true;
    } catch (error) {
      console.error('❌ Failed to archive symptom logs:', error);
      return false;
    }
  }

  // Delete audit logs
  public async deleteAuditLogs(logIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabaseService
        .from('audit_logs')
        .delete()
        .in('id', logIds);

      if (error) {
        throw new Error(`Failed to delete audit logs: ${error.message}`);
      }

      console.log(`✅ Deleted ${logIds.length} audit logs`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete audit logs:', error);
      return false;
    }
  }

  // Archive consent records
  public async archiveConsentRecords(recordIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabaseService
        .from('consent_records')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archive_reason: 'retention_policy_7_years'
        })
        .in('id', recordIds);

      if (error) {
        throw new Error(`Failed to archive consent records: ${error.message}`);
      }

      // Log the archiving
      for (const recordId of recordIds) {
        await auditLogger.logConsent('system', 'archive', 'consent_record', {
          record_id: recordId,
          timestamp: new Date().toISOString(),
          reason: 'retention_policy',
          policy: 'consent_record_7_years'
        });
      }

      console.log(`✅ Archived ${recordIds.length} consent records`);
      return true;
    } catch (error) {
      console.error('❌ Failed to archive consent records:', error);
      return false;
    }
  }

  // Delete backup data
  public async deleteBackupData(backupIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabaseService
        .from('backup_data')
        .delete()
        .in('id', backupIds);

      if (error) {
        throw new Error(`Failed to delete backup data: ${error.message}`);
      }

      console.log(`✅ Deleted ${backupIds.length} backup records`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete backup data:', error);
      return false;
    }
  }

  // Execute retention policy for all data types
  public async executeRetentionPolicy(): Promise<{
    success: boolean;
    summary: Record<string, number>;
    errors: string[];
  }> {
    const summary: Record<string, number> = {};
    const errors: string[] = [];

    try {
      console.log('🔄 Starting data retention policy execution...');
      
      const requirements = await this.checkRetentionRequirements();
      
      // Process user profiles
      if (requirements.userProfiles.length > 0) {
        for (const userId of requirements.userProfiles) {
          const success = await this.anonymizeUserProfile(userId);
          if (success) {
            summary.userProfiles = (summary.userProfiles || 0) + 1;
          } else {
            errors.push(`Failed to anonymize user: ${userId}`);
          }
        }
      }

      // Process symptom logs
      if (requirements.symptomLogs.length > 0) {
        const success = await this.archiveSymptomLogs(requirements.symptomLogs);
        if (success) {
          summary.symptomLogs = requirements.symptomLogs.length;
        } else {
          errors.push('Failed to archive symptom logs');
        }
      }

      // Process audit logs
      if (requirements.auditLogs.length > 0) {
        const success = await this.deleteAuditLogs(requirements.auditLogs);
        if (success) {
          summary.auditLogs = requirements.auditLogs.length;
        } else {
          errors.push('Failed to delete audit logs');
        }
      }

      // Process consent records
      if (requirements.consentRecords.length > 0) {
        const success = await this.archiveConsentRecords(requirements.consentRecords);
        if (success) {
          summary.consentRecords = requirements.consentRecords.length;
        } else {
          errors.push('Failed to archive consent records');
        }
      }

      // Process backup data
      if (requirements.backupData.length > 0) {
        const success = await this.deleteBackupData(requirements.backupData);
        if (success) {
          summary.backupData = requirements.backupData.length;
        } else {
          errors.push('Failed to delete backup data');
        }
      }

      console.log('✅ Data retention policy execution completed');
      return {
        success: errors.length === 0,
        summary,
        errors
      };
    } catch (error) {
      console.error('❌ Data retention policy execution failed:', error);
      return {
        success: false,
        summary: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Get retention policy information
  public getRetentionPolicyInfo(): RetentionPolicy[] {
    return RETENTION_POLICIES;
  }
}

export const dataRetentionManager = DataRetentionManager.getInstance();
