'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Severity } from '../types/symptoms';

interface SymptomLogFormProps {
  token: string;
  onSymptomLogged?: () => void;
}

const SymptomLogForm: React.FC<SymptomLogFormProps> = ({ token, onSymptomLogged }) => {
  const [formData, setFormData] = useState({
    symptom: '',
    severity: Severity.MILD,
    tags: '',
    context: '',
    occurredAt: new Date().toISOString().slice(0, 16) // Current date and time
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symptom.trim() || !formData.context.trim()) {
      setError('Symptom and context are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const response = await fetch('/api/symptoms/log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptom: formData.symptom.trim(),
          severity: formData.severity,
          tags,
          context: formData.context.trim(),
          occurredAt: new Date(formData.occurredAt).toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSuccess(true);
      setFormData({
        symptom: '',
        severity: Severity.MILD,
        tags: '',
        context: '',
        occurredAt: new Date().toISOString().slice(0, 16)
      });
      
      // Callback to refresh parent component
      if (onSymptomLogged) {
        onSymptomLogged();
      }
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log symptom');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow sm:rounded-lg"
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Log New Symptom</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Track a new symptom occurrence to build your health insights
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
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
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.707 9.293a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414l-5.293 5.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">Symptom logged successfully!</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="symptom" className="block text-sm font-medium text-gray-700">
              Symptom *
            </label>
            <input
              type="text"
              id="symptom"
              value={formData.symptom}
              onChange={(e) => handleInputChange('symptom', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Headache, Fatigue, Joint Pain"
              required
            />
          </div>

          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
              Severity *
            </label>
            <select
              id="severity"
              value={formData.severity}
              onChange={(e) => handleInputChange('severity', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value={Severity.NONE}>None</option>
              <option value={Severity.MILD}>Mild</option>
              <option value={Severity.MODERATE}>Moderate</option>
              <option value={Severity.SEVERE}>Severe</option>
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., morning, stress, weather"
            />
            <p className="mt-1 text-xs text-gray-500">Optional tags to help categorize your symptoms</p>
          </div>

          <div>
            <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700">
              When did this occur? *
            </label>
            <input
              type="datetime-local"
              id="occurredAt"
              value={formData.occurredAt}
              onChange={(e) => handleInputChange('occurredAt', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700">
              Context/Notes *
            </label>
            <textarea
              id="context"
              value={formData.context}
              onChange={(e) => handleInputChange('context', e.target.value)}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Describe what happened, triggers, or any relevant details..."
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging...
                </>
              ) : (
                'Log Symptom'
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default SymptomLogForm;
