'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SymptomTypeSelectorProps {
  symptom: string;
  onTypeSelected: (type: 'new' | 'ongoing') => void;
}

const SymptomTypeSelector: React.FC<SymptomTypeSelectorProps> = ({ symptom, onTypeSelected }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow sm:rounded-lg"
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Is this a new symptom or ongoing?
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            You mentioned: <span className="font-medium text-gray-900">"{symptom}"</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onTypeSelected('new')}
            className="p-6 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900">New Symptom</h4>
            </div>
            <p className="text-sm text-gray-600">
              This is the first time I'm experiencing this symptom or it's significantly different from before.
            </p>
          </button>

          <button
            onClick={() => onTypeSelected('ongoing')}
            className="p-6 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900">Ongoing Symptom</h4>
            </div>
            <p className="text-sm text-gray-600">
              I've experienced this symptom before and it's continuing or recurring.
            </p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SymptomTypeSelector;
