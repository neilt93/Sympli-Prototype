import { useState } from 'react';
import { SymptomTracking as SymptomTrackingType } from '../../types/onboarding';

interface SymptomTrackingProps {
  data: SymptomTrackingType;
  onUpdate: (data: SymptomTrackingType) => void;
}

export default function SymptomTracking({ data, onUpdate }: SymptomTrackingProps) {
  const [localData, setLocalData] = useState<SymptomTrackingType>(data);
  const [newSymptom, setNewSymptom] = useState('');

  const handleInputChange = (field: keyof SymptomTrackingType, value: string) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  const handleAddSymptom = () => {
    if (newSymptom.trim()) {
      const updatedSymptoms = [...localData.trackingGoals, newSymptom.trim()];
      const updatedData = { ...localData, trackingGoals: updatedSymptoms };
      setLocalData(updatedData);
      onUpdate(updatedData);
      setNewSymptom('');
    }
  };

  const handleRemoveSymptom = (index: number) => {
    const updatedSymptoms = localData.trackingGoals.filter((_, i) => i !== index);
    const updatedData = { ...localData, trackingGoals: updatedSymptoms };
    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSymptom();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What Do You Want to Track?</h2>
        <p className="text-gray-600">This helps us customize follow-up questions and insights</p>
      </div>

      {/* Symptom Tracking Guide */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="font-medium text-green-900">Symptom Tracking Guide</h3>
        </div>
        <p className="text-green-800 text-sm mb-3">
          Choose what symptoms or health aspects you want to monitor. This helps us ask the right questions and provide relevant insights.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-medium text-green-900 text-sm">Pain tracking:</p>
              <p className="text-green-800 text-sm">"Headache frequency and triggers", "Back pain intensity levels"</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-medium text-green-900 text-sm">Digestive health:</p>
              <p className="text-green-800 text-sm">"IBS flare-ups", "Food intolerance reactions", "Bloating patterns"</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-medium text-green-900 text-sm">Mental health:</p>
              <p className="text-green-800 text-sm">"Anxiety episodes", "Mood changes", "Sleep quality impact"</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-medium text-green-900 text-sm">Chronic conditions:</p>
              <p className="text-green-800 text-sm">"Diabetes blood sugar patterns", "Asthma trigger identification"</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-medium text-green-900 text-sm">Women's health:</p>
              <p className="text-green-800 text-sm">"Menstrual cycle symptoms", "Pregnancy symptoms", "Menopause effects"</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-medium text-green-900 text-sm">Recovery tracking:</p>
              <p className="text-green-800 text-sm">"Post-surgery healing", "Medication side effects", "Exercise tolerance"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Symptom/Health Aspect Input */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">What symptoms or health aspects would you like to track?</h3>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Example: 'Headaches', 'Gut health and digestive issues', 'Fatigue', 'Mental health'"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddSymptom}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
        
        {localData.trackingGoals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {localData.trackingGoals.map((goal, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {goal}
                <button
                  type="button"
                  onClick={() => handleRemoveSymptom(index)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Additional Specific Tracking Details */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Additional specific tracking details</h3>
        </div>
        
        <p className="text-gray-600 text-sm">Be specific about what you want to track:</p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <svg className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <p className="text-sm text-gray-700">Instead of "pain" → "Lower back pain that worsens when sitting"</p>
            </div>
            <div className="flex items-start">
              <svg className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <p className="text-sm text-gray-700">Instead of "tiredness" → "Afternoon energy crashes after lunch"</p>
            </div>
            <div className="flex items-start">
              <svg className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <p className="text-sm text-gray-700">Instead of "stomach issues" → "Bloating and cramping after certain foods"</p>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={localData.additionalDetails}
              onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
              placeholder="Add any additional details about your tracking goals that you didn't capture above..."
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
