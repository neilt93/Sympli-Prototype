#!/usr/bin/env python3
"""
Test script to verify backend connection and auth service
"""

import requests
import json

def test_backend_connection():
    """Test if the backend is running and accessible"""
    print("🧪 Testing backend connection...")
    
    try:
        # Test basic connectivity
        response = requests.get('http://localhost:5000/health', timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and accessible")
            return True
        else:
            print(f"❌ Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        return False

def test_auth_service():
    """Test the auth service directly"""
    print("\n🧪 Testing auth service...")
    
    try:
        # Test user registration
        test_user = {
            "email": "test@example.com",
            "password": "testpassword123",
            "username": "testuser",
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "1990-01-01",
            "phone": "+1234567890",
            "emergency_contact": {
                "name": "Emergency Contact",
                "phone": "+1234567890",
                "relationship": "Spouse"
            },
            "medical_conditions": [],
            "allergies": [],
            "medications": [],
            "blood_type": "O+",
            "height_cm": 175,
            "weight_kg": 70,
            "is_active": True,
            "is_verified": False,
            "role": "user",
            "preferences": {},
            "gdpr_consent": True
        }
        
        response = requests.post(
            'http://localhost:5000/api/auth/register',
            json=test_user,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ User registration successful")
            user_data = response.json()
            print(f"   User ID: {user_data.get('user', {}).get('id')}")
            return True
        else:
            print(f"❌ User registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing auth service: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting backend connection tests...")
    print("=" * 50)
    
    backend_ok = test_backend_connection()
    
    if backend_ok:
        auth_ok = test_auth_service()
    else:
        print("\n⚠️  Skipping auth service test due to backend connection failure")
        auth_ok = False
    
    print("\n" + "=" * 50)
    print("🏁 Test Results:")
    print(f"   Backend Connection: {'✅ OK' if backend_ok else '❌ FAILED'}")
    print(f"   Auth Service: {'✅ OK' if auth_ok else '❌ FAILED'}")
    
    if not backend_ok:
        print("\n💡 To fix backend connection issues:")
        print("   1. Make sure the backend is running: python app.py")
        print("   2. Check if port 5000 is available")
        print("   3. Verify environment variables are set")
