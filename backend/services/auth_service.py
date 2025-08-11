import os
import jwt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from passlib.context import CryptContext
from supabase_client import SessionLocal
from models.user import (
    UserCreate, UserInDB, UserResponse, UserLogin, UserPasswordChange,
    UserPasswordReset, UserPasswordResetConfirm, UserEmailVerification,
    UserSession, UserAuditLog, hash_password, verify_password, generate_secure_token
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))

# Security configuration
MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', '5'))
ACCOUNT_LOCKOUT_MINUTES = int(os.getenv('ACCOUNT_LOCKOUT_MINUTES', '15'))
PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', '8'))
SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', '30'))

class AuthService:
    """Handles user authentication and authorization"""
    
    def __init__(self):
        self.supabase = SessionLocal()
    
    def _log_audit_event(self, user_id: str, action: str, details: Dict[str, Any], 
                         ip_address: Optional[str] = None, user_agent: Optional[str] = None,
                         success: bool = True) -> None:
        """Log an audit event"""
        try:
            audit_log_data = {
                "user_id": user_id,
                "action": action,
                "details": str(details),
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.utcnow().isoformat(),
                "legal_basis": "legitimate_interest"
            }
            self.supabase.table("audit_logs").insert(audit_log_data).execute()
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    def _generate_tokens(self, user_id: str) -> Tuple[str, str]:
        """Generate access and refresh tokens"""
        # Access token (short-lived)
        access_token_expires = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token_data = {
            "sub": str(user_id),
            "exp": access_token_expires,
            "type": "access"
        }
        access_token = jwt.encode(access_token_data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Refresh token (long-lived)
        refresh_token_expires = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_data = {
            "sub": str(user_id),
            "exp": refresh_token_expires,
            "type": "refresh"
        }
        refresh_token = jwt.encode(refresh_token_data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        return access_token, refresh_token
    
    def _create_session(self, user_id: str, access_token: str, refresh_token: str,
                       ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> bool:
        """Create a new user session"""
        try:
            # Store refresh token in database
            session_data = {
                "user_id": user_id,
                "token": refresh_token,
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
                "ip_address": ip_address,
                "user_agent": user_agent,
                "is_active": True
            }
            
            # Insert session into Supabase
            result = self.supabase.table("user_sessions").insert(session_data).execute()
            
            # Update user's session tokens
            self.supabase.table("users").update({
                "session_tokens": refresh_token,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            return False
    
    def _invalidate_session(self, refresh_token: str) -> bool:
        """Invalidate a user session"""
        try:
            # Get session to find user_id
            session_result = self.supabase.table("user_sessions").select("user_id").eq("token", refresh_token).execute()
            
            if session_result.data:
                user_id = session_result.data[0]["user_id"]
                
                # Mark session as inactive
                self.supabase.table("user_sessions").update({
                    "is_active": False,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("token", refresh_token).execute()
                
                # Remove from user's session tokens (simplified for now)
                # Note: This would need a more complex array operation in Supabase
                logger.info(f"Session invalidated for user {user_id}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to invalidate session: {e}")
            return False
    
    def register_user(self, user_data: UserCreate, ip_address: Optional[str] = None,
                     user_agent: Optional[str] = None) -> Tuple[bool, str, Optional[UserResponse]]:
        """Register a new user"""
        try:
            # Check if user already exists
            existing_user_result = self.supabase.table("users").select("*").eq("email", user_data.email.lower()).execute()
            
            if existing_user_result.data:
                return False, "Email already registered", None
            
            # Validate password strength
            if len(user_data.password) < PASSWORD_MIN_LENGTH:
                return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters", None
            
            # Hash password
            password_hash = hash_password(user_data.password)
            
            # Create user document
            user_dict = user_data.dict()
            user_dict.pop("password")  # Remove plain password
            user_dict["password_hash"] = password_hash
            user_dict["email"] = user_data.email.lower()  # Normalize email
            user_dict["created_at"] = datetime.utcnow().isoformat()
            user_dict["updated_at"] = datetime.utcnow().isoformat()
            
            # Insert user into Supabase
            result = self.supabase.table("users").insert(user_dict).execute()
            
            if not result.data:
                return False, "Failed to create user", None
                
            user_id = result.data[0]["id"]
            
            # Log audit event
            self._log_audit_event(
                user_id=user_id,
                action="user_registration",
                details={"email": user_data.email, "username": user_data.username},
                ip_address=ip_address,
                user_agent=user_agent,
                success=True
            )
            
            # Return user response (without password)
            user_response = UserResponse(
                id=user_id,
                email=user_data.email,
                username=user_data.username,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                date_of_birth=user_data.date_of_birth,
                phone=user_data.phone,
                emergency_contact=user_data.emergency_contact,
                medical_conditions=user_data.medical_conditions,
                allergies=user_data.allergies,
                medications=user_data.medications,
                blood_type=user_data.blood_type,
                height_cm=user_data.height_cm,
                weight_kg=user_data.weight_kg,
                is_active=user_data.is_active,
                is_verified=user_data.is_verified,
                role=user_data.role,
                preferences=user_data.preferences,
                gdpr_consent=user_data.gdpr_consent,
                created_at=user_dict["created_at"],
                updated_at=user_dict["updated_at"],
                last_login=None,
                two_factor_enabled=False
            )
            
            return True, "User registered successfully", user_response
            
        except Exception as e:
            logger.error(f"User registration failed: {e}")
            return False, "Registration failed", None
    
    def authenticate_user(self, login_data: UserLogin, ip_address: Optional[str] = None,
                         user_agent: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Authenticate user login"""
        try:
            # Find user by email
            user_result = self.supabase.table("users").select("*").eq("email", login_data.email.lower()).execute()
            
            if not user_result.data:
                return False, "Invalid email or password", None
                
            user = user_result.data[0]
            
            # Check if account is active
            if not user.get("is_active", True):
                return False, "Account is deactivated", None
            
            # Verify password
            if not verify_password(login_data.password, user["password_hash"]):
                # Log failed login attempt
                self._log_audit_event(
                    user_id=user["id"],
                    action="login_failed",
                    details={"reason": "invalid_password"},
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False
                )
                return False, "Invalid email or password", None
            
            # Update last login
            self.supabase.table("users").update({
                "last_login": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user["id"]).execute()
            
            # Generate tokens
            access_token, refresh_token = self._generate_tokens(user["id"])
            
            # Log successful login
            self._log_audit_event(
                user_id=user["id"],
                action="login_successful",
                details={"ip_address": ip_address},
                ip_address=ip_address,
                user_agent=user_agent,
                success=True
            )
            
            # Return user data and tokens
            user_response = UserResponse(
                id=user["id"],
                email=user["email"],
                username=user.get("username"),
                first_name=user.get("first_name"),
                last_name=user.get("last_name"),
                date_of_birth=user.get("date_of_birth"),
                phone=user.get("phone"),
                emergency_contact=user.get("emergency_contact"),
                medical_conditions=user.get("medical_conditions", []),
                allergies=user.get("allergies", []),
                medications=user.get("medications", []),
                blood_type=user.get("blood_type"),
                height_cm=user.get("height_cm"),
                weight_kg=user.get("weight_kg"),
                is_active=user.get("is_active", True),
                is_verified=user.get("is_verified", False),
                role=user.get("role", "user"),
                preferences=user.get("preferences", {}),
                gdpr_consent=user.get("gdpr_consent", False),
                created_at=user["created_at"],
                updated_at=user["updated_at"],
                last_login=user.get("last_login"),
                two_factor_enabled=user.get("two_factor_enabled", False)
            )
            
            return True, "Login successful", {
                "user": user_response,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.error(f"User authentication failed: {e}")
            return False, "Authentication failed", None
    
    def refresh_token(self, refresh_token: str) -> Tuple[bool, str, Optional[str]]:
        """Refresh access token using refresh token"""
        try:
            # Verify refresh token
            try:
                payload = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
                user_id = payload.get("sub")
                token_type = payload.get("type")
                
                if not user_id or token_type != "refresh":
                    return False, "Invalid refresh token", None
                    
            except jwt.ExpiredSignatureError:
                return False, "Refresh token expired", None
            except jwt.InvalidTokenError:
                return False, "Invalid refresh token", None
            
            # Check if session exists and is active
            session_result = self.supabase.table("user_sessions").select("*").eq("token", refresh_token).eq("is_active", True).execute()
            
            if not session_result.data:
                return False, "Invalid refresh token", None
            
            session = session_result.data[0]
            
            # Check if session is expired
            if datetime.fromisoformat(session["expires_at"]) < datetime.utcnow():
                self._invalidate_session(refresh_token)
                return False, "Refresh token expired", None
            
            # Generate new access token
            access_token_expires = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token_data = {
                "sub": user_id,
                "exp": access_token_expires,
                "type": "access"
            }
            access_token = jwt.encode(access_token_data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            
            return True, "Token refreshed successfully", access_token
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return False, "Token refresh failed", None
    
    def logout(self, refresh_token: str, user_id: str) -> Tuple[bool, str]:
        """Logout user and invalidate session"""
        try:
            # Invalidate session
            if self._invalidate_session(refresh_token):
                # Log logout event
                self._log_audit_event(
                    user_id=user_id,
                    action="logout",
                    details={},
                    success=True
                )
                return True, "Logout successful"
            else:
                return False, "Logout failed"
                
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False, "Logout failed"
    
    def change_password(self, user_id: str, password_data: UserPasswordChange) -> Tuple[bool, str]:
        """Change user password"""
        try:
            # Get user
            user_result = self.supabase.table("users").select("*").eq("id", user_id).execute()
            if not user_result.data:
                return False, "User not found"
            
            user = user_result.data[0]
            
            # Verify current password
            if not verify_password(password_data.current_password, user["password_hash"]):
                return False, "Current password is incorrect"
            
            # Validate new password
            if len(password_data.new_password) < PASSWORD_MIN_LENGTH:
                return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters"
            
            # Hash new password
            new_password_hash = hash_password(password_data.new_password)
            
            # Update password
            self.supabase.table("users").update({
                "password_hash": new_password_hash,
                "password_changed_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            
            # Invalidate all sessions (force re-login)
            self.supabase.table("user_sessions").update({
                "is_active": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
            
            # Log password change
            self._log_audit_event(
                user_id=user_id,
                action="password_changed",
                details={},
                success=True
            )
            
            return True, "Password changed successfully"
            
        except Exception as e:
            logger.error(f"Password change failed: {e}")
            return False, "Password change failed"
    
    def verify_token(self, token: str) -> Tuple[bool, str, Optional[str]]:
        """Verify JWT access token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            
            if not user_id or token_type != "access":
                return False, "Invalid token", None
            
            # Check if user exists and is active
            user_result = self.supabase.table("users").select("*").eq("id", user_id).eq("is_active", True).execute()
            
            if not user_result.data:
                return False, "User not found or inactive", None
            
            return True, "Token valid", user_id
            
        except jwt.ExpiredSignatureError:
            return False, "Token expired", None
        except jwt.InvalidTokenError:
            return False, "Invalid token", None
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return False, "Token verification failed", None
    
    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID"""
        try:
            user_result = self.supabase.table("users").select("*").eq("id", user_id).execute()
            if not user_result.data:
                return None
            
            user = user_result.data[0]
            
            return UserResponse(
                id=user["id"],
                email=user["email"],
                username=user.get("username"),
                first_name=user.get("first_name"),
                last_name=user.get("last_name"),
                date_of_birth=user.get("date_of_birth"),
                phone=user.get("phone"),
                emergency_contact=user.get("emergency_contact"),
                medical_conditions=user.get("medical_conditions", []),
                allergies=user.get("allergies", []),
                medications=user.get("medications", []),
                blood_type=user.get("blood_type"),
                height_cm=user.get("height_cm"),
                weight_kg=user.get("weight_kg"),
                is_active=user.get("is_active", True),
                is_verified=user.get("is_verified", False),
                role=user.get("role", "user"),
                preferences=user.get("preferences", {}),
                gdpr_consent=user.get("gdpr_consent", False),
                created_at=user["created_at"],
                updated_at=user["updated_at"],
                last_login=user.get("last_login"),
                two_factor_enabled=user.get("two_factor_enabled", False)
            )
            
        except Exception as e:
            logger.error(f"Failed to get user by ID: {e}")
            return None
    
    def update_user_profile(self, user_id: str, update_data: dict) -> Tuple[bool, str]:
        """Update user profile"""
        try:
            # Remove sensitive fields that shouldn't be updated
            sensitive_fields = ["password_hash", "role", "is_active", "is_verified"]
            for field in sensitive_fields:
                update_data.pop(field, None)
            
            # Add update timestamp
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            # Update user
            result = self.supabase.table("users").update(update_data).eq("id", user_id).execute()
            
            if result.data:
                # Log profile update
                self._log_audit_event(
                    user_id=user_id,
                    action="profile_updated",
                    details={"updated_fields": list(update_data.keys())},
                    success=True
                )
                return True, "Profile updated successfully"
            else:
                return False, "No changes made"
                
        except Exception as e:
            logger.error(f"Profile update failed: {e}")
            return False, "Profile update failed"
    
    def delete_user_account(self, user_id: str, password: str) -> Tuple[bool, str]:
        """Delete user account (GDPR compliance)"""
        try:
            # Get user
            user_result = self.supabase.table("users").select("*").eq("id", user_id).execute()
            if not user_result.data:
                return False, "User not found"
            
            user = user_result.data[0]
            
            # Verify password
            if not verify_password(password, user["password_hash"]):
                return False, "Password is incorrect"
            
            # Soft delete (mark as inactive)
            self.supabase.table("users").update({
                "is_active": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            
            # Log account deletion
            self._log_audit_event(
                user_id=user_id,
                action="account_deleted",
                details={"deletion_type": "soft_delete"},
                success=True
            )
            
            return True, "Account deleted successfully"
            
        except Exception as e:
            logger.error(f"Account deletion failed: {e}")
            return False, "Account deletion failed"

# Global auth service instance
auth_service = AuthService()
