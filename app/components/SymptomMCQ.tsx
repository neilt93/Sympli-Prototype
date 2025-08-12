'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SymptomMCQProps {
  onSymptomSelected: (symptom: string, isOther: boolean) => void;
}

const commonSymptoms = [
  'Headache',
  'Fatigue',
  'Joint Pain',
  'Nausea',
  'Dizziness',
  'Chest Pain',
  'Shortness of Breath',
  'Abdominal Pain',
  'Fever',
  'Cough',
  'Back Pain',
  'Anxiety',
  'Depression',
  'Insomnia',
  'Digestive Issues'
];

const SymptomMCQ: React.FC<SymptomMCQProps> = ({ onSymptomSelected }) => {
  const [selectedSymptom, setSelectedSymptom] = useState<string>('');
  const [otherSymptom, setOtherSymptom] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const handleSymptomClick = (symptom: string) => {
    if (symptom === 'Other') {
      setShowOtherInput(true);
      setSelectedSymptom('Other');
    } else {
      setSelectedSymptom(symptom);
      setShowOtherInput(false);
    }
  };

  const handleOtherSubmit = () => {
    if (otherSymptom.trim()) {
      onSymptomSelected(otherSymptom.trim(), true);
    }
  };

  const handleContinue = () => {
    if (selectedSymptom && selectedSymptom !== 'Other') {
      onSymptomSelected(selectedSymptom, false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow sm:rounded-lg"
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">What symptom are you experiencing?</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Select from common symptoms or choose "Other" to describe something specific
          </p>
        </div>

        {!showOtherInput ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {commonSymptoms.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => handleSymptomClick(symptom)}
                  className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                    selectedSymptom === symptom
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {symptom}
                </button>
              ))}
              <button
                onClick={() => handleSymptomClick('Other')}
                className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                  selectedSymptom === 'Other'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Other
              </button>
            </div>

            {selectedSymptom && selectedSymptom !== 'Other' && (
              <div className="flex justify-end">
                <button
                  onClick={handleContinue}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="otherSymptom" className="block text-sm font-medium text-gray-700">
                What is the problem?
              </label>
              <textarea
                id="otherSymptom"
                value={otherSymptom}
                onChange={(e) => setOtherSymptom(e.target.value)}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Describe your symptom in detail..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOtherInput(false);
                  setSelectedSymptom('');
                  setOtherSymptom('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                onClick={handleOtherSubmit}
                disabled={!otherSymptom.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SymptomMCQ;
