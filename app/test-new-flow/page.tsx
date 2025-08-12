'use client';

import React, { useState } from 'react';
import NewSymptomLogFlow from '../components/NewSymptomLogFlow';

const TestNewFlowPage: React.FC = () => {
  const [showFlow, setShowFlow] = useState(false);

  const handleComplete = () => {
    console.log('Flow completed!');
    setShowFlow(false);
  };

  const handleCancel = () => {
    console.log('Flow cancelled!');
    setShowFlow(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test New Symptom Logging Flow</h1>
          <p className="text-gray-600">This page tests the new symptom logging flow with all steps.</p>
        </div>

        {!showFlow ? (
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ready to test?</h2>
            <p className="text-gray-600 mb-4">
              Click the button below to start the new symptom logging flow. This will test:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
              <li>MCQ symptom selection</li>
              <li>New vs Ongoing selection</li>
              <li>Socrates questioning</li>
              <li>LLM follow-up questions</li>
              <li>Report generation and review</li>
            </ul>
            <button
              onClick={() => setShowFlow(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Start New Flow
            </button>
          </div>
        ) : (
          <NewSymptomLogFlow
            token="test-token"
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

export default TestNewFlowPage;
