export type UserRole = 'myself' | 'caregiver';

export interface PersonalInformation {
  fullName: string;
  dateOfBirth: string;
}

export interface MedicalInformation {
  age: number | null;
  sexAssignedAtBirth: string | null;
  chronicConditions: string[];
  currentMedications: string[];
  allergiesAndReactions: string[];
}

export interface CaregiverConsent {
  patientFullName: string;
  relationship: string;
  consentMethod: 'voice' | 'text';
  hasConsent: boolean;
  additionalNotes?: string;
  takesResponsibility: boolean;
  patientAwareOfDataSharing: boolean;
}

export interface RequiredConsents {
  understandsNotDiagnostic: boolean;
  consentsToStorage: boolean;
  consentsToSummaryGeneration: boolean;
  allowsResearchParticipation: boolean;
}

export interface OnboardingData {
  personalInformation: PersonalInformation;
  userRole: UserRole;
  medicalInformation: MedicalInformation;
  caregiverConsent?: CaregiverConsent;
  requiredConsents: RequiredConsents;
  isComplete: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isRequired: boolean;
}
