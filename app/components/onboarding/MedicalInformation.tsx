import { useState } from 'react';
import { MedicalInformation as MedicalInfo } from '../../types/onboarding';

interface MedicalInformationProps {
  data: MedicalInfo;
  onUpdate: (data: MedicalInfo) => void;
}

export default function MedicalInformation({ data, onUpdate }: MedicalInformationProps) {
  const [localData, setLocalData] = useState<MedicalInfo>(data);

  const handleInputChange = (field: keyof MedicalInfo, value: any) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  const handleArrayFieldChange = (field: keyof MedicalInfo, value: string, action: 'add' | 'remove') => {
    const currentArray = localData[field] as string[];
    let updatedArray: string[];
    
    if (action === 'add') {
      if (value.trim()) {
        updatedArray = [...currentArray, value.trim()];
      } else {
        return;
      }
    } else {
      updatedArray = currentArray.filter(item => item !== value);
    }
    
    const updatedData = { ...localData, [field]: updatedArray };
    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  const renderArrayInput = (
    field: keyof MedicalInfo,
    label: string,
    placeholder: string,
    guide: React.ReactNode
  ) => {
    const items = localData[field] as string[];
    
    return (
      <div className="space-y-3">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
        </div>
        <p className="text-gray-600 text-sm">Include {label.toLowerCase()} for better health insights.</p>
        
        {guide}
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                handleArrayFieldChange(field, target.value, 'add');
                target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              handleArrayFieldChange(field, input.value, 'add');
              input.value = '';
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
        
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleArrayFieldChange(field, item, 'remove')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical Information</h2>
        <p className="text-gray-600">Help us provide better health summaries and insights.</p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        </div>
        <p className="text-gray-600 text-sm">This helps us provide age and sex-appropriate health insights.</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <input
              type="number"
              min="0"
              max="120"
              value={localData.age || ''}
              onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Enter your age"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sex Assigned at Birth</label>
            <select
              value={localData.sexAssignedAtBirth || ''}
              onChange={(e) => handleInputChange('sexAssignedAtBirth', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select sex</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chronic Conditions */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Chronic Conditions</h3>
        </div>
        <p className="text-gray-600 text-sm">Select any ongoing health conditions you have.</p>
        
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-medium text-blue-900">Chronic Conditions Guide</h4>
          </div>
          <p className="text-blue-800 text-sm mb-3">
            Chronic conditions are long-term health conditions that typically last 6 months or longer and may require ongoing medical attention.
          </p>
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <div className="text-blue-800 text-sm">
              <p className="font-medium mb-1">Examples include:</p>
              <ul className="space-y-1">
                <li>• <strong>Metabolic:</strong> Diabetes, Thyroid disorders, High cholesterol</li>
                <li>• <strong>Cardiovascular:</strong> High blood pressure, Heart disease, Arrhythmias</li>
                <li>• <strong>Respiratory:</strong> Asthma, COPD, Sleep apnea</li>
                <li>• <strong>Mental health:</strong> Depression, Anxiety, ADHD, Bipolar disorder</li>
                <li>• <strong>Autoimmune:</strong> Rheumatoid arthritis, Lupus, Crohn's disease</li>
                <li>• <strong>Neurological:</strong> Migraines, Epilepsy, Multiple sclerosis</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Example: 'Diabetes Type 2', 'Asthma', 'Depression'"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                handleArrayFieldChange('chronicConditions', target.value, 'add');
                target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              handleArrayFieldChange('chronicConditions', input.value, 'add');
              input.value = '';
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
        
        {localData.chronicConditions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {localData.chronicConditions.map((condition, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {condition}
                <button
                  type="button"
                  onClick={() => handleArrayFieldChange('chronicConditions', condition, 'remove')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Current Medications */}
      {renderArrayInput(
        'currentMedications',
        'Current Medications',
        "Example: 'Metformin 500mg twice daily', 'Lisinopril 10mg daily'",
        (
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-medium text-blue-900">Current Medications Guide</h4>
            </div>
            <p className="text-blue-800 text-sm mb-3">
              Include ALL medications you currently take - prescriptions, over-the-counter drugs, vitamins, and supplements.
            </p>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <div className="text-blue-800 text-sm">
                <p className="font-medium mb-1">Examples include:</p>
                <ul className="space-y-1">
                  <li>• <strong>Prescription drugs:</strong> "Metformin 500mg twice daily", "Lisinopril 10mg daily"</li>
                  <li>• <strong>Over-the-counter:</strong> "Ibuprofen as needed", "Daily multivitamin"</li>
                  <li>• <strong>Supplements:</strong> "Vitamin D 1000IU", "Omega-3 fish oil"</li>
                  <li>• <strong>Include dosage/frequency when possible</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )
      )}

      {/* Allergies & Adverse Reactions */}
      {renderArrayInput(
        'allergiesAndReactions',
        'Allergies & Adverse Reactions',
        "Example: 'Penicillin - causes rash', 'Peanuts - anaphylaxis'",
        (
          <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-red-900">Allergies & Adverse Reactions Guide</h4>
            </div>
            <p className="text-red-800 text-sm mb-3">
              This is critical safety information. Include ANY reaction you've had to medications, foods, or environmental factors.
            </p>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <div className="text-red-800 text-sm">
                <p className="font-medium mb-1">Examples include:</p>
                <ul className="space-y-1">
                  <li>• <strong>Drug allergies:</strong> "Penicillin - causes rash", "Codeine - makes me nauseous"</li>
                  <li>• <strong>Food allergies:</strong> "Peanuts - anaphylaxis", "Shellfish - swelling and hives"</li>
                  <li>• <strong>Environmental:</strong> "Latex gloves - contact dermatitis", "Bee stings - severe swelling"</li>
                  <li>• <strong>Reactions to describe:</strong> Rash, swelling, difficulty breathing, nausea, dizziness</li>
                  <li>• <strong>Include severity:</strong> "Mild rash" vs "Hospitalization required"</li>
                  <li>• <strong>If unsure, include it anyway - better safe than sorry</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

