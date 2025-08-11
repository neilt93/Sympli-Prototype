'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { triggerGoogleSignIn, initializeGoogleSignIn, isGoogleSignInConfigured } from '../lib/google-auth'

interface RegisterFormProps {
  onRegisterSuccess: (token: string, user: any) => void
  onSwitchToLogin: () => void
}

export default function RegisterForm({ onRegisterSuccess, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    bloodType: '',
    allergies: '',
    medications: '',
    emergencyContact: '',
    consent: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [googleSignInReady, setGoogleSignInReady] = useState(false)

  const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']

  // Initialize Google Sign-in when component mounts
  useEffect(() => {
    const initGoogleSignIn = async () => {
      // Wait for Google script to load
      const checkGoogle = () => {
        if (typeof window !== 'undefined' && window.google) {
          const googleId = initializeGoogleSignIn()
          if (googleId) {
            setGoogleSignInReady(true)
          }
        } else {
          // Check again in 100ms
          setTimeout(checkGoogle, 100)
        }
      }
      checkGoogle()
    }

    initGoogleSignIn()
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      if (!googleSignInReady) {
        setError('Google Sign-in is not ready yet. Please wait a moment and try again.')
        return
      }
      triggerGoogleSignIn()
    } catch (error) {
      console.error('Google Sign-in error:', error)
      setError('Google Sign-in failed. Please try again.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!formData.consent) {
      setError('Please accept the terms and conditions')
      setIsLoading(false)
      return
    }

    try {
      console.log('🔐 Starting registration process...')
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          bloodType: formData.bloodType,
          allergies: formData.allergies,
          medications: formData.medications,
          emergencyContact: formData.emergencyContact
        }),
      })

      const data = await response.json()
      console.log('📡 Registration response:', { status: response.status, data })

      if (response.ok) {
        console.log('✅ Registration successful, user data:', data.user)
        
        if (data.requiresEmailVerification) {
          setSuccess('Registration successful! Please check your email to verify your account before signing in.')
          // Store email for verification page
          localStorage.setItem('pendingVerificationEmail', formData.email)
          // Redirect to verification page
          setTimeout(() => {
            window.location.href = '/verify-email'
          }, 2000)
        } else {
          setSuccess('Registration successful! Welcome to Sympli Health.')
          setTimeout(() => {
            // Use access_token from the response, not token
            onRegisterSuccess(data.access_token, data.user)
          }, 1500)
        }
      } else {
        console.error('❌ Registration failed:', data.error)
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      console.error('❌ Registration network error:', err)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Header */}
      <div className="bg-green-500 rounded-t-2xl p-6 text-white text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <img src="/logo.svg" alt="Sympli" className="h-12" />
        </div>
        <p className="text-sm text-green-100 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          Voice-first health companion
        </p>
      </div>

      {/* Google Sign-in */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            minLength={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="Create a password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="Confirm your password"
          />
        </div>

        <div>
          <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700 mb-2">
            Blood Type
          </label>
          <select
            id="bloodType"
            name="bloodType"
            value={formData.bloodType}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">Select blood type</option>
            {bloodTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-2">
            Allergies
          </label>
          <input
            type="text"
            id="allergies"
            name="allergies"
            value={formData.allergies}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="List any allergies (optional)"
          />
        </div>

        <div>
          <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-2">
            Current Medications
          </label>
          <input
            type="text"
            id="medications"
            name="medications"
            value={formData.medications}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="List current medications (optional)"
          />
        </div>

        <div>
          <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Contact
          </label>
          <input
            type="text"
            id="emergencyContact"
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="Emergency contact name & phone (optional)"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent"
            name="consent"
            checked={formData.consent}
            onChange={handleInputChange}
            className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="consent" className="text-sm text-gray-600">
            I agree to the{' '}
            <a href="#" className="text-green-600 hover:text-green-500 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-green-600 hover:text-green-500 underline">
              Privacy Policy
            </a>
            . I consent to the collection and processing of my health data in accordance with GDPR regulations.
          </label>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm"
          >
            {success}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-green-600 hover:text-green-500 font-medium underline"
          >
            Sign in
          </button>
        </p>
      </div>

      {/* Privacy Statement */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Private & HIPAA-compliant
        </div>
      </div>
    </motion.div>
  )
}
