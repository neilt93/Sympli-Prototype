// Authentication utility functions

export interface AuthUser {
  id: string;
  email: string;
  onboarding_complete?: boolean;
  full_name?: string;
}

export interface AuthResult {
  isValid: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Check if the current auth token is valid
 */
export async function checkAuthToken(): Promise<AuthResult> {
  try {
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      return { isValid: false, error: 'No auth token found' }
    }

    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      return {
        isValid: true,
        user: data.user
      }
    } else {
      // Token is invalid, clear it
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
      return { isValid: false, error: 'Invalid auth token' }
    }
  } catch (error) {
    console.error('Error checking auth token:', error)
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    return { isValid: false, error: 'Error checking auth token' }
  }
}

/**
 * Get current user data from localStorage
 */
export function getCurrentUser(): AuthUser | null {
  try {
    const userData = localStorage.getItem('userData')
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Error parsing user data:', error)
    return null
  }
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  localStorage.removeItem('authToken')
  localStorage.removeItem('userData')
}

/**
 * Check if user is authenticated and has completed onboarding
 */
export async function isFullyAuthenticated(): Promise<boolean> {
  const authResult = await checkAuthToken()
  return authResult.isValid && authResult.user?.onboarding_complete === true
}

/**
 * Get the appropriate redirect URL based on user's onboarding status
 */
export function getRedirectUrl(user: AuthUser): string {
  if (user.onboarding_complete) {
    return '/chat'
  } else {
    return '/onboarding'
  }
}

/**
 * Check if user is authenticated but hasn't completed onboarding
 */
export async function isAuthenticatedButNotOnboarded(): Promise<boolean> {
  const authResult = await checkAuthToken()
  return authResult.isValid && authResult.user?.onboarding_complete !== true
}
