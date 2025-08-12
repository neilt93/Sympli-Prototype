'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SymptomMCQ from './SymptomMCQ';
import SymptomTypeSelector from './SymptomTypeSelector';
import SocratesQuestioning from './SocratesQuestioning';
import SymptomReportReview from './SymptomReportReview';
import { SocratesData } from './SocratesQuestioning';

interface NewSymptomLogFlowProps {
  token: string;
  onComplete: () => void;
  onCancel: () => void;
}

type FlowStep = 'mcq' | 'type' | 'socrates' | 'review' | 'complete';

const NewSymptomLogFlow: React.FC<NewSymptomLogFlowProps> = ({ token, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('mcq');
  const [symptomData, setSymptomData] = useState<{
    symptom: string;
    type: 'new' | 'ongoing';
    description?: string;
  } | null>(null);
  const [socratesData, setSocratesData] = useState<SocratesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSymptomSelected = (symptom: string, isOther: boolean) => {
    setSymptomData({
      symptom,
      type: 'new', // Will be set in next step
      description: isOther ? symptom : undefined
    });
    setCurrentStep('type');
  };

  const handleTypeSelected = (type: 'new' | 'ongoing') => {
    if (symptomData) {
      setSymptomData({
        ...symptomData,
        type
      });
      setCurrentStep('socrates');
    }
  };

  const handleSocratesComplete = (data: SocratesData) => {
    setSocratesData(data);
    setCurrentStep('review');
  };

  const handleReportConfirmed = async (reportData: any) => {
    setLoading(true);
    setError(null);

    try {
      // Save the complete symptom log to the database
      const response = await fetch('/api/symptoms/log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptomData: symptomData,
          socratesData: socratesData,
          reportData: reportData,
          occurredAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save symptom log');
      }

      setCurrentStep('complete');
      
      // Call the completion callback after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save symptom log');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReport = () => {
    setCurrentStep('socrates');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'mcq':
        return 'Select Symptom';
      case 'type':
        return 'Symptom Type';
      case 'socrates':
        return 'Detailed Assessment';
      case 'review':
        return 'Review Report';
      case 'complete':
        return 'Complete';
      default:
        return 'Log Symptom';
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'mcq':
        return 25;
      case 'type':
        return 50;
      case 'socrates':
        return 75;
      case 'review':
        return 90;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  if (currentStep === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white shadow sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Symptom Logged Successfully!</h3>
          <p className="text-gray-600">Your symptom has been recorded and the report has been generated.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Step 1: Select</span>
            <span>Step 2: Type</span>
            <span>Step 3: Details</span>
            <span>Step 4: Review</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-md p-4"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        {currentStep === 'mcq' && (
          <motion.div
            key="mcq"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SymptomMCQ onSymptomSelected={handleSymptomSelected} />
          </motion.div>
        )}

        {currentStep === 'type' && symptomData && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SymptomTypeSelector 
              symptom={symptomData.symptom} 
              onTypeSelected={handleTypeSelected} 
            />
          </motion.div>
        )}

        {currentStep === 'socrates' && symptomData && (
          <motion.div
            key="socrates"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SocratesQuestioning 
              symptomData={symptomData}
              onComplete={handleSocratesComplete}
            />
          </motion.div>
        )}

        {currentStep === 'review' && symptomData && socratesData && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SymptomReportReview
              symptomData={symptomData}
              socratesData={socratesData}
              onConfirm={handleReportConfirmed}
              onEdit={handleEditReport}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Saving your symptom log...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NewSymptomLogFlow;
