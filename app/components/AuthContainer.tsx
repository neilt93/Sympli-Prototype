'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthContainerProps {
  onAuthSuccess: (token: string, user: any) => void
}

export default function AuthContainer({ onAuthSuccess }: AuthContainerProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('authToken')
    const userData = localStorage.getItem('userData')
    
    if (token && userData) {
      // Verify token with backend
      verifyToken(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Token is valid, redirect to main app
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        onAuthSuccess(token, userData)
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem('authToken')
        localStorage.removeItem('userData')
        setIsLoading(false)
      }
    } catch (error) {
      // Network error, clear storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = (token: string, user: any) => {
    onAuthSuccess(token, user)
  }

  const handleRegisterSuccess = (token: string, user: any) => {
    onAuthSuccess(token, user)
  }

  const switchToLogin = () => setIsLogin(true)
  const switchToRegister = () => setIsLogin(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-4">
              <span className="text-3xl">🏥</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sympli Health</h1>
            <p className="text-xl text-gray-600">Your Personal Health Companion</p>
          </motion.div>
        </div>

        {/* Auth Forms */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LoginForm
                  onSwitchToRegister={switchToRegister}
                  onLoginSuccess={handleLoginSuccess}
                />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterForm
                  onSwitchToLogin={switchToLogin}
                  onRegisterSuccess={handleRegisterSuccess}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-8 text-gray-500"
        >
          <p className="text-sm">
            Secure • HIPAA Compliant • GDPR Compliant
          </p>
        </motion.div>
      </div>
    </div>
  )
}
