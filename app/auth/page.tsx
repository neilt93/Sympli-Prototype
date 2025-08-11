'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '../components/LoginForm'
import RegisterForm from '../components/RegisterForm'

export default function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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
            // Check if onboarding is complete
            if (userData.onboarding_complete) {
              router.push('/')
            } else {
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
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {isLogin ? (
          <LoginForm 
            onLoginSuccess={(token: string, user: any) => {
              // Store user data and check onboarding status
              localStorage.setItem('authToken', token)
              localStorage.setItem('userData', JSON.stringify(user))
              
              // Redirect based on onboarding completion
              if (user.onboarding_complete) {
                router.push('/')
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
