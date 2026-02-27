'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import UserNavigation from '../components/UserNavigation'

interface UserData {
  fullName?: string
  email?: string
  onboarding_complete?: boolean
}

interface OnboardingData {
  personalInformation?: {
    fullName?: string
    dateOfBirth?: string
    phoneNumber?: string
  }
  userRole?: 'myself' | 'caregiver'
  medicalInformation?: {
    age?: number
    sexAssignedAtBirth?: string
    chronicConditions?: string[]
    currentMedications?: string[]
    allergiesAndReactions?: string[]
  }
  medicalHistory?: {
    pastMedicalHistory?: string
    surgeriesAndProcedures?: string
    familyHistory?: string
  }
  symptomTracking?: {
    trackingGoals?: string[]
    additionalDetails?: string
  }
  caregiverConsent?: {
    patientFullName?: string
    patientAge?: number
    patientSex?: string
    relationship?: string
    consentMethod?: 'voice' | 'text'
    hasConsent?: boolean
    additionalNotes?: string
    takesResponsibility?: boolean
    patientAwareOfDataSharing?: boolean
  }
  requiredConsents?: {
    understandsNotDiagnostic?: boolean
    consentsToStorage?: boolean
    consentsToSummaryGeneration?: boolean
    allowsResearchParticipation?: boolean
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<OnboardingData | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      router.push('/auth')
      return
    }

    try {
      // Verify token with backend
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Token is invalid, clear storage and redirect to auth
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('onboardingData');
        router.push('/auth');
        return;
      }

      // Token is valid, check if onboarding is complete
      const userData = await response.json();
      console.log('🔍 Settings page - User data received:', userData);
      console.log('🔍 Settings page - Onboarding complete:', userData.user?.onboarding_complete);
      
      if (!userData.user?.onboarding_complete) {
        // User hasn't completed onboarding, redirect to onboarding
        console.log('⚠️ Settings page - Onboarding not complete, redirecting to onboarding');
        router.push('/onboarding');
        return;
      }

      try {
        // Load user data from API response
        setUserData(userData.user)
        
        // Also update localStorage with the fresh data
        localStorage.setItem('userData', JSON.stringify(userData.user))

        // Load onboarding data from MongoDB
        try {
          const response = await fetch('/api/onboarding/get', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            const onboardingData = await response.json()
            setOnboardingData(onboardingData)
            setEditData(onboardingData)
          } else if (response.status === 404) {
            // No onboarding data found, user hasn't completed onboarding
            console.log('No onboarding data found for user')
          } else {
            console.error('Failed to fetch onboarding data:', response.status)
          }
        } catch (fetchError) {
          console.error('Error fetching onboarding data:', fetchError)
          // Fallback to localStorage if API fails
          const storedOnboarding = localStorage.getItem('onboardingData')
          if (storedOnboarding) {
            setOnboardingData(JSON.parse(storedOnboarding))
            setEditData(JSON.parse(storedOnboarding))
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('onboardingData');
      router.push('/auth');
    }
  }

  const handleSave = async () => {
    if (!editData) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          onboardingData: editData,
          authToken: token
        })
      })

      if (response.ok) {
        // Update local storage as backup
        localStorage.setItem('onboardingData', JSON.stringify(editData))
        setOnboardingData(editData)
        setIsEditing(false)
        
        // Show success message
        alert('Settings updated successfully!')
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      alert('Failed to update settings. Please try again.')
    }
  }

  const handleCancel = () => {
    setEditData(onboardingData)
    setIsEditing(false)
  }

  const handleDeleteAccount = async () => {
    if (!userData) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: userData?.email })
      })

      if (response.ok) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('userData')
        localStorage.removeItem('onboardingData')
        router.push('/auth')
        alert('Your account has been deleted.')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-500 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/symptoms')}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-sm text-green-100">Manage your account and preferences</p>
            </div>
          </div>
          <UserNavigation showProfile={false} className="text-white" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* User Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p className="text-gray-900">{userData?.fullName || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{userData?.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onboarding Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  userData?.onboarding_complete 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userData?.onboarding_complete ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            </div>
          </div>

          {/* Onboarding Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Onboarding Information</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personal Information</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editData?.personalInformation?.fullName || ''}
                        onChange={(e) => setEditData(prev => ({
                          ...prev,
                          personalInformation: {
                            ...prev?.personalInformation,
                            fullName: e.target.value
                          }
                        }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editData?.personalInformation?.phoneNumber || ''}
                        onChange={(e) => setEditData(prev => ({
                          ...prev,
                          personalInformation: {
                            ...prev?.personalInformation,
                            phoneNumber: e.target.value
                          }
                        }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* User Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
                  <select
                    value={editData?.userRole || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, userRole: e.target.value as 'myself' | 'caregiver' }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select role</option>
                    <option value="myself">For Myself</option>
                    <option value="caregiver">As a Caregiver</option>
                  </select>
                </div>

                {/* Medical Information */}
                {editData?.userRole && (
                  <div className="border-t pt-6">
                    <h3 className="text-md font-medium text-gray-800 mb-4">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input
                          type="number"
                          value={editData?.medicalInformation?.age || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            medicalInformation: {
                              ...prev?.medicalInformation,
                              age: parseInt(e.target.value) || undefined
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter age"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                        <select
                          value={editData?.medicalInformation?.sexAssignedAtBirth || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            medicalInformation: {
                              ...prev?.medicalInformation,
                              sexAssignedAtBirth: e.target.value
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select sex</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chronic Conditions</label>
                        <textarea
                          value={editData?.medicalInformation?.chronicConditions?.join(', ') || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            medicalInformation: {
                              ...prev?.medicalInformation,
                              chronicConditions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter chronic conditions (comma-separated)"
                          rows={2}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
                        <textarea
                          value={editData?.medicalInformation?.currentMedications?.join(', ') || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            medicalInformation: {
                              ...prev?.medicalInformation,
                              currentMedications: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter medications (comma-separated)"
                          rows={2}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                        <textarea
                          value={editData?.medicalInformation?.allergiesAndReactions?.join(', ') || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            medicalInformation: {
                              ...prev?.medicalInformation,
                              allergiesAndReactions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter allergies (comma-separated)"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Caregiver Information */}
                {editData?.userRole === 'caregiver' && (
                  <div className="border-t pt-6">
                    <h3 className="text-md font-medium text-gray-800 mb-4">Caregiver Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                        <input
                          type="text"
                          value={editData?.caregiverConsent?.patientFullName || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            caregiverConsent: {
                              ...prev?.caregiverConsent,
                              patientFullName: e.target.value
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter patient name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Age</label>
                        <input
                          type="number"
                          value={editData?.caregiverConsent?.patientAge || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            caregiverConsent: {
                              ...prev?.caregiverConsent,
                              patientAge: parseInt(e.target.value) || undefined
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter patient age"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Sex</label>
                        <select
                          value={editData?.caregiverConsent?.patientSex || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            caregiverConsent: {
                              ...prev?.caregiverConsent,
                              patientSex: e.target.value
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select sex</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Consent Method</label>
                        <select
                          value={editData?.caregiverConsent?.consentMethod || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            caregiverConsent: {
                              ...prev?.caregiverConsent,
                              consentMethod: e.target.value as 'voice' | 'text'
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select consent method</option>
                          <option value="voice">Voice</option>
                          <option value="text">Text</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Display current onboarding data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-gray-900">{onboardingData?.personalInformation?.fullName || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <p className="text-gray-900">{onboardingData?.personalInformation?.dateOfBirth || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
                    <p className="text-gray-900 capitalize">{onboardingData?.userRole || 'Not set'}</p>
                  </div>
                  {onboardingData?.medicalInformation?.age && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <p className="text-gray-900">{onboardingData.medicalInformation.age}</p>
                    </div>
                  )}
                  {onboardingData?.medicalInformation?.sexAssignedAtBirth && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                      <p className="text-gray-900 capitalize">{onboardingData.medicalInformation.sexAssignedAtBirth}</p>
                    </div>
                  )}
                  {onboardingData?.medicalInformation?.chronicConditions && onboardingData.medicalInformation.chronicConditions.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chronic Conditions</label>
                      <p className="text-gray-900">{onboardingData.medicalInformation.chronicConditions.join(', ')}</p>
                    </div>
                  )}
                  {onboardingData?.medicalInformation?.currentMedications && onboardingData.medicalInformation.currentMedications.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
                      <p className="text-gray-900">{onboardingData.medicalInformation.currentMedications.join(', ')}</p>
                    </div>
                  )}
                  {onboardingData?.medicalInformation?.allergiesAndReactions && onboardingData.medicalInformation.allergiesAndReactions.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                      <p className="text-gray-900">{onboardingData.medicalInformation.allergiesAndReactions.join(', ')}</p>
                    </div>
                  )}
                </div>

                {onboardingData?.userRole === 'caregiver' && onboardingData?.caregiverConsent && (
                  <div className="border-t pt-6">
                    <h3 className="text-md font-medium text-gray-800 mb-4">Caregiver Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                        <p className="text-gray-900">{onboardingData.caregiverConsent.patientFullName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Age</label>
                        <p className="text-gray-900">{onboardingData.caregiverConsent.patientAge || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Sex</label>
                        <p className="text-gray-900 capitalize">{onboardingData.caregiverConsent.patientSex || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Consent Method</label>
                        <p className="text-gray-900 capitalize">{onboardingData.caregiverConsent.consentMethod || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!onboardingData && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No onboarding information found. Complete the onboarding process to see your information here.</p>
                    <button
                      onClick={() => router.push('/onboarding')}
                      className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Complete Onboarding
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy & Security */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Privacy & Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">Data Encryption</h3>
                  <p className="text-sm text-gray-600">Your health data is encrypted end-to-end</p>
                </div>
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">HIPAA Compliance</h3>
                  <p className="text-sm text-gray-600">We follow strict healthcare privacy standards</p>
                </div>
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">No Data Sharing</h3>
                  <p className="text-sm text-gray-600">We never sell or share your personal health data</p>
                </div>
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-800 mb-2">Delete Account</h2>
                <p className="text-red-700 text-sm mb-4">
                  This action cannot be undone. This will permanently delete your account and all associated data including:
                </p>
                <ul className="text-red-700 text-sm space-y-1 mb-4">
                  <li>• All symptom logs and health data</li>
                  <li>• Onboarding information and preferences</li>
                  <li>• Account settings and personal information</li>
                  <li>• Any stored medical information</li>
                </ul>
                <p className="text-red-700 text-sm font-medium">
                  Please ensure you have exported any important data before proceeding.
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account?</h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
