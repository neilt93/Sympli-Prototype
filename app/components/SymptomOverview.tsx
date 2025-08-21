'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SymptomOverviewResponse, 
  SymptomOverviewRow, 
  FunctionalImpactSummary,
  GenerateSummaryRequest,
  UpdateSummaryRequest
} from '../types/symptoms';

interface SymptomOverviewProps {
  token: string;
}

const SymptomOverview: React.FC<SymptomOverviewProps> = ({ token }) => {
  const [data, setData] = useState<SymptomOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    fetchSymptomOverview();
  }, [token]);

  const fetchSymptomOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/symptoms/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      
      if (result.functionalImpact) {
        setSummaryText(result.functionalImpact.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch symptom overview');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!data?.symptoms) return;
    
    try {
      setGeneratingSummary(true);
      setError(null);
      
      const request: GenerateSummaryRequest = {
        symptomData: data.symptoms,
        userId: 'current-user' // This will be extracted from token on backend
      };

      const response = await fetch('/api/symptoms/summary/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSummaryText(result.summary);
      
      // Refresh the data to get updated functional impact
      await fetchSymptomOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const updateSummary = async () => {
    try {
      setError(null);
      
      const request: UpdateSummaryRequest = {
        text: summaryText,
        userId: 'current-user' // This will be extracted from token on backend
      };

      const response = await fetch('/api/symptoms/summary', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setEditingSummary(false);
      await fetchSymptomOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update summary');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'escalating':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'stable':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <button
              onClick={fetchSymptomOverview}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Symptom Frequency Overview</h1>
          <p className="text-gray-600 mt-1">Track and analyze your symptom patterns over time</p>
        </div>
        <button
          onClick={generateSummary}
          disabled={generatingSummary || !data?.symptoms?.length}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingSummary ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            'Generate AI Summary'
          )}
        </button>
      </div>

      {/* Symptoms Table */}
      {data?.symptoms && data.symptoms.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Symptom Tracking Data</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed overview of your logged symptoms and trends</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symptom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Logged</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Most Recent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Logs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.symptoms.map((symptom, index) => (
                  <motion.tr
                    key={symptom.symptom}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {symptom.symptom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(symptom.firstLogged.toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(symptom.mostRecent.toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {symptom.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTrendColor(symptom.trend)}`}>
                        <span className="mr-1">{symptom.trendEmoji}</span>
                        {symptom.trendText}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No symptoms logged</h3>
          <p className="mt-1 text-sm text-gray-500">Start tracking your symptoms to see patterns and trends.</p>
        </div>
      )}

      {/* Functional Impact Summary */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Summary of Functional Impact</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                AI-generated insights about how your symptoms may be affecting your daily life
              </p>
            </div>
            {data?.functionalImpact && (
              <div className="flex space-x-2">
                {editingSummary ? (
                  <>
                    <button
                      onClick={updateSummary}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingSummary(false);
                        setSummaryText(data.functionalImpact?.text || '');
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingSummary(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-4">
            {editingSummary ? (
              <textarea
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                rows={4}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your functional impact summary..."
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                {data?.functionalImpact?.text ? (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{data.functionalImpact.text}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No summary available. Click "Generate AI Summary" to create one.</p>
                )}
                {data?.functionalImpact && (
                  <div className="mt-2 text-xs text-gray-500">
                    {data.functionalImpact.isUserEdited ? 'User edited' : 'AI generated'} • 
                    Last updated: {formatDate(data.functionalImpact.lastUpdatedAt.toString())}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomOverview;
