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
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F80ED] mx-auto"></div>
          <p className="mt-3 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Authentication Required</h1>
          <p className="text-gray-500 mb-6 text-sm">Please log in to access the chat.</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="px-5 py-2.5 bg-[#2F80ED] text-white rounded-md hover:bg-[#2570D4] transition-colors text-sm font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Minimal Top Header */}
      <header className="flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo and Product Name */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Sympli" width={100} height={34} />
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUserData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">Profile</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Chat Area */}
      <div className="flex-1 overflow-hidden">
        <SymptomChat token={token} onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    </div>
  );
}
