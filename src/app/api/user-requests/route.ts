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

    if (!targetEmail || !tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID and target email address are required.' },
        { status: 400 }
      );
    }

    const newRequest = {
      tenantId: String(tenantId).trim(),
      companyName: String(companyName || tenantId).trim(),
      requestedByEmail: String(requestedByEmail || '').trim().toLowerCase(),
      requestedByName: String(requestedByName || '').trim(),
      targetEmail: String(targetEmail).trim().toLowerCase(),
      targetName: String(targetName || '').trim(),
      targetRole: targetRole || 'Viewer',
      notes: String(notes || '').trim(),
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
      { error: err.message || 'Failed to submit user access request.' },
      { status: 500 }
    );
  }
}
