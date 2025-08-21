'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '../components/LoginForm'
import RegisterForm from '../components/RegisterForm'

export default function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAuthenticated, setHasAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Skip if we've already authenticated in this session
    if (hasAuthenticated) {
      return
    }

    // Check if user is already authenticated
    const token = localStorage.getItem('authToken')
    if (token) {
      // Verify token with backend
      fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (response.ok) {
          response.json().then(userData => {
            console.log('🔍 Auth page - User data:', userData);
            console.log('🔍 Auth page - Onboarding complete:', userData.user?.onboarding_complete);
            setHasAuthenticated(true)
            // Check if onboarding is complete
            if (userData.user?.onboarding_complete) {
              console.log('✅ Auth page - Redirecting to symptoms');
              router.push('/symptoms')
            } else {
              console.log('⚠️ Auth page - Redirecting to onboarding');
              router.push('/onboarding')
            }
          })
        } else {
          localStorage.removeItem('authToken')
          setIsLoading(false)
        }
      })
      .catch(() => {
        localStorage.removeItem('authToken')
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, []) // Remove router dependency

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Home Button */}
      <div className="max-w-md mx-auto mb-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>
      </div>
      
      <div className="max-w-md mx-auto">
        {isLogin ? (
          <LoginForm 
            onLoginSuccess={(token: string, user: any) => {
              // Store user data and check onboarding status
              localStorage.setItem('authToken', token)
              localStorage.setItem('userData', JSON.stringify(user))
              setHasAuthenticated(true)
              
              // Redirect based on onboarding completion
              if (user.onboarding_complete) {
                router.push('/symptoms')
              } else {
                router.push('/onboarding')
              }
            }}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm 
            onRegisterSuccess={(token: string, user: any) => {
              // Store user data and check onboarding status
              localStorage.setItem('authToken', token)
              localStorage.setItem('userData', JSON.stringify(user))
              setHasAuthenticated(true)
              
              // New users should always go to onboarding
              router.push('/onboarding')
            }}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  )
}
