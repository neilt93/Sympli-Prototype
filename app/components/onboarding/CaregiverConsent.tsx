import { useState } from 'react';
import { CaregiverConsent as CaregiverConsentType } from '../../types/onboarding';

interface CaregiverConsentProps {
  data?: CaregiverConsentType;
  onUpdate: (data: CaregiverConsentType) => void;
}

export default function CaregiverConsent({ data, onUpdate }: CaregiverConsentProps) {
  const [localData, setLocalData] = useState<CaregiverConsentType>(data || {
    patientFullName: '',
    relationship: '',
    consentMethod: 'text',
    hasConsent: false,
    additionalNotes: '',
    takesResponsibility: false,
    patientAwareOfDataSharing: false
  });

  const handleInputChange = (field: keyof CaregiverConsentType, value: any) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  // Check if all required fields are completed
  const isComplete = localData.patientFullName && 
                    localData.relationship && 
                    localData.hasConsent && 
                    localData.takesResponsibility && 
                    localData.patientAwareOfDataSharing;

  const relationshipOptions = [
    'Spouse/Partner',
    'Parent',
    'Child',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Other Family Member',
    'Friend',
    'Professional Caregiver',
    'Other'
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Caregiver Consent Setup</h2>
        <p className="text-gray-600">We need proper consent to log symptoms for someone else.</p>
      </div>

      {/* Patient Information */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
        </div>
        <p className="text-gray-600 text-sm">Tell us who you're caring for.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient's Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={localData.patientFullName}
              onChange={(e) => handleInputChange('patientFullName', e.target.value)}
              placeholder="Enter the patient's full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Relationship <span className="text-red-500">*</span>
            </label>
            <select
              value={localData.relationship}
              onChange={(e) => handleInputChange('relationship', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select your relationship</option>
              {relationshipOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Consent Method */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Consent Method</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              localData.consentMethod === 'voice'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => handleInputChange('consentMethod', 'voice')}
          >
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                localData.consentMethod === 'voice' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Voice Recording</h4>
              <p className="text-sm text-gray-600">Record verbal consent</p>
            </div>
          </div>
          
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              localData.consentMethod === 'text'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => handleInputChange('consentMethod', 'text')}
          >
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                localData.consentMethod === 'text' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Text Confirmation</h4>
              <p className="text-sm text-gray-600">Confirm written consent</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-start">
          <input
            type="checkbox"
            id="hasConsent"
            checked={localData.hasConsent}
            onChange={(e) => handleInputChange('hasConsent', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
          />
          <label htmlFor="hasConsent" className="ml-2 text-sm text-gray-700">
            I confirm I've received written or verbal consent from this person
          </label>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Additional Notes (Optional)</h3>
        </div>
        <textarea
          value={localData.additionalNotes}
          onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
          placeholder="E.g., signed consent form, verbal agreement details..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Final Confirmations */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Final Confirmations</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="takesResponsibility"
              checked={localData.takesResponsibility}
              onChange={(e) => handleInputChange('takesResponsibility', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
            <label htmlFor="takesResponsibility" className="ml-2 text-sm text-gray-700">
              I take full responsibility for logging on behalf of {localData.patientFullName || '[Patient Name]'}
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="patientAwareOfDataSharing"
              checked={localData.patientAwareOfDataSharing}
              onChange={(e) => handleInputChange('patientAwareOfDataSharing', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
            <label htmlFor="patientAwareOfDataSharing" className="ml-2 text-sm text-gray-700">
              I confirm this person is aware that health summaries will be generated and possibly shared with their GP
            </label>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center pt-4">
        {isComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-700 font-medium">
                All required fields completed! You can continue.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Please complete all required fields marked with <span className="text-red-500">*</span> to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

