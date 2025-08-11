#!/usr/bin/env python3
"""
Script to start the backend authentication server
"""

import os
import sys

# Add the scripts directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))

# Import and run the auth API
from auth_api import app

if __name__ == "__main__":
    print("🚀 Starting Sympli Backend Server...")
    print("📝 Authentication API will be available at http://localhost:5000")
    print("💡 Health check: http://localhost:5000/health")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
