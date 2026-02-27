'use client';

import React, { useState, useEffect } from 'react';
import SymptomChat from '../components/SymptomChat';

export default function ChatPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (authToken && userData) {
      setToken(authToken);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleComplete = () => {
    console.log('Symptom chat completed!');
  };

  const handleCancel = () => {
    console.log('Symptom chat cancelled!');
    window.history.back();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/auth';
  };

  const handleUserData = () => {
    window.location.href = '/settings';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access the chat.</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Long Banner Header */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            {/* Brand and Title */}
            <div className="flex items-center space-x-4">
              <div className="text-white text-2xl font-extrabold tracking-wide">Sympli</div>
              <div>
                <p className="text-green-100 text-lg">Voice-first health companion</p>
              </div>
            </div>

            {/* Two Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleUserData}
                className="flex items-center space-x-2 px-4 py-3 bg-white bg-opacity-20 text-white rounded-xl hover:bg-white hover:bg-opacity-30 transition-all duration-200 border border-white border-opacity-30"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Profile</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <SymptomChat token={token} onComplete={handleComplete} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
