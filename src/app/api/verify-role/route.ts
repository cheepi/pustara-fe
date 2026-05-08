import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'pustara-kw',
  });
}

/**
 * POST /api/verify-role
 *
 * Verifies Firebase token and queries Neon DB directly for user role.
 * This completely bypasses the Express backend for role checking.
 *
 * Body: { token: string }
 * Response: { success: true, role: 'admin' | 'reader' }
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    // 1. Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;

    // 2. Query Neon DB directly for role
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      const result = await pool.query(
        'SELECT role FROM users WHERE firebase_uid = $1',
        [uid]
      );

      const role = result.rows[0]?.role || 'reader';
      console.log(`[verify-role API] uid=${uid} role=${role}`);

      return NextResponse.json({ success: true, role });
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error('[verify-role API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify role' },
      { status: 500 }
    );
  }
}
