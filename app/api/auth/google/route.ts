import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'No Google credential provided' },
        { status: 400 }
      );
    }

    // For now, we'll implement a simple Google OAuth mock
    // In production, you'd want to verify the Google ID token
    // and implement proper user creation/lookup

    // Mock Google user info - replace with actual token verification
    const mockGoogleUser = {
      user_id: `google_${Date.now()}`,
      email: 'google.user@example.com',
      fullName: 'Google User',
      profile_picture: 'https://via.placeholder.com/150',
      is_google_user: true
    };

    // Mock token generation - replace with proper JWT
    const mockToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the Google authentication attempt
    console.log('Google OAuth attempt:', { 
      timestamp: new Date().toISOString() 
    });

    return NextResponse.json({
      token: mockToken,
      user: mockGoogleUser
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json(
      { error: 'Google authentication failed' },
      { status: 500 }
    );
  }
}

