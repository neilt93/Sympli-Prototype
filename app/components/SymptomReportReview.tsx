'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SocratesData } from './SocratesQuestioning';

interface SymptomReportReviewProps {
  symptomData: {
    symptom: string;
    type: 'new' | 'ongoing';
    description?: string;
  };
  socratesData: SocratesData;
  onConfirm: (reportData: any) => void;
  onEdit: () => void;
}

const SymptomReportReview: React.FC<SymptomReportReviewProps> = ({ 
  symptomData, 
  socratesData, 
  onConfirm, 
  onEdit 
}) => {
  const [loading, setLoading] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generatePDF();
  }, []);

  const generatePDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/symptoms/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptomData,
          socratesData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPdfContent(data.reportContent);
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      symptomData,
      socratesData,
      reportContent: pdfContent
    });
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white shadow sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your symptom report...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white shadow sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
          </div>
          <div className="mt-4 flex justify-center">
            <button
              onClick={generatePDF}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow sm:rounded-lg"
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Review Your Symptom Report</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Please review the generated report below. Does this look correct?
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">{pdfContent}</div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={onEdit}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Report
          </button>
          
          <button
            onClick={handleConfirm}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Looks Correct
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SymptomReportReview;
