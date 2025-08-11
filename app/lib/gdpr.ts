import { supabase } from './supabase';

// GDPR Consent Types
export type ConsentType = 'gdpr' | 'health_data' | 'research' | 'marketing';

// GDPR Request Types
export type DataSubjectRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';

// GDPR Consent Record Interface
export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  consent_version: string;
  consent_given: boolean;
  consent_given_at: string;
  consent_withdrawn_at?: string;
  consent_ip_address?: string;
  consent_user_agent?: string;
  consent_method?: string;
  consent_details?: any;
}

// Data Subject Request Interface
export interface DataSubjectRequest {
  id: string;
  user_id: string;
  request_type: DataSubjectRequestType;
  request_status: 'pending' | 'processing' | 'completed' | 'rejected';
  request_details?: any;
  requested_at: string;
  completed_at?: string;
  response_data?: any;
  rejection_reason?: string;
}

// GDPR Helper Functions
export class GDPRHelper {
  /**
   * Record user consent
   */
  static async recordConsent(
    userId: string,
    consentType: ConsentType,
    consentVersion: string,
    consentGiven: boolean,
    ipAddress?: string,
    userAgent?: string,
    consentMethod: string = 'web_form',
    consentDetails?: any
  ): Promise<ConsentRecord | null> {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .insert({
          user_id: userId,
          consent_type: consentType,
          consent_version: consentVersion,
          consent_given: consentGiven,
          consent_ip_address: ipAddress,
          consent_user_agent: userAgent,
          consent_method: consentMethod,
          consent_details: consentDetails
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording consent:', error);
        return null;
      }

      // Update user's GDPR consent status
      if (consentType === 'gdpr' && consentGiven) {
        await supabase
          .from('users')
          .update({
            gdpr_consent_given_at: new Date().toISOString(),
            gdpr_consent_version: consentVersion,
            gdpr_consent_ip_address: ipAddress,
            gdpr_consent_user_agent: userAgent
          })
          .eq('id', userId);
      }

      return data;
    } catch (error) {
      console.error('Error recording consent:', error);
      return null;
    }
  }

  /**
   * Withdraw user consent
   */
  static async withdrawConsent(
    userId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('consent_records')
        .update({
          consent_withdrawn_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .is('consent_withdrawn_at', null);

      if (error) {
        console.error('Error withdrawing consent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      return false;
    }
  }

  /**
   * Submit a data subject request
   */
  static async submitDataSubjectRequest(
    userId: string,
    requestType: DataSubjectRequestType,
    requestDetails?: any
  ): Promise<DataSubjectRequest | null> {
    try {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .insert({
          user_id: userId,
          request_type: requestType,
          request_status: 'pending',
          request_details: requestDetails
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting data subject request:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error submitting data subject request:', error);
      return null;
    }
  }

  /**
   * Request data export (Right to Data Portability)
   */
  static async requestDataExport(userId: string): Promise<boolean> {
    try {
      // Submit the request
      const request = await this.submitDataSubjectRequest(userId, 'portability', {
        requested_at: new Date().toISOString()
      });

      if (!request) {
        return false;
      }

      // Update user's export request timestamp
      await supabase
        .from('users')
        .update({
          data_export_requested_at: new Date().toISOString()
        })
        .eq('id', userId);

      return true;
    } catch (error) {
      console.error('Error requesting data export:', error);
      return false;
    }
  }

  /**
   * Request data deletion (Right to be Forgotten)
   */
  static async requestDataDeletion(userId: string): Promise<boolean> {
    try {
      // Submit the request
      const request = await this.submitDataSubjectRequest(userId, 'erasure', {
        requested_at: new Date().toISOString()
      });

      if (!request) {
        return false;
      }

      // Update user's deletion request timestamp
      await supabase
        .from('users')
        .update({
          data_deletion_requested_at: new Date().toISOString()
        })
        .eq('id', userId);

      return true;
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      return false;
    }
  }

  /**
   * Get user's consent history
   */
  static async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting consent history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting consent history:', error);
      return [];
    }
  }

  /**
   * Get user's data subject requests
   */
  static async getDataSubjectRequests(userId: string): Promise<DataSubjectRequest[]> {
    try {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error getting data subject requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting data subject requests:', error);
      return [];
    }
  }

  /**
   * Check if user has given GDPR consent
   */
  static async hasGDPRConsent(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('gdpr_consent_given_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking GDPR consent:', error);
        return false;
      }

      return !!data?.gdpr_consent_given_at;
    } catch (error) {
      console.error('Error checking GDPR consent:', error);
      return false;
    }
  }

  /**
   * Get user's personal data (Right of Access)
   */
  static async getUserPersonalData(userId: string): Promise<any> {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error getting user data:', userError);
        return null;
      }

      // Get symptom logs
      const { data: symptomData, error: symptomError } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', userId);

      if (symptomError) {
        console.error('Error getting symptom data:', symptomError);
      }

      // Get onboarding data
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('onboarding_data')
        .select('*')
        .eq('user_id', userId);

      if (onboardingError) {
        console.error('Error getting onboarding data:', onboardingError);
      }

      // Get consent records
      const { data: consentData, error: consentError } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId);

      if (consentError) {
        console.error('Error getting consent data:', consentError);
      }

      return {
        user: userData,
        symptoms: symptomData || [],
        onboarding: onboardingData || [],
        consents: consentData || [],
        exported_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting user personal data:', error);
      return null;
    }
  }
}

// GDPR Consent Versions
export const GDPR_CONSENT_VERSIONS = {
  GDPR_CONSENT: '1.0',
  HEALTH_DATA_CONSENT: '1.0',
  RESEARCH_CONSENT: '1.0',
  MARKETING_CONSENT: '1.0'
} as const;

// GDPR Data Retention Periods (in days)
export const GDPR_RETENTION_PERIODS = {
  SYMPTOM_LOGS: 2555, // 7 years for health data
  ONBOARDING_DATA: 2555, // 7 years for health data
  AUDIT_LOGS: 2190, // 6 years for legal compliance
  CONSENT_RECORDS: 2555 // 7 years for legal compliance
} as const;
