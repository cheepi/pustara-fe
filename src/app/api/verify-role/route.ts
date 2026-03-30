import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const { token, expectedRole } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token with backend and get user data
    const response = await fetch(`${BACKEND_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userData = await response.json();

    // Check if user has the expected role
    // For now, we assume all users coming from Firebase are readers by default
    // Admin role should be set manually in database
    if (expectedRole && userData.data?.role !== expectedRole) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: userData.data });
  } catch (error) {
    console.error('Error verifying role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify role' },
      { status: 500 }
    );
  }
}
