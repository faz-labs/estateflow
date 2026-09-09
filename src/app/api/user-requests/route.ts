import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenantId,
      companyName,
      requestedByEmail,
      requestedByName,
      targetEmail,
      targetName,
      targetRole,
      notes,
    } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanTargetEmail = String(targetEmail || '').trim().toLowerCase();

    if (!cleanTargetEmail || !emailRegex.test(cleanTargetEmail) || !tenantId) {
      return NextResponse.json(
        { error: 'A valid target email address and tenant identifier are required.' },
        { status: 400 }
      );
    }

    const validRoles = ['Admin', 'Accountant', 'Viewer'];
    const safeRole = validRoles.includes(targetRole) ? targetRole : 'Viewer';

    const newRequest = {
      tenantId: String(tenantId).trim().slice(0, 50),
      companyName: String(companyName || tenantId).trim().slice(0, 100),
      requestedByEmail: String(requestedByEmail || '').trim().toLowerCase().slice(0, 100),
      requestedByName: String(requestedByName || '').trim().slice(0, 100),
      targetEmail: cleanTargetEmail.slice(0, 100),
      targetName: String(targetName || '').trim().slice(0, 100),
      targetRole: safeRole,
      notes: String(notes || '').trim().slice(0, 500),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const adminFirestore = getAdminFirestore();

    if (adminFirestore) {
      const docRef = await adminFirestore.collection('user_requests').add(newRequest);
      return NextResponse.json({ success: true, id: docRef.id });
    }

    // Fallback: Use Firestore REST API to write document
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-907320032-3bcaf';
    const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_requests`;

    const restRes = await fetch(restUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          tenantId: { stringValue: newRequest.tenantId },
          companyName: { stringValue: newRequest.companyName },
          requestedByEmail: { stringValue: newRequest.requestedByEmail },
          requestedByName: { stringValue: newRequest.requestedByName },
          targetEmail: { stringValue: newRequest.targetEmail },
          targetName: { stringValue: newRequest.targetName },
          targetRole: { stringValue: newRequest.targetRole },
          notes: { stringValue: newRequest.notes },
          status: { stringValue: newRequest.status },
          createdAt: { stringValue: newRequest.createdAt },
        },
      }),
    });

    if (!restRes.ok) {
      const errorText = await restRes.text();
      console.warn('Firestore REST fallback warning:', errorText);
    }

    return NextResponse.json({ success: true, message: 'Request recorded.' });

  } catch (err: any) {
    console.error('User request API error:', err);
    return NextResponse.json(
      { error: 'Failed to submit user access request. Please try again later.' },
      { status: 500 }
    );
  }
}
