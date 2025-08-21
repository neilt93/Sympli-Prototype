'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoleSelection from '../components/onboarding/RoleSelection';
import PersonalInformation from '../components/onboarding/PersonalInformation';
import MedicalInformation from '../components/onboarding/MedicalInformation';
import CaregiverConsent from '../components/onboarding/CaregiverConsent';
import DataProtection from '../components/onboarding/DataProtection';
import RequiredConsents from '../components/onboarding/RequiredConsents';
import OnboardingProgress from '../components/onboarding/OnboardingProgress';
import { OnboardingData, OnboardingStep, UserRole } from '../types/onboarding';

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    isComplete: false,
    isRequired: true
  },
  {
    id: 'role',
    title: 'Choose Your Role',
    description: 'Select whether you\'re tracking for yourself or as a caregiver',
    isComplete: false,
    isRequired: true
  },
  {
    id: 'medical',
    title: 'Medical Information',
    description: 'Provide basic health information for personalized insights',
    isComplete: false,
    isRequired: true
  },
  {
    id: 'caregiver',
    title: 'Caregiver Consent',
    description: 'Complete consent process for logging on behalf of others',
    isComplete: false,
    isRequired: false
  },
  {
    id: 'data-protection',
    title: 'Data Protection',
    description: 'Learn about how we protect your privacy',
    isComplete: false,
    isRequired: true
  },
  {
    id: 'consents',
    title: 'Required Consents',
    description: 'Review and agree to terms of service',
    isComplete: false,
    isRequired: true
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checking authentication for onboarding page...');
      
      // Force logout on server restart - check if this is a fresh session
      const sessionStartTime = localStorage.getItem('sessionStartTime');
      const currentTime = Date.now();
      
      if (!sessionStartTime) {
        // First time accessing, set session start time
        localStorage.setItem('sessionStartTime', currentTime.toString());
      } else {
        // Check if session is older than 1 hour (server restart scenario)
        const sessionAge = currentTime - parseInt(sessionStartTime);
        if (sessionAge > 3600000) { // 1 hour in milliseconds
          console.log('🔄 Session expired (likely server restart), forcing logout');
          localStorage.clear();
          router.push('/auth');
          return;
        }
      }
      
      // Force clear any existing auth state if accessing directly
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('forceAuth') === 'true') {
        console.log('🔄 Force clearing auth state due to forceAuth parameter');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('onboardingData');
        router.push('/auth');
        return;
      }
      
      // Force logout if accessing onboarding directly without proper flow
      if (urlParams.get('logout') === 'true') {
        console.log('🔄 Force logout requested');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('onboardingData');
        router.push('/auth');
        return;
      }
      
      const token = localStorage.getItem('authToken');
      console.log('Token found:', !!token);
      
      if (!token) {
        console.log('❌ No token found, redirecting to auth');
        // No token found, redirect to auth
        router.push('/auth');
        return;
      }

      try {
        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.log('❌ Token verification failed, clearing storage and redirecting to auth');
          // Token is invalid, clear storage and redirect to auth
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          router.push('/auth');
          return;
        }

        // Token is valid, check if onboarding is already complete
        const userData = await response.json();
        console.log('✅ Token verified, user data:', userData);
        console.log('🔍 Onboarding complete status:', userData.user?.onboarding_complete);
        console.log('🔍 Full user data object:', JSON.stringify(userData, null, 2));
        
        if (userData.user?.onboarding_complete) {
          console.log('✅ Onboarding already complete, redirecting to symptoms');
          // User has already completed onboarding, redirect to main app
          router.push('/symptoms');
          return;
        }

        console.log('✅ User authenticated and needs onboarding, showing onboarding page');
        // User is authenticated and needs onboarding
        setIsLoading(false);
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Clear storage and redirect to auth on error
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/auth');
      }
    };

    checkAuth();
  }, []); // Remove router dependency to prevent re-runs

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    personalInformation: {
      fullName: '',
      dateOfBirth: ''
    },
    userRole: 'myself',
    medicalInformation: {
      age: null,
      sexAssignedAtBirth: null,
      chronicConditions: [],
      currentMedications: [],
      allergiesAndReactions: []
    },
    caregiverConsent: {
      patientFullName: '',
      relationship: '',
      consentMethod: 'voice',
      hasConsent: false,
      additionalNotes: '',
      takesResponsibility: false,
      patientAwareOfDataSharing: false
    },
    requiredConsents: {
      understandsNotDiagnostic: false,
      consentsToStorage: false,
      consentsToSummaryGeneration: false,
      allowsResearchParticipation: false
    },
    isComplete: false
  });

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const updateStepCompletion = (stepId: string, isComplete: boolean) => {
    const updatedSteps = ONBOARDING_STEPS.map(step => 
      step.id === stepId ? { ...step, isComplete } : step
    );
    
    // Update the steps array (in a real app, you might want to persist this)
    ONBOARDING_STEPS.splice(0, ONBOARDING_STEPS.length, ...updatedSteps);
    
    // Debug logging
    console.log(`Step ${stepId} marked as ${isComplete ? 'complete' : 'incomplete'}`);
    console.log('Updated steps:', ONBOARDING_STEPS);
  };

  const handleNext = async () => {
    console.log('handleNext called, currentStep:', currentStep, 'total steps:', ONBOARDING_STEPS.length);
    
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      console.log('Moving to next step:', currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else {
      console.log('Completing onboarding...');
      // Complete onboarding
      try {
        const completedData = { ...onboardingData, isComplete: true };
        setOnboardingData(completedData);
        
        console.log('Submitting onboarding data to API...');
        
        try {
          // Submit to API
          const response = await fetch('/api/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify(completedData),
          });

          if (response.ok) {
            console.log('Onboarding data submitted successfully to API');
          } else {
            console.warn('API submission failed, but continuing with localStorage');
          }
        } catch (error) {
          console.warn('API submission error, but continuing with localStorage:', error);
        }
        
        // Save to localStorage as backup
        localStorage.setItem('onboardingData', JSON.stringify(completedData));
        
        // Update user data to mark onboarding as complete
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userData.onboarding_complete = true;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Ensure auth token is still valid
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.error('No auth token found after onboarding completion');
          router.push('/auth');
          return;
        }
        
        console.log('User data updated, auth token verified, redirecting to symptoms...');
        // Redirect to symptoms page (main app)
        router.push('/symptoms');
      } catch (error) {
        console.error('Error completing onboarding:', error);
        // You could add error handling UI here
        // For now, still redirect to symptoms but log the error
        router.push('/symptoms');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const currentStepData = ONBOARDING_STEPS[currentStep];
    
    switch (currentStepData.id) {
      case 'personal':
        return onboardingData.personalInformation && 
               onboardingData.personalInformation.fullName &&
               onboardingData.personalInformation.dateOfBirth;
      case 'role':
        return onboardingData.userRole !== null;
      case 'medical':
        return onboardingData.medicalInformation.age !== null && 
               onboardingData.medicalInformation.sexAssignedAtBirth !== null;
      case 'caregiver':
        if (onboardingData.userRole === 'caregiver') {
          return onboardingData.caregiverConsent && 
                 onboardingData.caregiverConsent.patientFullName &&
                 onboardingData.caregiverConsent.relationship &&
                 onboardingData.caregiverConsent.hasConsent &&
                 onboardingData.caregiverConsent.takesResponsibility &&
                 onboardingData.caregiverConsent.patientAwareOfDataSharing;
        }
        return true; // Skip validation for non-caregivers
      case 'data-protection':
        return true; // Just informational
      case 'consents':
        return onboardingData.requiredConsents.understandsNotDiagnostic &&
               onboardingData.requiredConsents.consentsToStorage &&
               onboardingData.requiredConsents.consentsToSummaryGeneration;
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (ONBOARDING_STEPS[currentStep].id) {
      case 'personal':
        return (
          <PersonalInformation
            data={onboardingData.personalInformation}
            onUpdate={(data) => {
              setOnboardingData(prev => ({ ...prev, personalInformation: data }));
              updateStepCompletion('personal', true);
            }}
          />
        );
      case 'role':
        return (
          <RoleSelection
            userRole={onboardingData.userRole}
            onRoleSelect={(role: UserRole) => {
              setOnboardingData(prev => ({ ...prev, userRole: role }));
              updateStepCompletion('role', true);
            }}
          />
        );
      case 'medical':
        return (
          <MedicalInformation
            data={onboardingData.medicalInformation}
            onUpdate={(data) => {
              setOnboardingData(prev => ({ ...prev, medicalInformation: data }));
              updateStepCompletion('medical', true);
            }}
          />
        );
      case 'caregiver':
        console.log('🔍 Caregiver step - userRole:', onboardingData.userRole);
        console.log('🔍 Caregiver step - caregiverConsent:', onboardingData.caregiverConsent);
        if (onboardingData.userRole === 'caregiver') {
          return (
            <CaregiverConsent
              data={onboardingData.caregiverConsent}
              onUpdate={(data) => {
                setOnboardingData(prev => ({ ...prev, caregiverConsent: data }));
                updateStepCompletion('caregiver', true);
              }}
            />
          );
        } else {
          // Show a message for non-caregivers and auto-advance
          return (
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Caregiver Consent</h2>
              <p className="text-gray-600">
                Since you're logging symptoms for yourself, you can skip this step.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => {
                    updateStepCompletion('caregiver', true);
                    setCurrentStep(currentStep + 1);
                  }}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          );
        }
      case 'data-protection':
        return (
          <DataProtection
            onComplete={() => {
              updateStepCompletion('data-protection', true);
            }}
          />
        );
      case 'consents':
        return (
          <RequiredConsents
            data={onboardingData.requiredConsents}
            onUpdate={(data) => {
              setOnboardingData(prev => ({ ...prev, requiredConsents: data }));
              updateStepCompletion('consents', true);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Sympli</h1>
          <p className="text-gray-600">Let's get you set up for better health tracking</p>
        </div>

        <OnboardingProgress 
          steps={ONBOARDING_STEPS}
          currentStep={currentStep}
        />

        <div className="mt-8">
          {renderCurrentStep()}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              canProceed()
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
