import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * Confirms custom password reset token generated via Mailcow email dispatch
 * and actually updates the user's password in Firebase Authentication.
 */
export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId || !apiKey) {
      return NextResponse.json(
        { error: 'Firebase configuration is missing.' },
        { status: 500 }
      );
    }

    // 1. Fetch token document from Firestore REST API
    const tokenDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/password_resets/${token}`;
    const tokenRes = await fetch(tokenDocUrl);

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    const tokenData = await tokenRes.json();
    const fields = tokenData.fields;

    const email = fields?.email?.stringValue;
    const expiresAt = parseInt(fields?.expiresAt?.integerValue || fields?.expiresAt?.stringValue || '0', 10);
    const used = fields?.used?.booleanValue || false;

    if (!email || used || Date.now() > expiresAt) {
      return NextResponse.json(
        { error: 'This reset link has expired or has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // 2. Actually update user password in Firebase Authentication!
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        await adminAuth.updateUser(userRecord.uid, {
          password: newPassword,
        });
      } catch (authErr: any) {
        console.error('Failed to update password via Firebase Admin:', authErr);
        return NextResponse.json(
          { error: `Could not update password in Firebase Auth: ${authErr.message}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          error: 'Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT_KEY) are missing on the server. Please add your Firebase service account key in .env.local / Vercel to update passwords.',
        },
        { status: 500 }
      );
    }

    // 3. Mark token as used
    await fetch(`${tokenDocUrl}?updateMask.fieldPaths=used`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          used: { booleanValue: true },
        },
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully updated in Firebase Authentication.',
    });

  } catch (error: any) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm password reset.' },
      { status: 500 }
    );
  }
}
