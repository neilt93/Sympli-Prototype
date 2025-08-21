'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface UserNavigationProps {
  showProfile?: boolean;
  showLogout?: boolean;
  className?: string;
}

export default function UserNavigation({ 
  showProfile = true, 
  showLogout = true, 
  className = "" 
}: UserNavigationProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('onboardingData');
    router.push('/auth');
  };

  const isWhiteTheme = className.includes('text-white');
  const buttonClass = isWhiteTheme 
    ? "text-white hover:text-white/80 px-3 py-2 rounded-md text-sm font-medium transition-colors"
    : "text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors";

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {showProfile && (
        <button
          onClick={() => {
            console.log('🔍 Profile button clicked, navigating to /settings');
            router.push('/settings');
          }}
          className={`${buttonClass} flex items-center`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </button>
      )}
      {showLogout && (
        <button
          onClick={handleLogout}
          className={buttonClass}
        >
          Logout
        </button>
      )}
    </div>
  );
}
