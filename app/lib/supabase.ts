import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for onboarding
export const saveOnboardingData = async (userId: string, onboardingData: any) => {
  const { data, error } = await supabase
    .from('onboarding_data')
    .upsert({
      user_id: userId,
      personal_information: onboardingData.personalInformation,
      user_role: onboardingData.userRole,
      medical_information: onboardingData.medicalInformation,
      caregiver_consent: onboardingData.caregiverConsent,
      required_consents: onboardingData.requiredConsents,
      is_complete: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }

  return data;
};

export const updateUserOnboardingStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error updating user onboarding status:', error);
    throw error;
  }

  return data;
};

export const getUserOnboardingStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('onboarding_complete')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error getting user onboarding status:', error);
    return false;
  }

  return data?.onboarding_complete || false;
};
