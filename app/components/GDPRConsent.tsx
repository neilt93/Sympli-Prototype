'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { storeGDPRConsent, checkGDPRConsent, type GDPRConsent } from '../lib/google-auth'

interface GDPRConsentProps {
  onConsentComplete: () => void
  isVisible: boolean
}

export default function GDPRConsent({ onConsentComplete, isVisible }: GDPRConsentProps) {
  const [consent, setConsent] = useState<GDPRConsent>({
    essential: true, // Essential cookies are always required
    analytics: false,
    marketing: false,
    thirdParty: false,
    timestamp: new Date()
  })
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check if consent already exists
    const existingConsent = checkGDPRConsent()
    if (existingConsent) {
      onConsentComplete()
    }
  }, [onConsentComplete])

  const handleConsentChange = (type: keyof GDPRConsent, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const handleSubmit = () => {
    // Store consent
    storeGDPRConsent(consent)
    
    // Log consent for audit purposes
    console.log('GDPR: User consent recorded', {
      consent,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })
    
    onConsentComplete()
  }

  const handleRejectAll = () => {
    setConsent({
      essential: true,
      analytics: false,
      marketing: false,
      thirdParty: false,
      timestamp: new Date()
    })
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Consent</h2>
          <p className="text-gray-600">We respect your privacy and need your consent to process your data</p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Essential Cookies - Always enabled */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="essential"
              checked={consent.essential}
              disabled
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="essential" className="text-sm font-medium text-gray-900">
                Essential Cookies
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Required for basic functionality. Cannot be disabled.
              </p>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="analytics"
              checked={consent.analytics}
              onChange={(e) => handleConsentChange('analytics', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="analytics" className="text-sm font-medium text-gray-900">
                Analytics Cookies
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Help us improve our service by understanding how you use it.
              </p>
            </div>
          </div>

          {/* Marketing Cookies */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="marketing"
              checked={consent.marketing}
              onChange={(e) => handleConsentChange('marketing', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="marketing" className="text-sm font-medium text-gray-900">
                Marketing Cookies
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Used to deliver personalized content and advertisements.
              </p>
            </div>
          </div>

          {/* Third-party Services */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="thirdParty"
              checked={consent.thirdParty}
              onChange={(e) => handleConsentChange('thirdParty', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="thirdParty" className="text-sm font-medium text-gray-900">
                Third-party Services
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Required for Google Sign-in and external integrations.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Policy Links */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-green-600 hover:text-green-500 underline"
          >
            {showDetails ? 'Hide' : 'Show'} Privacy Details
          </button>
          
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600"
            >
              <p className="mb-2">
                <strong>Data Processing:</strong> We process your data for authentication, service delivery, and improvement purposes.
              </p>
              <p className="mb-2">
                <strong>Data Retention:</strong> Your data is retained for as long as your account is active or as required by law.
              </p>
              <p className="mb-2">
                <strong>Your Rights:</strong> You have the right to access, rectify, delete, and export your data at any time.
              </p>
              <p>
                <strong>Third Parties:</strong> Google services are used for authentication. Data shared with Google is subject to their privacy policy.
              </p>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRejectAll}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!consent.essential}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Accept Selected
          </button>
        </div>

        {/* Legal Notice */}
        <p className="text-xs text-gray-500 text-center mt-4">
          By continuing, you agree to our{' '}
          <a href="/privacy" className="text-green-600 hover:text-green-500 underline">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" className="text-green-600 hover:text-green-500 underline">
            Terms of Service
          </a>
        </p>
      </motion.div>
    </motion.div>
  )
}
