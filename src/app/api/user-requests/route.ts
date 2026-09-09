import { NextResponse } from 'next/server';
import {
  createUserRequestDirectly,
  getUserRequestsDirectly,
  updateUserRequestStatusDirectly,
} from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await getUserRequestsDirectly();
    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    console.error('Failed to get user requests via API:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve user requests.' },
      { status: 500 }
    );
  }
}

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

    const result = await createUserRequestDirectly({
      tenantId: String(tenantId).trim().slice(0, 50),
      companyName: String(companyName || tenantId).trim().slice(0, 100),
      requestedByEmail: String(requestedByEmail || '').trim().toLowerCase().slice(0, 100),
      requestedByName: String(requestedByName || '').trim().slice(0, 100),
      targetEmail: cleanTargetEmail.slice(0, 100),
      targetName: String(targetName || '').trim().slice(0, 100),
      targetRole: safeRole,
      notes: String(notes || '').trim().slice(0, 500),
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'User provision request successfully submitted.',
    });

  } catch (err: any) {
    console.error('User request API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit user access request. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'requestId and a valid status (approved/rejected) are required.' },
        { status: 400 }
      );
    }

    const success = await updateUserRequestStatusDirectly(requestId, status);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user request status.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to update request status via API:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update request status.' },
      { status: 500 }
    );
  }
}
