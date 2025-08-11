import os
from supabase import create_client, Client
from typing import Optional, Dict, Any, List
import json
from datetime import datetime
import uuid

# Initialize Supabase client with service role key to bypass RLS
url = os.getenv("SUPABASE_URL")
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key instead of anon key

# Check if we're in demo mode
demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"

# Force demo mode for now to avoid API key issues
if not url or not service_key or demo_mode:
    print("⚠️  Running in DEMO MODE - Supabase credentials not configured or demo mode enabled")
    supabase = None
else:
    try:
        supabase: Client = create_client(url, service_key)  # Use service role key
        # Test the connection
        supabase.table("users").select("count", count="exact").limit(1).execute()
        print("✅ Supabase connection successful with service role")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        print("⚠️  Falling back to DEMO MODE")
        supabase = None

class SupabaseDB:
    """Simple database wrapper for Supabase operations"""
    
    @staticmethod
    def create_user_session() -> str:
        """Create a new user session with unique ID"""
        try:
            user_id = str(uuid.uuid4())
            
            if supabase is None:
                # Demo mode - just return the user ID
                print(f"Demo mode: Created session user {user_id}")
                return user_id
            
            user_data = {
                "id": user_id,
                "email": f"session_{user_id[:8]}@temp.com",
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True,
                "profile": json.dumps({'session_user': True})
            }
            
            # Insert into users table
            result = supabase.table("users").insert(user_data).execute()
            return user_id
            
        except Exception as e:
            print(f"Error creating user session: {e}")
            return str(uuid.uuid4())  # Fallback to just return a UUID
    
    @staticmethod
    def save_symptom_log(user_id: str, symptom_data: Dict[str, Any]) -> bool:
        """Save symptom log to Supabase"""
        try:
            if supabase is None:
                # Demo mode - just print the log
                print(f"Demo mode: Saved symptom log for user {user_id}: {symptom_data}")
                return True
            
            log_data = {
                "user_id": user_id,
                "symptom_data": json.dumps(symptom_data),
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = supabase.table("symptom_logs").insert(log_data).execute()
            return True
            
        except Exception as e:
            print(f"Error saving symptom log: {e}")
            return False
    
    @staticmethod
    def get_user_symptoms(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's symptom logs from Supabase"""
        try:
            if supabase is None:
                # Demo mode - return empty list
                print(f"Demo mode: Getting symptoms for user {user_id} (returning empty list)")
                return []
            
            result = supabase.table("symptom_logs")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            symptoms = []
            for row in result.data:
                symptom_data = json.loads(row.get("symptom_data", "{}"))
                symptom_data["created_at"] = row.get("created_at")
                symptoms.append(symptom_data)
            
            return symptoms
            
        except Exception as e:
            print(f"Error getting user symptoms: {e}")
            return []

# For backward compatibility
SessionLocal = SupabaseDB
User = type('User', (), {'id': None})  # Dummy class
SymptomLog = type('SymptomLog', (), {})  # Dummy class
Report = type('Report', (), {})  # Dummy class
AuditLog = type('AuditLog', (), {})  # Dummy class for auth

def get_db():
    """Get database session for backward compatibility"""
    return SessionLocal()
