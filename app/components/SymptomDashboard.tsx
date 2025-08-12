'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Severity } from '../types/symptoms';
import SymptomLogForm from './SymptomLogForm';
import NewSymptomLogFlow from './NewSymptomLogFlow';
import SymptomOverview from './SymptomOverview';
import SymptomTimeline from './SymptomTimeline';

interface SymptomDashboardProps {
  token: string;
}

const SymptomDashboard: React.FC<SymptomDashboardProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'log' | 'timeline'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [useNewFlow, setUseNewFlow] = useState(true); // Toggle between old and new flow

  const handleSymptomLogged = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('overview');
    setQuickLogVisible(false);
  };

  const handleQuickLog = () => {
    setQuickLogVisible(true);
    setActiveTab('log');
  };

  const tabs = [
    { id: 'overview', label: 'Symptom Overview', icon: '📊' },
    { id: 'log', label: 'Log New Symptom', icon: '➕' },
    { id: 'timeline', label: 'Timeline View', icon: '📅' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Symptom Tracking</h1>
            <p className="mt-1 text-gray-600">
              Monitor your health patterns and track symptom changes over time
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={handleQuickLog}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mr-2">➕</span>
              Log New Symptom
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <span className="mr-2">📊</span>
              View Overview
            </button>
            <button
              onClick={() => setUseNewFlow(!useNewFlow)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <span className="mr-2">🔄</span>
              {useNewFlow ? 'Use Old Flow' : 'Use New Flow'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'log' | 'timeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SymptomOverview 
                  token={token} 
                  key={`overview-${refreshTrigger}`}
                />
              </motion.div>
            )}
            {activeTab === 'log' && (
              <motion.div
                key="log"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {useNewFlow ? (
                  <NewSymptomLogFlow 
                    token={token} 
                    onComplete={handleSymptomLogged}
                    onCancel={() => setActiveTab('overview')}
                  />
                ) : (
                  <SymptomLogForm 
                    token={token} 
                    onSymptomLogged={handleSymptomLogged}
                  />
                )}
              </motion.div>
            )}
            {activeTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SymptomTimeline 
                  token={token}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick Log Floating Button */}
      <AnimatePresence>
        {!quickLogVisible && activeTab === 'overview' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleQuickLog}
            className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
            aria-label="Log new symptom"
          >
            ➕
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SymptomDashboard;
