from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime

from models.user import (
    UserCreate, UserResponse, UserLogin, UserPasswordChange,
    UserPasswordReset, UserPasswordResetConfirm, UserUpdate
)
from services.auth_service import auth_service
from database.connection import init_database

# Initialize database
init_database()

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security scheme
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    is_valid, message, user_id = auth_service.verify_token(token)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    request: Request
):
    """
    Register a new user account
    
    - **email**: User's email address (must be unique)
    - **username**: Unique username (3-50 characters)
    - **password**: Password (minimum 8 characters)
    - **first_name**: User's first name
    - **last_name**: User's last name
    - **date_of_birth**: Optional date of birth
    - **phone**: Optional phone number
    - **emergency_contact**: Optional emergency contact info
    - **medical_conditions**: List of known medical conditions
    - **allergies**: List of known allergies
    - **medications**: List of current medications
    - **blood_type**: Optional blood type
    - **height_cm**: Optional height in centimeters
    - **weight_kg**: Optional weight in kilograms
    - **gdpr_consent**: GDPR consent status
    """
    try:
        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Register user
        success, message, user_response = auth_service.register_user(
            user_data, client_ip, user_agent
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {
            "success": True,
            "message": message,
            "user": user_response,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/login", response_model=dict)
async def login_user(
    login_data: UserLogin,
    request: Request
):
    """
    Authenticate user and get access tokens
    
    - **email**: User's email address
    - **password**: User's password
    """
    try:
        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Authenticate user
        success, message, auth_data = auth_service.authenticate_user(
            login_data, client_ip, user_agent
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=message
            )
        
        return {
            "success": True,
            "message": message,
            "data": auth_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/refresh", response_model=dict)
async def refresh_access_token(
    refresh_token: str
):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    """
    try:
        success, message, new_access_token = auth_service.refresh_token(refresh_token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=message
            )
        
        return {
            "success": True,
            "message": message,
            "access_token": new_access_token,
            "token_type": "bearer",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/logout", response_model=dict)
async def logout_user(
    refresh_token: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Logout user and invalidate session
    
    - **refresh_token**: Refresh token to invalidate
    """
    try:
        success, message = auth_service.logout(refresh_token, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/change-password", response_model=dict)
async def change_password(
    password_data: UserPasswordChange,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Change user password
    
    - **current_password**: Current password
    - **new_password**: New password (minimum 8 characters)
    """
    try:
        success, message = auth_service.change_password(current_user.id, password_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/forgot-password", response_model=dict)
async def forgot_password(
    reset_data: UserPasswordReset
):
    """
    Request password reset (sends email with reset token)
    
    - **email**: User's email address
    """
    try:
        # TODO: Implement email sending functionality
        # For now, just return success message
        return {
            "success": True,
            "message": "If the email exists, a password reset link has been sent",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/reset-password", response_model=dict)
async def reset_password(
    reset_data: UserPasswordResetConfirm
):
    """
    Reset password using reset token
    
    - **token**: Password reset token from email
    - **new_password**: New password (minimum 8 characters)
    """
    try:
        # TODO: Implement password reset functionality
        # For now, just return success message
        return {
            "success": True,
            "message": "Password reset successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/profile", response_model=dict)
async def get_user_profile(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get current user's profile information
    """
    try:
        return {
            "success": True,
            "user": current_user,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/profile", response_model=dict)
async def update_user_profile(
    update_data: UserUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update current user's profile information
    
    All fields are optional - only provided fields will be updated
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        success, message = auth_service.update_user_profile(current_user.id, update_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Get updated user profile
        updated_user = auth_service.get_user_by_id(current_user.id)
        
        return {
            "success": True,
            "message": message,
            "user": updated_user,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/profile", response_model=dict)
async def delete_user_account(
    password: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Delete user account (GDPR compliance)
    
    - **password**: User's current password for verification
    """
    try:
        success, message = auth_service.delete_user_account(current_user.id, password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/verify-email/{token}", response_model=dict)
async def verify_email(
    token: str
):
    """
    Verify user email address
    
    - **token**: Email verification token
    """
    try:
        # TODO: Implement email verification functionality
        # For now, just return success message
        return {
            "success": True,
            "message": "Email verified successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/health", response_model=dict)
async def auth_health_check():
    """
    Health check endpoint for authentication service
    """
    try:
        return {
            "success": True,
            "service": "Authentication Service",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected" if auth_service.users_collection else "disconnected"
        }
        
    except Exception as e:
        return {
            "success": False,
            "service": "Authentication Service",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
