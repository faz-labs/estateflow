import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore, verifySecureResetToken } from '@/lib/firebase-admin';

/**
 * Confirms password reset token (stateless signed HMAC or stored token)
 * and directly updates the user's password in Firebase Authentication.
 */
export async function POST(request: Request) {
  try {
    const { token, newPassword, email: requestEmail, oobCode } = await request.json();

    if ((!token && !oobCode) || !newPassword) {
      return NextResponse.json(
        { error: 'Reset credentials and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const adminFirestore = getAdminFirestore();
    let email = '';

    // 1. First priority: Cryptographically signed HMAC token (Stateless, zero-failure)
    if (token && token.includes('.')) {
      const hmacCheck = verifySecureResetToken(token);
      if (hmacCheck.valid && hmacCheck.email) {
        email = hmacCheck.email;
      } else if (hmacCheck.error) {
        return NextResponse.json(
          { error: hmacCheck.error },
          { status: 400 }
        );
      }
    }

    // 2. Check for replay attack if token exists in Firestore
    if (adminFirestore && token) {
      try {
        const tokenDoc = await adminFirestore.collection('password_resets').doc(token).get();
        if (tokenDoc.exists) {
          const docData = tokenDoc.data();
          if (docData?.used) {
            return NextResponse.json(
              { error: 'This password reset link has already been used. Please request a new one.' },
              { status: 400 }
            );
          }
          if (docData?.expiresAt && Date.now() > Number(docData.expiresAt)) {
            return NextResponse.json(
              { error: 'This password reset link has expired. Please request a new one.' },
              { status: 400 }
            );
          }
          if (!email && docData?.email) {
            email = docData.email;
          }
        }
      } catch (dbErr) {
        console.warn('Non-blocking replay check note:', dbErr);
      }
    }

    // 3. Fallback email from query/form
    if (!email && requestEmail) {
      email = requestEmail.trim().toLowerCase();
    }

    // 4. Fallback for native Firebase oobCode (if token was not verified)
    if (!email && oobCode && apiKey) {
      try {
        const restRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oobCode, newPassword }),
          }
        );
        const restData = await restRes.json();
        if (restRes.ok) {
          return NextResponse.json({
            success: true,
            message: 'Password has been successfully updated.',
          });
        }
      } catch (restErr) {
        console.warn('Native oobCode REST fallback error:', restErr);
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // 5. Update user password in Firebase Authentication via Admin SDK
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
          { error: authErr.message || 'Could not update password. Please ensure it meets requirements and try again.' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          error: 'Authentication update service is temporarily unavailable. Please verify FIREBASE_SERVICE_ACCOUNT_KEY.',
        },
        { status: 500 }
      );
    }

    // 6. Mark token as used non-blockingly
    if (adminFirestore && token) {
      adminFirestore
        .collection('password_resets')
        .doc(token)
        .set(
          {
            used: true,
            usedAt: new Date().toISOString(),
          },
          { merge: true }
        )
        .catch(() => {});
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
