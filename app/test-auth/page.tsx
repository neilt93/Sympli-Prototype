'use client'

import { useState } from 'react'

export default function TestAuth() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          passwordHash: 'test123'
        }),
      })

      const data = await response.json()
      setResult(`Login Response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setResult(`Login Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testRegister = async () => {
    setLoading(true)
    setResult('')
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Test User',
          email: 'test@example.com',
          passwordHash: 'test123'
        }),
      })

      const data = await response.json()
      setResult(`Register Response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setResult(`Register Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication API Test</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Test Login API
          </button>
          
          <button
            onClick={testRegister}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 ml-4"
          >
            Test Register API
          </button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Testing API...</p>
          </div>
        )}

        {result && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">API Response:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

