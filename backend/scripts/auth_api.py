#!/usr/bin/env python3
"""
Sympli Health - Authentication API
Uses Supabase Auth for secure user management
"""

import os
import sys
import json
import secrets
import hashlib
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import jwt

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from root directory FIRST
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env'))

from supabase import create_client, Client

# Initialize Supabase client with service role key to bypass RLS
url = os.getenv("SUPABASE_URL")
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"🔍 Environment check:")
print(f"   SUPABASE_URL: {'✅ Set' if url else '❌ Missing'}")
print(f"   SUPABASE_SERVICE_ROLE_KEY: {'✅ Set' if service_key else '❌ Missing'}")

# Check if we're in demo mode - DISABLED FOR PRODUCTION
demo_mode = False  # Force disable demo mode

if not url or not service_key:
    print("❌ CRITICAL: Supabase credentials not configured!")
    print("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
    raise Exception("Supabase credentials required - demo mode disabled")
else:
    try:
        supabase: Client = create_client(url, service_key)
        # Test the connection
        result = supabase.table("users").select("count", count="exact").limit(1).execute()
        print("✅ Supabase connection successful with service role")
        print(f"   Database users count: {result.count if hasattr(result, 'count') else 'unknown'}")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        raise Exception(f"Failed to connect to Supabase: {e}")

# For backward compatibility
SessionLocal = type('SessionLocal', (), {})
User = type('User', (), {'id': None})
AuditLog = type('AuditLog', (), {})

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['JWT_EXPIRATION_HOURS'] = 24

# Enable CORS
CORS(app, origins=['http://localhost:3000', 'http://localhost:5173'])

class UserManager:
    """Manages user operations using Supabase Auth"""
    
    @staticmethod
    def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user using Supabase Auth"""
        try:
            email = user_data.get('email', '').lower().strip()
            password = user_data.get('password', '')
            
            # Validate input
            if not email or not password:
                return {'error': 'Email and password are required'}
            
            if len(password) < 8:
                return {'error': 'Password must be at least 8 characters long'}
            
            # Create user in Supabase Auth
            try:
                auth_response = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True  # Auto-confirm email for demo
                })
                
                if auth_response.user:
                    user_id = auth_response.user.id
                    print(f"✅ User created in Supabase Auth: {email} (ID: {user_id})")
                    
                    # Create profile in public.users table
                    profile_data = {
                        "id": user_id,  # Use the auth.users ID
                        "email": email,
                        "full_name": user_data.get('full_name', ''),
                        "created_at": datetime.utcnow().isoformat(),
                        "is_active": True,
                        "profile": json.dumps(user_data.get('profile', {})),
                        "onboarding_complete": False
                    }
                    
                    # Insert into public.users table
                    result = supabase.table("users").insert(profile_data).execute()
                    
                    if result.data:
                        print(f"✅ User profile created in public.users: {email}")
                        return {
                            'success': True, 
                            'user_id': user_id,
                            'user': {
                                'id': user_id,
                                'email': email,
                                'full_name': user_data.get('full_name', ''),
                                'onboarding_complete': False
                            }
                        }
                    else:
                        print(f"❌ Failed to create user profile: {email}")
                        return {'error': 'Failed to create user profile'}
                        
                else:
                    print(f"❌ Failed to create user in Supabase Auth: {email}")
                    return {'error': 'Failed to create user account'}
                    
            except Exception as e:
                print(f"❌ Supabase Auth error creating user {email}: {e}")
                if "already registered" in str(e).lower():
                    return {'error': 'User already exists'}
                return {'error': f'Authentication error: {str(e)}'}
            
        except Exception as e:
            return {'error': f'Failed to create user: {str(e)}'}
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Dict[str, Any]:
        """Authenticate user using Supabase Auth"""
        try:
            email = email.lower().strip()
            
            # Authenticate with Supabase Auth
            try:
                auth_response = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })
                
                if auth_response.user:
                    user_id = auth_response.user.id
                    print(f"✅ User authenticated: {email} (ID: {user_id})")
                    
                    # Get user profile from public.users table
                    result = supabase.table("users").select("*").eq("id", user_id).execute()
                    user_profile = result.data[0] if result.data else None
                    
                    # Update last login
                    supabase.table("users").update({
                        "last_login": datetime.utcnow().isoformat()
                    }).eq("id", user_id).execute()
                    
                    return {
                        'success': True,
                        'user': {
                            'id': user_id,
                            'email': email,
                            'full_name': user_profile.get('full_name', '') if user_profile else '',
                            'onboarding_complete': user_profile.get('onboarding_complete', False) if user_profile else False,
                            'is_active': user_profile.get('is_active', True) if user_profile else True
                        },
                        'access_token': auth_response.session.access_token,
                        'refresh_token': auth_response.session.refresh_token
                    }
                else:
                    return {'error': 'Invalid credentials'}
                    
            except Exception as e:
                print(f"❌ Supabase Auth error: {e}")
                return {'error': 'Invalid credentials'}
            
        except Exception as e:
            return {'error': f'Authentication error: {str(e)}'}
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID"""
        try:
            result = supabase.table("users").select("*").eq("id", user_id).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

class JWTManager:
    """Manages JWT token operations with Supabase Auth"""
    
    @staticmethod
    def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify Supabase JWT token"""
        try:
            # Use Supabase to verify the token
            user = supabase.auth.get_user(token)
            if user:
                return {
                    'user_id': user.user.id,
                    'email': user.user.email,
                    'exp': user.user.created_at  # Supabase handles expiration
                }
            return None
        except Exception as e:
            print(f"Token verification failed: {e}")
            return None

class GoogleOAuthManager:
    """Manages Google OAuth authentication with Supabase"""
    
    @staticmethod
    def get_or_create_google_user(google_user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get existing user or create new one from Google OAuth using Supabase"""
        try:
            google_id = google_user_info.get('sub')
            email = google_user_info.get('email', '').lower()
            
            # Check if user exists by Google ID or email
            result = supabase.table("users").select("*").or_(f"google_id.eq.{google_id},email.eq.{email}").execute()
            
            if result.data:
                existing_user = result.data[0]
                # Update last login
                supabase.table("users").update({
                    "last_login": datetime.utcnow().isoformat()
                }).eq("id", existing_user['id']).execute()
                
                return {
                    'success': True,
                    'user': {
                        'id': existing_user['id'],
                        'email': existing_user['email'],
                        'full_name': existing_user.get('full_name', ''),
                        'onboarding_complete': existing_user.get('onboarding_complete', False),
                        'created_at': existing_user['created_at'],
                        'last_login': datetime.utcnow().isoformat()
                    }
                }
            
            # Create new user with Google OAuth
            try:
                # Create user in Supabase Auth
                auth_response = supabase.auth.admin.create_user({
                    "email": email,
                    "email_confirm": True,
                    "user_metadata": {
                        "google_id": google_id,
                        "name": google_user_info.get('name', ''),
                        "picture": google_user_info.get('picture', '')
                    }
                })
                
                if auth_response.user:
                    user_id = auth_response.user.id
                    
                    # Create profile in public.users table
                    profile_data = {
                        "id": user_id,
                        "email": email,
                        "google_id": google_id,
                        "full_name": google_user_info.get('name', ''),
                        "created_at": datetime.utcnow().isoformat(),
                        "is_active": True,
                        "profile": json.dumps({
                            'name': google_user_info.get('name', ''),
                            'picture': google_user_info.get('picture', ''),
                            'email_verified': google_user_info.get('email_verified', False)
                        }),
                        "onboarding_complete": False
                    }
                    
                    result = supabase.table("users").insert(profile_data).execute()
                    
                    if result.data:
                        return {
                            'success': True,
                            'user': {
                                'id': user_id,
                                'email': email,
                                'full_name': google_user_info.get('name', ''),
                                'onboarding_complete': False,
                                'created_at': datetime.utcnow().isoformat(),
                                'last_login': datetime.utcnow().isoformat()
                            }
                        }
                
                return {'error': 'Failed to create Google OAuth user'}
                
            except Exception as e:
                print(f"Error creating Google OAuth user: {e}")
                return {'error': f'Failed to create user: {str(e)}'}
            
        except Exception as e:
            return {'error': f'Google OAuth error: {str(e)}'}

# API Routes
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = UserManager.create_user(data)
        
        if result.get('success'):
            # Create JWT token for the new user
            token = JWTManager.verify_supabase_token(result.get('access_token', ''))
            return jsonify({
                'message': 'User registered successfully',
                'user': result['user'],
                'access_token': result.get('access_token'),
                'refresh_token': result.get('refresh_token')
            }), 201
        else:
            return jsonify({'error': result.get('error', 'Registration failed')}), 400
            
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    """Login user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        result = UserManager.authenticate_user(email, password)
        
        if result.get('success'):
            return jsonify({
                'message': 'Login successful',
                'user': result['user'],
                'access_token': result.get('access_token'),
                'refresh_token': result.get('refresh_token')
            }), 200
        else:
            return jsonify({'error': result.get('error', 'Login failed')}), 401
            
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    """Verify authentication token"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No valid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        
        # Verify token with Supabase
        user_data = JWTManager.verify_supabase_token(token)
        
        if user_data:
            # Get user profile
            user_profile = UserManager.get_user_by_id(user_data['user_id'])
            
            return jsonify({
                'valid': True,
                'user': {
                    'id': user_data['user_id'],
                    'email': user_data['email'],
                    'full_name': user_profile.get('full_name', '') if user_profile else '',
                    'onboarding_complete': user_profile.get('onboarding_complete', False) if user_profile else False
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid or expired token'}), 401
            
    except Exception as e:
        print(f"Token verification error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout_user():
    """Logout user"""
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            # Supabase handles token invalidation automatically
            print("User logged out successfully")
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Google OAuth authentication"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        id_token = data.get('id_token')
        if not id_token:
            return jsonify({'error': 'Google ID token required'}), 400
        
        # For now, we'll use a simplified approach
        # In production, you should verify the Google ID token
        google_user_info = {
            'sub': data.get('google_id', 'google_user'),
            'email': data.get('email', ''),
            'name': data.get('name', ''),
            'picture': data.get('picture', ''),
            'email_verified': True
        }
        
        result = GoogleOAuthManager.get_or_create_google_user(google_user_info)
        
        if result.get('success'):
            return jsonify({
                'message': 'Google authentication successful',
                'user': result['user']
            }), 200
        else:
            return jsonify({'error': result.get('error', 'Google authentication failed')}), 400
            
    except Exception as e:
        print(f"Google auth error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def root_health_check():
    """Root health check endpoint"""
    try:
        # Test database connection
        result = supabase.table("users").select("count", count="exact").limit(1).execute()
        user_count = result.count if hasattr(result, 'count') else 0
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'auth-api',
            'database': 'connected',
            'users_count': user_count
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'auth-api'
        }), 500

@app.route('/api/auth/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        result = supabase.table("users").select("id", count="exact").execute()
        user_count = result.count if hasattr(result, 'count') else 0
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'auth-api',
            'users_count': user_count
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Sympli Health Authentication API')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on (default: 5000)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    args = parser.parse_args()
    
    print("🚀 Starting Authentication API Server...")
    print("📝 Using Supabase database")
    print(f"🌐 Server will run on {args.host}:{args.port}")
    print("💡 Make sure your SUPABASE_URL and SUPABASE_ANON_KEY are configured in .env")
    app.run(host=args.host, port=args.port, debug=True)
