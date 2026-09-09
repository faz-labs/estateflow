import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

/**
 * Confirms custom password reset token generated via Mailcow email dispatch
 * and actually updates the user's password in Firebase Authentication.
 */
export async function POST(request: Request) {
  try {
    const { token, newPassword, email: requestEmail } = await request.json();

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

    const adminFirestore = getAdminFirestore();
    let email = '';
    let expiresAt = 0;
    let used = false;

    // 1. Fetch token document via Admin SDK (bypassing client security rules)
    if (adminFirestore) {
      const tokenDoc = await adminFirestore.collection('password_resets').doc(token).get();
      if (!tokenDoc.exists) {
        return NextResponse.json(
          { error: 'Invalid or expired password reset link. Please request a new one.' },
          { status: 400 }
        );
      }
      const data = tokenDoc.data();
      email = data?.email || requestEmail || '';
      expiresAt = Number(data?.expiresAt || 0);
      used = Boolean(data?.used);
    } else {
      // Fallback via REST API
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
      email = fields?.email?.stringValue || requestEmail || '';
      expiresAt = parseInt(fields?.expiresAt?.integerValue || fields?.expiresAt?.stringValue || '0', 10);
      used = fields?.used?.booleanValue || false;
    }

    if (!email || used || Date.now() > expiresAt) {
      return NextResponse.json(
        { error: 'This reset link has expired or has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // 2. Update user password in Firebase Authentication
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        await adminAuth.updateUser(userRecord.uid, {
          password: newPassword,
        });

        // Clear mustChangePassword if set
        if (adminFirestore) {
          try {
            await adminFirestore.collection('users').doc(userRecord.uid).set(
              { mustChangePassword: false },
              { merge: true }
            );
          } catch {}
        }
      } catch (authErr: any) {
        console.error('Failed to update password via Firebase Admin:', authErr);
        return NextResponse.json(
          { error: 'Could not update password. Please ensure it meets minimum requirements and try again.' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          error: 'Authentication update service is temporarily unavailable. Please contact platform support.',
        },
        { status: 500 }
      );
    }

    // 3. Mark token as used
    if (adminFirestore) {
      await adminFirestore.collection('password_resets').doc(token).update({
        used: true,
        usedAt: new Date().toISOString(),
      });
    } else {
      const tokenDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/password_resets/${token}`;
      await fetch(`${tokenDocUrl}?updateMask.fieldPaths=used`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            used: { booleanValue: true },
          },
        }),
      });
    }

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
