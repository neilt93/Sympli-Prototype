'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Severity } from '../types/symptoms';

interface SymptomLogEntry {
  _id: string;
  symptom: string;
  severity: Severity;
  tags: string[];
  occurredAt: string;
  context: string;
  createdAt: string;
}

interface SymptomTimelineProps {
  token: string;
  symptom?: string; // Optional: filter by specific symptom
}

const SymptomTimeline: React.FC<SymptomTimelineProps> = ({ token, symptom }) => {
  const [logs, setLogs] = useState<SymptomLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  useEffect(() => {
    fetchSymptomLogs();
  }, [token, symptom, filterSeverity]);

  const fetchSymptomLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/symptoms/logs';
      if (symptom) {
        url += `?symptom=${encodeURIComponent(symptom)}`;
      }
      if (filterSeverity !== 'all') {
        url += `${symptom ? '&' : '?'}severity=${filterSeverity}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setLogs(result.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch symptom logs');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.NONE:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case Severity.MILD:
        return 'bg-green-100 text-green-800 border-green-200';
      case Severity.MODERATE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case Severity.SEVERE:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
              onClick={fetchSymptomLogs}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => 
    filterSeverity === 'all' || log.severity === filterSeverity
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {symptom ? `${symptom} Timeline` : 'Symptom Timeline'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Track your symptom history and patterns over time
          </p>
        </div>
        
        {/* Filters */}
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <label htmlFor="severity-filter" className="text-sm font-medium text-gray-700">
            Filter by severity:
          </label>
          <select
            id="severity-filter"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as Severity | 'all')}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All severities</option>
            <option value={Severity.NONE}>None</option>
            <option value={Severity.MILD}>Mild</option>
            <option value={Severity.MODERATE}>Moderate</option>
            <option value={Severity.SEVERE}>Severe</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      {filteredLogs.length > 0 ? (
        <div className="flow-root">
          <ul className="-mb-8">
            {filteredLogs.map((log, index) => (
              <motion.li
                key={log._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="relative pb-8">
                  {index !== filteredLogs.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getSeverityColor(log.severity)}`}>
                        {log.severity === Severity.SEVERE && '🔴'}
                        {log.severity === Severity.MODERATE && '🟡'}
                        {log.severity === Severity.MILD && '🟢'}
                        {log.severity === Severity.NONE && '⚪'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {log.symptom}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                            {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {log.context}
                        </p>
                        {log.tags && log.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {log.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <div>{formatDate(log.occurredAt)}</div>
                        <div>{formatTime(log.occurredAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {filterSeverity !== 'all' 
              ? `No ${filterSeverity} symptoms found`
              : 'No symptoms logged yet'
            }
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterSeverity !== 'all'
              ? `Try adjusting the severity filter or log a new symptom.`
              : 'Start tracking your symptoms to see your timeline here.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default SymptomTimeline;
