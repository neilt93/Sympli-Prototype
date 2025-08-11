// Google OAuth configuration
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

// GDPR-compliant Google OAuth scopes - minimal required scopes
export const GOOGLE_SCOPES = [
  'openid',
  'email'
  // Removed 'profile' scope to minimize data collection
]

// GDPR consent state
export interface GDPRConsent {
  essential: boolean
  analytics: boolean
  marketing: boolean
  thirdParty: boolean
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

// Check if Google Sign-in is properly configured
export const isGoogleSignInConfigured = () => {
  return GOOGLE_CLIENT_ID !== '' && typeof window !== 'undefined' && window.google
}

// Check GDPR consent before proceeding
export const checkGDPRConsent = (): GDPRConsent | null => {
  if (typeof window === 'undefined') return null
  
  const consent = localStorage.getItem('gdpr_consent')
  if (!consent) return null
  
  try {
    const parsed = JSON.parse(consent)
    // Check if consent is still valid (not older than 1 year)
    const consentDate = new Date(parsed.timestamp)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    if (consentDate < oneYearAgo) {
      localStorage.removeItem('gdpr_consent')
      return null
    }
    
    return parsed
  } catch {
    localStorage.removeItem('gdpr_consent')
    return null
  }
}

// Store GDPR consent
export const storeGDPRConsent = (consent: GDPRConsent) => {
  if (typeof window === 'undefined') return
  
  // Add metadata
  const consentWithMetadata = {
    ...consent,
    ipAddress: 'collected', // We'll get actual IP from backend
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  }
  
  localStorage.setItem('gdpr_consent', JSON.stringify(consentWithMetadata))
}

// Google Sign-in configuration with GDPR compliance
export const googleSignInConfig = {
  client_id: GOOGLE_CLIENT_ID,
  scope: GOOGLE_SCOPES.join(' '),
  ux_mode: 'popup',
  redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
  // GDPR compliance settings
  prompt: 'consent', // Always show consent screen
  access_type: 'offline', // Don't request refresh tokens by default
}

// Initialize Google Sign-in with GDPR compliance
export const initializeGoogleSignIn = () => {
  if (!isGoogleSignInConfigured()) {
    console.warn('Google Sign-in not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env file')
    return null
  }

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleSignInCallback,
      auto_select: false, // GDPR: Don't auto-select user
      cancel_on_tap_outside: true,
      prompt_parent_id: 'google-signin-container', // Custom container for better UX
      // GDPR compliance
      prompt: 'consent',
      access_type: 'offline',
    })

    return window.google.accounts.id
  } catch (error) {
    console.error('Failed to initialize Google Sign-in:', error)
    return null
  }
}

// Handle Google Sign-in callback with GDPR compliance
export const handleGoogleSignInCallback = async (response: any) => {
  try {
    const { credential } = response
    
    // Check GDPR consent before proceeding
    const consent = checkGDPRConsent()
    if (!consent || !consent.thirdParty) {
      alert('GDPR consent required for Google Sign-in. Please accept third-party data processing.')
      return
    }
    
    // Send the ID token to our backend with consent information
    const authResponse = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential,
        gdprConsent: consent,
        dataProcessingConsent: true,
        // GDPR: Only send minimal required data
        requestedScopes: GOOGLE_SCOPES,
      }),
    })

    if (authResponse.ok) {
      const data = await authResponse.json()
      
      // Store authentication data with GDPR compliance
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('userData', JSON.stringify(data.user))
      
      // Log GDPR-compliant data processing
      console.log('GDPR: User data processed with consent', {
        consent: consent,
        dataProcessed: new Date().toISOString(),
        purpose: 'authentication'
      })
      
      // Redirect to main app
      window.location.href = '/'
    } else {
      const errorData = await authResponse.json()
      console.error('Google authentication failed:', errorData.error)
      alert('Google authentication failed. Please try again.')
    }
  } catch (error) {
    console.error('Error during Google authentication:', error)
    alert('An error occurred during authentication. Please try again.')
  }
}

// Trigger Google Sign-in with GDPR compliance check
export const triggerGoogleSignIn = () => {
  if (!isGoogleSignInConfigured()) {
    alert('Google Sign-in is not configured. Please contact support or try signing in with email/password.')
    return
  }

  // Check GDPR consent
  const consent = checkGDPRConsent()
  if (!consent) {
    alert('GDPR consent required. Please accept the privacy policy and terms first.')
    return
  }

  if (!consent.thirdParty) {
    alert('Third-party data processing consent required for Google Sign-in.')
    return
  }

  try {
    window.google.accounts.id.prompt()
  } catch (error) {
    console.error('Failed to trigger Google Sign-in:', error)
    alert('Failed to start Google Sign-in. Please try again.')
  }
}

// GDPR: Data deletion request
export const requestDataDeletion = async () => {
  try {
    const response = await fetch('/api/auth/gdpr/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    })
    
    if (response.ok) {
      // Clear local data
      localStorage.clear()
      alert('Your data has been deleted as requested.')
      window.location.href = '/auth'
    } else {
      alert('Failed to delete data. Please contact support.')
    }
  } catch (error) {
    console.error('Error requesting data deletion:', error)
    alert('Error processing deletion request. Please try again.')
  }
}

// GDPR: Export user data
export const exportUserData = async () => {
  try {
    const response = await fetch('/api/auth/gdpr/export', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'user-data-export.json'
      a.click()
      window.URL.revokeObjectURL(url)
    } else {
      alert('Failed to export data. Please try again.')
    }
  } catch (error) {
    console.error('Error exporting user data:', error)
    alert('Error exporting data. Please try again.')
  }
}

// Declare global types for Google
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
      }
    }
  }
}
