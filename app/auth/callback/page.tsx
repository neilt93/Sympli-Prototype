'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the URL parameters that Supabase sends
      const access_token = searchParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      console.log('🔐 Auth callback received:', { 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token, 
        type, 
        error 
      });

      if (error) {
        console.error('❌ Auth callback error:', error, error_description);
        setStatus('error');
        setMessage(error_description || 'Authentication failed');
        return;
      }

      if (type === 'signup' && access_token && refresh_token) {
        // Set the session in Supabase
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setStatus('error');
          setMessage('Failed to create session');
          return;
        }

        if (data.user) {
          console.log('✅ Email verified and user authenticated:', data.user.email);
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to app...');
          
          // Redirect to the app after a short delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No user data received');
        }
      } else {
        // Handle other auth types or missing tokens
        setStatus('error');
        setMessage('Invalid authentication parameters');
      }
    } catch (error) {
      console.error('❌ Auth callback error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="bg-green-500 rounded-t-2xl p-6 text-white text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="text-2xl font-extrabold tracking-wide">Sympli</div>
            </div>
            <h2 className="text-2xl font-bold">Email Verification</h2>
          </div>

          {/* Content */}
          <div className="bg-white rounded-b-2xl p-6 shadow-lg">
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Verifying your email...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Verified!</h3>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to app...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Failed</h3>
                <p className="text-gray-600 mb-4">{message}</p>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/auth')}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Go to Login
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}

