from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
import bcrypt

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    first_name: str = Field(..., min_length=1, max_length=50, description="User's first name")
    last_name: str = Field(..., min_length=1, max_length=50, description="User's last name")
    date_of_birth: Optional[datetime] = Field(None, description="User's date of birth")
    phone: Optional[str] = Field(None, description="User's phone number")
    emergency_contact: Optional[str] = Field(None, description="Emergency contact information")
    medical_conditions: List[str] = Field(default=[], description="List of known medical conditions")
    allergies: List[str] = Field(default=[], description="List of known allergies")
    medications: List[str] = Field(default=[], description="Current medications")
    blood_type: Optional[str] = Field(None, description="User's blood type")
    height_cm: Optional[float] = Field(None, ge=50, le=250, description="Height in centimeters")
    weight_kg: Optional[float] = Field(None, ge=20, le=300, description="Weight in kilograms")
    is_active: bool = Field(default=True, description="Whether the user account is active")
    is_verified: bool = Field(default=False, description="Whether the user's email is verified")
    role: str = Field(default="user", description="User role (user, admin, doctor)")
    preferences: dict = Field(default={}, description="User preferences and settings")
    gdpr_consent: bool = Field(default=False, description="GDPR consent status")
    data_retention_days: int = Field(default=2555, description="Data retention period in days (7 years)")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="User's password (min 8 characters)")

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    date_of_birth: Optional[datetime] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_conditions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    blood_type: Optional[str] = None
    height_cm: Optional[float] = Field(None, ge=50, le=250)
    weight_kg: Optional[float] = Field(None, ge=20, le=300)
    preferences: Optional[dict] = None
    gdpr_consent: Optional[bool] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id", description="User's unique identifier")
    password_hash: str = Field(..., description="Hashed password")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    login_attempts: int = Field(default=0, description="Failed login attempts counter")
    locked_until: Optional[datetime] = Field(None, description="Account lockout until timestamp")
    password_changed_at: datetime = Field(default_factory=datetime.utcnow, description="Password last changed timestamp")
    email_verification_token: Optional[str] = Field(None, description="Email verification token")
    password_reset_token: Optional[str] = Field(None, description="Password reset token")
    password_reset_expires: Optional[datetime] = Field(None, description="Password reset token expiration")
    two_factor_enabled: bool = Field(default=False, description="Two-factor authentication status")
    two_factor_secret: Optional[str] = Field(None, description="Two-factor authentication secret")
    session_tokens: List[str] = Field(default=[], description="Active session tokens")
    data_export_history: List[dict] = Field(default=[], description="Data export history for GDPR compliance")
    data_deletion_requests: List[dict] = Field(default=[], description="Data deletion requests history")

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    date_of_birth: Optional[datetime]
    phone: Optional[str]
    emergency_contact: Optional[str]
    medical_conditions: List[str]
    allergies: List[str]
    medications: List[str]
    blood_type: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    is_active: bool
    is_verified: bool
    role: str
    preferences: dict
    gdpr_consent: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    two_factor_enabled: bool

class UserLogin(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")

class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")

class UserPasswordReset(BaseModel):
    email: str = Field(..., description="User's email address")

class UserPasswordResetConfirm(BaseModel):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")

class UserEmailVerification(BaseModel):
    token: str = Field(..., description="Email verification token")

class UserSession(BaseModel):
    user_id: str = Field(..., description="User ID")
    token: str = Field(..., description="Session token")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation timestamp")
    expires_at: datetime = Field(..., description="Session expiration timestamp")
    ip_address: Optional[str] = Field(None, description="IP address of the session")
    user_agent: Optional[str] = Field(None, description="User agent string")
    is_active: bool = Field(default=True, description="Whether the session is active")

class UserAuditLog(BaseModel):
    user_id: str = Field(..., description="User ID")
    action: str = Field(..., description="Action performed")
    details: dict = Field(default={}, description="Action details")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Action timestamp")
    success: bool = Field(..., description="Whether the action was successful")

# Password hashing utility functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_secure_token() -> str:
    """Generate a secure random token"""
    import secrets
    return secrets.token_urlsafe(32)
