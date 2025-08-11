# Google OAuth Setup Guide

## Prerequisites
- Google Cloud Console account
- MongoDB Atlas connection string
- Python environment with required packages

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Identity Services API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `http://localhost:5173` (for Vite development)
   - Your production domain (when deployed)
7. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:5173`
   - Your production domain (when deployed)
8. Copy the Client ID

## Step 2: Environment Configuration

1. Copy `env.example` to `.env`
2. Add your Google Client ID:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
3. Add your MongoDB URI and JWT secret key

## Step 3: Frontend Configuration

1. Copy the Google Client ID to your frontend `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

## Step 4: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 5: Test the Integration

1. Start the backend:
   ```bash
   cd backend
   python auth_api.py
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to `/auth` and test the "Continue with Google" button

## Troubleshooting

- **"Google Sign-in not available"**: Check if the Google script is loading in the browser console
- **"Invalid Google token"**: Verify your Google Client ID matches between frontend and backend
- **CORS errors**: Ensure your backend CORS settings include your frontend origin
- **MongoDB connection issues**: Verify your MongoDB URI and network access

## Security Notes

- Never expose your Google Client Secret in the frontend
- Use environment variables for all sensitive configuration
- The backend verifies Google tokens server-side for security
- JWT tokens are used for session management after Google authentication
