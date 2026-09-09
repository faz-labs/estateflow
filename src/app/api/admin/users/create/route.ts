import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

const SUPER_ADMIN_EMAILS = [
  'anonto.kings9@gmail.com',
  'admin@remotizedit.online',
  'estate.admin@remotizedit.online',
];

/**
 * Super Admin endpoint to provision a new user in Firebase Auth and Firestore.
 * Strictly verifies that the caller is an authenticated Super Admin.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify caller authentication token
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication credentials.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const adminAuth = getAdminAuth();
    let callerEmail = '';

    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        callerEmail = decoded.email?.toLowerCase() || '';
      } catch (verifyErr) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or expired authentication credentials.' },
          { status: 401 }
        );
      }
    } else {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );
      if (!verifyRes.ok) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication verification failed.' },
          { status: 401 }
        );
      }
      const verifyData = await verifyRes.json();
      callerEmail = verifyData.users?.[0]?.email?.toLowerCase() || '';
    }

    // 2. Enforce Super Admin authorization
    if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Only platform Super Admins can provision user accounts.' },
        { status: 403 }
      );
    }

    const { email, password, firstName, lastName, role, tenantId, companyName } = await request.json();

    if (!email || !password || !tenantId) {
      return NextResponse.json(
        { error: 'Email, password, and tenant selection are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Firebase API key is missing from environment variables.' },
        { status: 500 }
      );
    }

    // 1. Create User in Firebase Auth using Google Identity Toolkit REST API
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password: password,
        returnSecureToken: true,
      }),
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      const errMsg = authData.error?.message || 'Failed to create user in Firebase Auth.';
      if (errMsg.includes('EMAIL_EXISTS')) {
        return NextResponse.json(
          { error: 'A user with this email address already exists in Firebase Authentication.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const uid = authData.localId;
    const idToken = authData.idToken;

    // 2. Provision Firestore profile document via Firestore REST API
    if (projectId && idToken) {
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
        const fields = {
          id: { stringValue: uid },
          email: { stringValue: email.trim().toLowerCase() },
          firstName: { stringValue: (firstName || 'User').trim() },
          lastName: { stringValue: (lastName || '').trim() },
          role: { stringValue: role || 'Viewer' },
          tenantId: { stringValue: tenantId },
          companyName: { stringValue: companyName || 'Workspace' },
          mustChangePassword: { booleanValue: true },
          createdAt: { stringValue: new Date().toISOString() },
        };

        await fetch(firestoreUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ fields }),
        });
      } catch (fsErr) {
        console.warn('Direct Firestore REST profile write warning:', fsErr);
      }
    }

    return NextResponse.json({
      success: true,
      uid,
      email: email.trim().toLowerCase(),
      mustChangePassword: true,
      message: `User ${email} provisioned with temporary credentials.`,
    });

  } catch (error: any) {
    console.error('User Provisioning API Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while creating user.' },
      { status: 500 }
    );
  }
}
