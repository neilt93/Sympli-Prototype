import { useState } from 'react';
import { MedicalHistory as MedicalHistoryType } from '../../types/onboarding';

interface MedicalHistoryProps {
  data: MedicalHistoryType;
  onUpdate: (data: MedicalHistoryType) => void;
}

export default function MedicalHistory({ data, onUpdate }: MedicalHistoryProps) {
  const [localData, setLocalData] = useState<MedicalHistoryType>(data);

  const handleInputChange = (field: keyof MedicalHistoryType, value: string) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical History</h2>
        <p className="text-gray-600">Please provide details about your past medical experiences. This information helps us understand your health journey and provide better insights.</p>
      </div>

      {/* Medical History Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3 className="font-medium text-blue-900">Medical History Guide</h3>
        </div>
        <p className="text-blue-800 text-sm">
          Please provide details about your past medical experiences. This information helps us understand your health journey and provide better insights.
        </p>
      </div>

      {/* Past Medical History */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Past Medical History</h3>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Previous diagnoses:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Diagnosed with Type 2 diabetes in 2019", "Had pneumonia in 2020"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Hospitalizations:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Admitted for chest infection in March 2022", "Emergency room visit for severe headache"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Chronic conditions:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Long-standing back pain since 2018", "Ongoing issues with anxiety"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Significant illnesses:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Had COVID-19 in January 2023", "Severe flu requiring time off work"</p>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={localData.pastMedicalHistory}
              onChange={(e) => handleInputChange('pastMedicalHistory', e.target.value)}
              placeholder="Diagnosed with asthma in childhood, hospitalized for appendectomy in 2020, had COVID-19 in 2022 with lingering fatigue..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="absolute bottom-2 right-2">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Surgeries & Procedures */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Surgeries & Procedures</h3>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Major surgeries:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Gallbladder removal (cholecystectomy) in 2018", "Knee replacement surgery"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Minor procedures:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Mole removal", "Endoscopy", "Dental extractions"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Investigations:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "CT scan for abdominal pain", "MRI for back problems", "Colonoscopy screening"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Include dates if possible:</h4>
              <p className="text-sm text-gray-600 mb-2">Example: "Appendectomy - June 2019"</p>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={localData.surgeriesAndProcedures}
              onChange={(e) => handleInputChange('surgeriesAndProcedures', e.target.value)}
              placeholder="Wisdom teeth removal in 2019, arthroscopy on left knee in 2021, regular mammograms since age 40..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="absolute bottom-2 right-2">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Family History */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Family History</h3>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Heart disease:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Father had heart attack at age 55", "Mother has high blood pressure"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Cancer:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Grandmother had breast cancer", "Uncle diagnosed with colon cancer"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Diabetes:</h4>
              <p className="text-sm text-gray-600 mb-2">Example: "Type 2 diabetes runs in family - father and aunt both have it"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Mental health:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Sister has depression", "Family history of anxiety disorders"</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Other conditions:</h4>
              <p className="text-sm text-gray-600 mb-2">Examples: "Mother has arthritis", "Brother has asthma"</p>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={localData.familyHistory}
              onChange={(e) => handleInputChange('familyHistory', e.target.value)}
              placeholder="Mother has Type 2 diabetes and high blood pressure, Father had heart attack at 62, Maternal grandmother had breast cancer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="absolute bottom-2 right-2">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
