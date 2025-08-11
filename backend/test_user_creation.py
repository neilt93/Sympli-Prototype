#!/usr/bin/env python3
"""
Test script to verify user creation works with the updated auth service
"""

import os
import sys
import asyncio
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.auth_service import AuthService
from models.user import UserCreate

def test_user_creation():
    """Test creating a new user"""
    print("🧪 Testing user creation...")
    
    # Initialize auth service
    auth_service = AuthService()
    
    # Create test user data
    test_user = UserCreate(
        email="test@example.com",
        password="testpassword123",
        username="testuser",
        first_name="Test",
        last_name="User",
        date_of_birth="1990-01-01",
        phone="+1234567890",
        emergency_contact={
            "name": "Emergency Contact",
            "phone": "+1234567890",
            "relationship": "Spouse"
        },
        medical_conditions=[],
        allergies=[],
        medications=[],
        blood_type="O+",
        height_cm=175,
        weight_kg=70,
        is_active=True,
        is_verified=False,
        role="user",
        preferences={},
        gdpr_consent=True
    )
    
    try:
        # Attempt to register the user
        success, message, user_response = auth_service.register_user(
            test_user,
            ip_address="127.0.0.1",
            user_agent="Test Script"
        )
        
        if success:
            print(f"✅ User creation successful!")
            print(f"   User ID: {user_response.id}")
            print(f"   Email: {user_response.email}")
            print(f"   Message: {message}")
        else:
            print(f"❌ User creation failed: {message}")
            
    except Exception as e:
        print(f"❌ Exception during user creation: {e}")
        import traceback
        traceback.print_exc()

def test_user_authentication():
    """Test user authentication"""
    print("\n🧪 Testing user authentication...")
    
    auth_service = AuthService()
    
    try:
        # Test authentication with the created user
        from models.user import UserLogin
        
        login_data = UserLogin(
            email="test@example.com",
            password="testpassword123"
        )
        
        success, message, auth_response = auth_service.authenticate_user(
            login_data,
            ip_address="127.0.0.1",
            user_agent="Test Script"
        )
        
        if success:
            print(f"✅ Authentication successful!")
            print(f"   User ID: {auth_response['user'].id}")
            print(f"   Access Token: {auth_response['access_token'][:20]}...")
            print(f"   Message: {message}")
        else:
            print(f"❌ Authentication failed: {message}")
            
    except Exception as e:
        print(f"❌ Exception during authentication: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting user creation and authentication tests...")
    print("=" * 50)
    
    test_user_creation()
    test_user_authentication()
    
    print("\n" + "=" * 50)
    print("🏁 Tests completed!")
