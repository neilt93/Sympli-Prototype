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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src="/logo.svg" alt="Sympli" className="h-8 w-auto" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">Sympli</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { console.log('🧭 Navigating to Past Symptoms'); router.push('/past-logs'); }}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Past Symptoms
              </button>
              <UserNavigation />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Chat or Timeline */}
      <main className="flex-1 flex flex-col p-6">
        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'timeline' && token ? (
          <SymptomTimeline token={token} />
        ) : (
          <SymptomChat />
        )}
      </main>
    </div>
  );
};

export default SymptomsPage;
