'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Calendar, X, RefreshCw, AlertCircle } from 'lucide-react';

// Types
interface SymptomLog {
  id: string;
  created_at: string;
  symptom_name?: string;
  symptom_type?: string;
  severity_scale?: number;
  functional_impact?: string;
  description?: string;
  emotional_impact?: string;
  location?: string;
  onset_time?: string;
  character_description?: string;
  additional_context?: any;
  symptom_data?: any;
  tags?: string[];
}

interface TimelineState {
  logs: SymptomLog[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filteredLogs: SymptomLog[];
  isSearching: boolean;
  expandedLog: SymptomLog | null;
  scrollPosition: number;
  dateFilter: {
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
  };
}

export default function TimelinePage() {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [state, setState] = useState<TimelineState>({
    logs: [],
    loading: true,
    error: null,
    searchQuery: '',
    filteredLogs: [],
    isSearching: false,
    expandedLog: null,
    scrollPosition: 0,
    dateFilter: {
      startDate: null,
      endDate: null,
      isActive: false
    }
  });

  // Auth token management
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      // Try Supabase first
      const mod = await import('../lib/supabase');
      const { supabase } = mod as any;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        console.log('🔐 Auth token from Supabase session');
        return session.access_token;
      }
    } catch (error) {
      console.log('🔐 Supabase auth failed, trying localStorage');
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        console.log('🔐 Auth token from localStorage');
        return token;
      }
    }

    console.warn('🔐 No auth token found');
    return null;
  }, []);

  // Update state helper
  const updateState = useCallback((updates: Partial<TimelineState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Fetch logs from API
  const fetchLogs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        updateState({ loading: true, error: null });
      }

      const token = await getAuthToken();
      if (!token) {
        updateState({ 
          error: 'Please log in to view your timeline',
          loading: false 
        });
        return;
      }

      console.log('📅 Fetching logs...');
      
      const response = await fetch('/api/symptoms/logs?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📅 API Response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📅 API Error:', errorText);
        updateState({ 
          error: `Failed to load logs: ${response.status} ${response.statusText}`,
          loading: false 
        });
        return;
      }

      const data = await response.json();
      console.log('📅 Received data:', data);

      const logs = data.logs || [];
      console.log(`📅 Loaded ${logs.length} logs`);

      updateState({ 
        logs,
        loading: false,
        error: null 
      });

    } catch (error) {
      console.error('📅 Fetch error:', error);
      updateState({ 
        error: `Failed to load logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        loading: false 
      });
    }
  }, [getAuthToken, updateState]);

  // Search logs
  const searchLogs = useCallback(async (query: string) => {
    if (!query.trim()) {
      updateState({ 
        filteredLogs: [], 
        isSearching: false 
      });
      return;
    }

    try {
      updateState({ isSearching: true });

      const token = await getAuthToken();
      if (!token) {
        updateState({ 
          error: 'Please log in to search logs',
          isSearching: false 
        });
        return;
      }

      console.log('🔍 Searching logs for:', query);

      const response = await fetch('/api/symptoms/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Search API error:', response.status, errorText);
        throw new Error(`Search failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      console.log(`🔍 Found ${results.length} search results`);

      updateState({ 
        filteredLogs: results,
        isSearching: false 
      });

    } catch (error) {
      console.error('🔍 Search error:', error);
      updateState({ 
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSearching: false 
      });
    }
  }, [getAuthToken, updateState]);

  // Handle search input
  const handleSearch = useCallback((query: string) => {
    updateState({ searchQuery: query });
    
    if (query.trim()) {
      searchLogs(query);
    } else {
      updateState({ 
        filteredLogs: [], 
        isSearching: false 
      });
    }
  }, [searchLogs, updateState]);

  // Handle date filter
  const handleDateFilter = useCallback((startDate: string | null, endDate: string | null) => {
    const isActive = !!(startDate || endDate);
    updateState({ 
      dateFilter: { 
        startDate, 
        endDate, 
        isActive 
      } 
    });
  }, [updateState]);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    updateState({ 
      dateFilter: { 
        startDate: null, 
        endDate: null, 
        isActive: false 
      } 
    });
  }, [updateState]);

  // Filter logs by date
  const filterLogsByDate = useCallback((logs: SymptomLog[]): SymptomLog[] => {
    if (!state.dateFilter.isActive) return logs;
    
    return logs.filter(log => {
      const logDate = new Date(log.created_at);
      
      // Normalize dates to start of day for accurate comparison
      const normalizeDate = (date: Date) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };
      
      const logDateNormalized = normalizeDate(logDate);
      const startDate = state.dateFilter.startDate ? normalizeDate(new Date(state.dateFilter.startDate)) : null;
      const endDate = state.dateFilter.endDate ? normalizeDate(new Date(state.dateFilter.endDate)) : null;
      
      if (startDate && logDateNormalized < startDate) return false;
      if (endDate && logDateNormalized > endDate) return false;
      
      return true;
    });
  }, [state.dateFilter]);

  // Create test log
  const createTestLog = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        alert('Please log in to create a test log');
        return;
      }

      const testLog = {
        symptom_name: 'Test Headache',
        symptom_type: 'headache',
        severity_scale: 5,
        description: 'This is a test log entry created to verify timeline functionality.',
        functional_impact: 'Mild impact on daily activities',
        emotional_impact: 'Slightly frustrated',
        location: 'Forehead',
        tags: ['test', 'headache', 'mild']
      };

      console.log('📝 Creating test log...');

      const response = await fetch('/api/symptoms/log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testLog)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create test log: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('📝 Test log created:', data);

      alert('Test log created successfully! Refreshing timeline...');
      await fetchLogs(false);

    } catch (error) {
      console.error('📝 Test log creation error:', error);
      alert(`Failed to create test log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [getAuthToken, fetchLogs]);

  // Debug function
  const debugLogs = useCallback(async () => {
    try {
      const token = await getAuthToken();
      console.log('🔍 Debug - Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        alert('No authentication token found. Please log in.');
        return;
      }

      const response = await fetch('/api/symptoms/logs?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('🔍 Debug - API Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Debug - API Error:', errorText);
        alert(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('🔍 Debug - API Response:', data);
      
      alert(`Debug Results:\n• API Status: ${response.status}\n• Logs Found: ${data.logs?.length || 0}\n• Current State: ${state.logs.length} logs loaded\n• Is Searching: ${state.isSearching}\n• Error: ${state.error || 'None'}\n\nCheck console for full details.`);

    } catch (error) {
      console.error('🔍 Debug error:', error);
      alert(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [getAuthToken, state]);

  // Log interaction handlers
  const handleLogExpand = useCallback((log: SymptomLog) => {
    updateState({ 
      scrollPosition: scrollContainerRef.current?.scrollTop || 0,
      expandedLog: log 
    });
  }, [updateState]);

  const handleLogClose = useCallback(() => {
    updateState({ expandedLog: null });
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = state.scrollPosition;
      }
    }, 100);
  }, [updateState, state.scrollPosition]);

  // Utility functions
  const getPresentingComplaint = useCallback((log: SymptomLog): string => {
    return log.symptom_data?.processedTranscript || 
           log.additional_context?.processed_transcript ||
           log.description || 
           log.symptom_name || 
           log.symptom_type || 
           'No description available';
  }, []);

  const formatLogDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const getSeverityColor = useCallback((severity: number) => {
    if (severity <= 3) return 'text-green-600';
    if (severity <= 5) return 'text-yellow-600';
    if (severity <= 7) return 'text-orange-600';
    return 'text-red-600';
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Severity badge color
  const getSeverityBadgeColor = useCallback((severity: number) => {
    if (severity <= 3) return 'text-green-600 bg-green-50 border-green-200';
    if (severity <= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (severity <= 7) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  }, []);

  // Render timeline entry
  const renderTimelineEntry = useCallback((log: SymptomLog, index: number, isLast: boolean) => {
    const presentingComplaint = getPresentingComplaint(log);
    const shortComplaint = presentingComplaint.length > 100
      ? presentingComplaint.substring(0, 97) + '...'
      : presentingComplaint;

    const severityVal = typeof log.severity_scale === 'number' ? log.severity_scale : null;

    return (
      <motion.div
        key={log.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        className="relative flex gap-4 cursor-pointer group"
        onClick={() => handleLogExpand(log)}
      >
        {/* Timeline line + dot */}
        <div className="flex flex-col items-center flex-shrink-0 w-8">
          <div className="w-5 h-5 rounded-full border-2 border-[#34A853] bg-white flex-shrink-0 mt-1 group-hover:bg-[#34A853]/10 transition-colors" />
          {!isLast && (
            <div className="w-0.5 bg-gray-200 flex-1 min-h-[40px]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 pb-8 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {log.symptom_name || log.symptom_type || 'Untitled'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{formatLogDate(log.created_at)}</p>
            </div>
            {severityVal !== null && (
              <span className={`text-sm font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${getSeverityBadgeColor(severityVal)}`}>
                {severityVal}/10
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{shortComplaint}</p>
        </div>
      </motion.div>
    );
  }, [getPresentingComplaint, formatLogDate, getSeverityBadgeColor, handleLogExpand]);

  // Render expanded log modal
  const renderExpandedLog = useCallback(() => {
    if (!state.expandedLog) return null;

    const log = state.expandedLog;
    const presentingComplaint = getPresentingComplaint(log);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={handleLogClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {log.symptom_name || log.symptom_type || 'Untitled Log'}
              </h2>
              <button
                onClick={handleLogClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {formatLogDate(log.created_at)}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Presenting Complaint</h3>
                <p className="text-gray-700">{presentingComplaint}</p>
              </div>

              {log.description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Description</h3>
                  <p className="text-gray-700">{log.description}</p>
                </div>
              )}

              {(log as any).user_description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">User Description</h3>
                  <p className="text-gray-700">{(log as any).user_description}</p>
                </div>
              )}

              {(log as any).processed_transcript && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Processed Transcript</h3>
                  <p className="text-gray-700">{(log as any).processed_transcript}</p>
                </div>
              )}

              {log.functional_impact && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Functional Impact</h3>
                  <p className="text-gray-700">{log.functional_impact}</p>
                </div>
              )}

              {log.emotional_impact && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Emotional Impact</h3>
                  <p className="text-gray-700">{log.emotional_impact}</p>
                </div>
              )}

              {log.location && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-700">{log.location}</p>
                </div>
              )}

              {(log as any).triggers && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Triggers</h3>
                  <p className="text-gray-700">{(log as any).triggers}</p>
                </div>
              )}

              {(log as any).patterns && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Patterns</h3>
                  <p className="text-gray-700">{(log as any).patterns}</p>
                </div>
              )}

              {(log as any).treatment_response && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Treatment Response</h3>
                  <p className="text-gray-700">{(log as any).treatment_response}</p>
                </div>
              )}

              {(log as any).progress_description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Progress Description</h3>
                  <p className="text-gray-700">{(log as any).progress_description}</p>
                </div>
              )}

              {(log as any).additional_context && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Additional Context</h3>
                  <div className="text-gray-700">
                    {typeof (log as any).additional_context === 'string' 
                      ? (log as any).additional_context
                      : (
                        <div className="space-y-2">
                          {(log as any).additional_context.processed_transcript && (
                            <div>
                              <span className="font-medium">Processed Transcript:</span>
                              <p className="mt-1">{(log as any).additional_context.processed_transcript}</p>
                            </div>
                          )}
                          {(log as any).additional_context.raw_transcript && (
                            <div>
                              <span className="font-medium">Raw Transcript:</span>
                              <p className="mt-1">{(log as any).additional_context.raw_transcript}</p>
                            </div>
                          )}
                          {(log as any).additional_context.user_description && (
                            <div>
                              <span className="font-medium">User Description:</span>
                              <p className="mt-1">{(log as any).additional_context.user_description}</p>
                            </div>
                          )}
                          {(log as any).additional_context.custom_name && (
                            <div>
                              <span className="font-medium">Custom Name:</span>
                              <p className="mt-1">{(log as any).additional_context.custom_name}</p>
                            </div>
                          )}
                          {(log as any).additional_context.custom_date && (
                            <div>
                              <span className="font-medium">Custom Date:</span>
                              <p className="mt-1">{(log as any).additional_context.custom_date}</p>
                            </div>
                          )}
                          {(log as any).additional_context.llmResponses && Array.isArray((log as any).additional_context.llmResponses) && (
                            <div>
                              <span className="font-medium">Q&A Responses:</span>
                              <div className="mt-1 space-y-1">
                                {(log as any).additional_context.llmResponses.map((response: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{response.label || `Q${idx + 1}`}:</span> {response.answer || response}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  </div>
                </div>
              )}

              {log.tags && log.tags.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {log.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }, [state.expandedLog, getPresentingComplaint, formatLogDate, handleLogClose]);

  // Determine which logs to display
  const baseLogs = state.isSearching ? state.filteredLogs : state.logs;
  const displayLogs = filterLogsByDate(baseLogs);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/symptoms')}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
                <p className="text-xs text-gray-500">
                  {state.isSearching
                    ? `${displayLogs.length} result${displayLogs.length !== 1 ? 's' : ''}`
                    : `${displayLogs.length} log${displayLogs.length !== 1 ? 's' : ''}`
                  }
                  {state.dateFilter.isActive ? ' (filtered)' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchLogs()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              disabled={state.loading}
            >
              <RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search symptoms..."
                  value={state.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#34A853]/40 focus:border-[#34A853] bg-gray-50 transition-colors"
                />
              </div>
              {state.isSearching && (
                <button
                  onClick={() => handleSearch('')}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">From</span>
              </div>
              <input
                type="date"
                value={state.dateFilter.startDate || ''}
                onChange={(e) => handleDateFilter(e.target.value || null, state.dateFilter.endDate)}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-[#34A853]/40 focus:border-[#34A853]"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={state.dateFilter.endDate || ''}
                onChange={(e) => handleDateFilter(state.dateFilter.startDate, e.target.value || null)}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-[#34A853]/40 focus:border-[#34A853]"
              />
              {state.dateFilter.isActive && (
                <button
                  onClick={clearDateFilter}
                  className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <div ref={scrollContainerRef}>
          {state.loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <RefreshCw size={18} className="animate-spin text-[#34A853]" />
                <span className="text-sm text-gray-500">Loading logs...</span>
              </div>
            </div>
          ) : state.error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
                <div className="text-sm text-red-600 mb-3">{state.error}</div>
                <button
                  onClick={() => fetchLogs()}
                  className="px-4 py-2 text-sm bg-[#34A853] text-white rounded-lg hover:bg-[#2d9249] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                <div className="text-sm text-gray-500 mb-1">
                  {state.isSearching
                    ? 'No logs match your search'
                    : state.dateFilter.isActive
                      ? 'No logs in this date range'
                      : 'No symptoms logged yet'
                  }
                </div>
                {!state.isSearching && !state.dateFilter.isActive && (
                  <p className="text-xs text-gray-400">Use the chat to log your first symptom.</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Timeline header */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
                <span className="text-xs font-semibold tracking-widest text-[#34A853] uppercase">Symptom Timeline</span>
              </div>

              {/* Timeline entries */}
              <div className="ml-1">
                {displayLogs.map((log, index) => renderTimelineEntry(log, index, index === displayLogs.length - 1))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Expanded Log Modal */}
      <AnimatePresence>
        {renderExpandedLog()}
      </AnimatePresence>
    </div>
  );
}