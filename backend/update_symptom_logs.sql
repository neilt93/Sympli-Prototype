-- ============================================
-- Sympli Health – Database Update Script
-- Safe migration to add new columns to existing tables
-- ============================================

-- Add missing columns to existing symptom_logs table
ALTER TABLE public.symptom_logs 
ADD COLUMN IF NOT EXISTS symptom_type varchar(50),
ADD COLUMN IF NOT EXISTS symptom_name varchar(255),
ADD COLUMN IF NOT EXISTS is_new boolean,
ADD COLUMN IF NOT EXISTS severity_scale integer,
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS frequency text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS onset_time text,
ADD COLUMN IF NOT EXISTS character_description text,
ADD COLUMN IF NOT EXISTS radiation text,
ADD COLUMN IF NOT EXISTS associated_symptoms text,
ADD COLUMN IF NOT EXISTS time_course text,
ADD COLUMN IF NOT EXISTS exacerbating_factors text,
ADD COLUMN IF NOT EXISTS functional_impact text,
ADD COLUMN IF NOT EXISTS emotional_impact text,
ADD COLUMN IF NOT EXISTS triggers text,
ADD COLUMN IF NOT EXISTS patterns text,
ADD COLUMN IF NOT EXISTS treatment_response text,
ADD COLUMN IF NOT EXISTS progress_description text,
ADD COLUMN IF NOT EXISTS additional_context jsonb,
ADD COLUMN IF NOT EXISTS extracted_entities jsonb,
ADD COLUMN IF NOT EXISTS symptom_signature text;

-- Create new indexes for better performance
CREATE INDEX IF NOT EXISTS idx_symptom_logs_type ON public.symptom_logs(symptom_type);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_name ON public.symptom_logs(symptom_name);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_is_new ON public.symptom_logs(is_new);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_severity ON public.symptom_logs(severity_scale);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_type_name ON public.symptom_logs(user_id, symptom_type, symptom_name);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_signature ON public.symptom_logs(user_id, symptom_type, symptom_signature);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_entities_gin ON public.symptom_logs USING GIN ((extracted_entities));

-- Update the anonymization function to handle new fields
CREATE OR REPLACE FUNCTION public.anonymize_user_data(user_uuid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- users
  UPDATE public.users SET
    email = 'anonymized_' || id || '@deleted.com',
    full_name = 'Anonymized User',
    profile = COALESCE(profile, '{}'::jsonb) || '{"anonymized": true}'::jsonb,
    is_anonymized = true,
    anonymized_at = now()
  WHERE id = user_uuid;

  -- symptom_logs
  UPDATE public.symptom_logs SET
    symptom_data = COALESCE(symptom_data, '{}'::jsonb) || '{"anonymized": true}'::jsonb,
    description = 'Anonymized',
    location = 'Anonymized',
    onset_time = 'Anonymized',
    character_description = 'Anonymized',
    radiation = 'Anonymized',
    associated_symptoms = 'Anonymized',
    time_course = 'Anonymized',
    exacerbating_factors = 'Anonymized',
    functional_impact = 'Anonymized',
    emotional_impact = 'Anonymized',
    triggers = 'Anonymized',
    patterns = 'Anonymized',
    treatment_response = 'Anonymized',
    progress_description = 'Anonymized',
    is_anonymized = true,
    anonymized_at = now()
  WHERE user_id = user_uuid;

  -- onboarding_data
  UPDATE public.onboarding_data SET
    personal_information = COALESCE(personal_information, '{}'::jsonb) || '{"anonymized": true}'::jsonb,
    medical_information  = COALESCE(medical_information,  '{}'::jsonb) || '{"anonymized": true}'::jsonb,
    is_anonymized = true,
    anonymized_at = now()
  WHERE user_id = user_uuid;

  -- audit_logs
  UPDATE public.audit_logs SET
    ip_address = null,
    user_agent = 'Anonymized',
    is_anonymized = true,
    anonymized_at = now()
  WHERE user_id = user_uuid;
END
$$;

-- Function to get similar symptoms for a user
CREATE OR REPLACE FUNCTION public.get_similar_symptoms(
  user_uuid uuid,
  symptom_type_param varchar(50),
  symptom_name_param varchar(255),
  limit_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  symptom_type varchar(50),
  symptom_name varchar(255),
  is_new boolean,
  severity_scale integer,
  description text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.symptom_type,
    sl.symptom_name,
    sl.is_new,
    sl.severity_scale,
    sl.description,
    sl.created_at
  FROM public.symptom_logs sl
  WHERE sl.user_id = user_uuid
    AND sl.symptom_type = symptom_type_param
    AND sl.symptom_name ILIKE '%' || symptom_name_param || '%'
    AND sl.is_anonymized = false
  ORDER BY sl.created_at DESC
  LIMIT limit_count;
END
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.anonymize_user_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_similar_symptoms(uuid, varchar, varchar, integer) TO authenticated;

-- Update existing symptom logs to have default values for new columns
UPDATE public.symptom_logs 
SET 
  symptom_type = COALESCE(symptom_type, 'other'),
  symptom_name = COALESCE(symptom_name, 'Unknown Symptom'),
  is_new = COALESCE(is_new, true),
  severity_scale = COALESCE(severity_scale, 5)
WHERE symptom_type IS NULL OR symptom_name IS NULL OR is_new IS NULL OR severity_scale IS NULL;

-- Success message
SELECT 'Database update completed successfully! New columns added to symptom_logs table.' as status;
