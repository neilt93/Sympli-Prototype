'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import SymptomChat from '../components/SymptomChat';
import SymptomTimeline from '../components/SymptomTimeline';
import UserNavigation from '../components/UserNavigation';

const SymptomsPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log('🔍 Symptoms page - Starting auth check...');
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      console.log('🔍 Symptoms page - Token found:', !!storedToken);
      if (!storedToken) {
        console.log('❌ Symptoms page - No token, redirecting to auth');
        router.push('/auth');
        return;
      }

      try {
        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          // Token is invalid, clear storage and redirect to auth
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('onboardingData');
          router.push('/auth');
          return;
        }

        // Token is valid, check if onboarding is complete
        const userData = await response.json();
        console.log('🔍 Symptoms page - User data:', userData);
        console.log('🔍 Symptoms page - Onboarding complete:', userData.onboarding_complete);
        console.log('🔍 Symptoms page - User object:', userData.user);
        
        // The API returns data nested under 'user' property
        const onboardingComplete = userData.user?.onboarding_complete;
        console.log('🔍 Symptoms page - Final onboarding complete value:', onboardingComplete);
        
        if (!onboardingComplete) {
          console.log('⚠️ Symptoms page - Onboarding not complete, redirecting to onboarding');
          // User hasn't completed onboarding, redirect to onboarding
          router.push('/onboarding');
          return;
        }

        // User is authenticated and has completed onboarding
        setToken(storedToken);
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Clear storage and redirect to auth on error
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('onboardingData');
        router.push('/auth');
      }
    };

    checkAuth();
  }, []); // Remove router dependency to prevent re-runs

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <a href="/symptoms" className="flex items-center">
              <img src="/logo.jpeg" alt="Sympli" className="w-28 -ml-2" style={{ objectFit: 'contain', objectPosition: 'left center' }} />
            </a>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { console.log('🧭 Navigating to Timeline'); router.push('/timeline'); }}
                className="text-[#34A853] hover:text-[#2d9249] px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Timeline
              </button>
              <UserNavigation />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content — phone-frame chat */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg flex flex-col bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>
          {/* Phone frame inner header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8faf8]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#34A853]"></div>
              <span className="text-sm font-semibold text-[#2d6a3f]">Sympli Chat</span>
            </div>
            <span className="text-[11px] text-gray-400">Secure</span>
          </div>
          {/* Chat content */}
          <div className="flex-1 min-h-0">
            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'timeline' && token ? (
              <SymptomTimeline token={token} />
            ) : (
              <SymptomChat />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SymptomsPage;
