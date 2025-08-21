'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  // Check if there's a token in the URL (from email verification link)
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    if (token && type === 'signup') {
      verifyEmail(token);
    }
  }, [token, type]);

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    try {
      // Call Supabase to verify the email
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus('success');
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setErrorMessage(data.error || 'Email verification failed');
      }
    } catch (error) {
      setVerificationStatus('error');
      setErrorMessage('Network error during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const email = localStorage.getItem('pendingVerificationEmail');
      if (!email) {
        setErrorMessage('No email found. Please register again.');
        return;
      }

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setErrorMessage('');
        alert('Verification email sent! Please check your inbox.');
      } else {
        setErrorMessage(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      setErrorMessage('Network error while resending verification email');
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
              <img src="/logo.svg" alt="Sympli" className="h-12" />
            </div>
            <h2 className="text-2xl font-bold">Email Verification</h2>
          </div>

          {/* Content */}
          <div className="bg-white rounded-b-2xl p-6 shadow-lg">
            {isVerifying && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Verifying your email...</p>
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Verified!</h3>
                <p className="text-gray-600 mb-4">Your email has been successfully verified. You can now sign in to your account.</p>
                <p className="text-sm text-gray-500">Redirecting to login page...</p>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Failed</h3>
                <p className="text-gray-600 mb-4">{errorMessage}</p>
                <button
                  onClick={resendVerificationEmail}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Resend Verification Email
                </button>
              </div>
            )}

            {verificationStatus === 'pending' && !token && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-gray-600 mb-4">
                  We've sent a verification link to your email address. Please click the link to verify your account.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={resendVerificationEmail}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Resend Verification Email
                  </button>
                  <button
                    onClick={() => router.push('/auth')}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
