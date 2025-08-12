'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import SymptomChat from './components/SymptomChat'

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      // Get onboarding completion status from localStorage
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const onboardingData = JSON.parse(localStorage.getItem('onboardingData') || '{}');
      
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Onboarding-Complete': userData.onboarding_complete ? 'true' : 'false',
          'X-Has-Onboarding-Data': onboardingData.isComplete ? 'true' : 'false'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        
        // CRITICAL SECURITY CHECK: Verify user data is valid
        if (!userData.user || !userData.user.id || !userData.user.email) {
          console.error('❌ Invalid user data received from backend');
          localStorage.removeItem('authToken')
          localStorage.removeItem('userData')
          setIsAuthenticated(false)
          setUser(null)
          router.push('/auth')
          return
        }
        
        setUser(userData.user)
        setIsAuthenticated(true)
        setNeedsEmailVerification(userData.user.needs_email_verification || false)
        
        // Check if onboarding is complete
        console.log('User data received:', userData.user);
        console.log('Onboarding complete from API:', userData.user.onboarding_complete);
        console.log('Onboarding complete from localStorage:', onboardingData.isComplete);
        console.log('Email verification needed:', userData.user.needs_email_verification);
        
        // Check both API response and localStorage for onboarding completion
        const isOnboardingComplete = userData.user.onboarding_complete || onboardingData.isComplete;
        
        if (!isOnboardingComplete) {
          console.log('Redirecting to onboarding...');
          router.push('/onboarding')
          return
        }
        console.log('Onboarding complete, staying on main page');
      } else {
        console.error('❌ Auth verification failed:', response.status, response.statusText);
        // SECURITY: Clear auth data on verification failure
        console.log('🔒 Clearing auth data due to verification failure');
        localStorage.removeItem('authToken')
        localStorage.removeItem('userData')
        setIsAuthenticated(false)
        setUser(null)
        router.push('/auth')
        return
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error)
      // SECURITY: Clear auth data on any error for security
      console.log('🔒 Clearing auth data due to error');
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    setIsAuthenticated(false)
    setUser(null)
  }

  const handleResendEmail = async () => {
    setIsResendingEmail(true)
    try {
      const email = user?.email || localStorage.getItem('pendingVerificationEmail')
      if (!email) {
        alert('No email found. Please register again.')
        return
      }

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        alert('Verification email sent! Please check your inbox.')
        // Store email for verification page
        localStorage.setItem('pendingVerificationEmail', email)
        // Redirect to verification page
        router.push('/verify-email')
      } else {
        alert(data.error || 'Failed to resend verification email')
      }
    } catch (error) {
      alert('Network error while resending verification email')
    } finally {
      setIsResendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Sympli...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/auth')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-500 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <img src="/logo-icon.svg" alt="Sympli" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sympli</h1>
              <p className="text-sm text-green-100">Voice-first health companion</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/settings')}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Settings
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Email Verification Banner */}
      {needsEmailVerification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-yellow-50 border-b border-yellow-200"
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-yellow-800 font-medium">Email verification required</p>
                  <p className="text-yellow-700 text-sm">Please verify your email address to access all features</p>
                </div>
              </div>
              <button
                onClick={handleResendEmail}
                disabled={isResendingEmail}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {isResendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Resend Email
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SymptomChat />
      </div>
    </div>
  )
}
