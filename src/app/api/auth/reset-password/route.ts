import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function cleanEnvStr(val?: string): string {
  if (!val) return '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const smtpHost = cleanEnvStr(process.env.SMTP_HOST);
    const smtpPort = parseInt(cleanEnvStr(process.env.SMTP_PORT) || '587', 10);
    const smtpUser = cleanEnvStr(process.env.SMTP_USER);
    const smtpPass = cleanEnvStr(process.env.SMTP_PASS);
    const smtpSecure = cleanEnvStr(process.env.SMTP_SECURE) === 'true';
    const smtpFromName = cleanEnvStr(process.env.SMTP_FROM_NAME) || 'EstateFlow Support';
    const smtpFromEmail = cleanEnvStr(process.env.SMTP_FROM_EMAIL) || smtpUser || 'noreply@remotizedit.online';
    
    // Dynamically detect host or fallback to NEXT_PUBLIC_APP_URL
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const dynamicOrigin = requestHost ? `${proto}://${requestHost}` : 'http://localhost:9002';
    const appUrl = cleanEnvStr(process.env.NEXT_PUBLIC_APP_URL) || dynamicOrigin;
    const projectId = cleanEnvStr(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Verify SMTP settings are configured
    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPass ||
      smtpHost === 'mail.yourdomain.com' ||
      smtpPass === 'your_password'
    ) {
      return NextResponse.json(
        { 
          success: false,
          warning: 'Email delivery service is currently not configured. Please contact the administrator.',
          configured: false,
        },
        { status: 200 }
      );
    }

    // Determine the branded reset URL:
    // Option A: Try generating official Firebase oobCode via Admin SDK (suppresses Google's email!)
    let resetUrl = '';

    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        const link = await Promise.race([
          adminAuth.generatePasswordResetLink(normalizedEmail),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Admin SDK reset link timeout')), 3000)
          ),
        ]);
        const urlObj = new URL(link);
        const oobCode = urlObj.searchParams.get('oobCode');
        if (oobCode) {
          resetUrl = `${appUrl}/reset-password?oobCode=${encodeURIComponent(oobCode)}&email=${encodeURIComponent(normalizedEmail)}`;
        }
      } catch (adminErr) {
        console.warn('Admin SDK reset link attempt note (using custom token fallback):', adminErr);
      }
    }

    // Option B: Fallback to custom secure token in Firestore via Admin SDK
    if (!resetUrl) {
      const customToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour validity

      const adminFirestore = getAdminFirestore();
      if (adminFirestore) {
        try {
          await adminFirestore.collection('password_resets').doc(customToken).set({
            token: customToken,
            email: normalizedEmail,
            expiresAt,
            used: false,
            createdAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.warn('Failed to store custom reset token in Admin Firestore:', fsErr);
        }
      } else if (projectId) {
        try {
          const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/password_resets/${customToken}`;
          await fetch(docUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                token: { stringValue: customToken },
                email: { stringValue: normalizedEmail },
                expiresAt: { integerValue: expiresAt.toString() },
                used: { booleanValue: false },
                createdAt: { stringValue: new Date().toISOString() },
              },
            }),
            signal: AbortSignal.timeout(3000),
          });
        } catch (fsErr) {
          console.warn('Failed to store custom reset token in Firestore:', fsErr);
        }
      }

      resetUrl = `${appUrl}/reset-password?token=${customToken}&email=${encodeURIComponent(normalizedEmail)}`;
    }

    // Initialize Mailcow SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });

    // Branded HTML email template - NO Firebase or Google mentions!
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
            .logo { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 20px; letter-spacing: -0.5px; }
            .logo span { color: #d97706; }
            .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 20px 0; }
            .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Estate<span>Flow</span></div>
            <h2 style="font-size: 18px; margin-top: 0;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your EstateFlow account associated with <strong>${normalizedEmail}</strong>.</p>
            <p>Click the secure button below to set a new password on your domain:</p>
            <p><a href="${resetUrl}" class="btn">Reset My Password</a></p>
            <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br><span style="word-break: break-all; color: #2563eb;">${resetUrl}</span></p>
            <p style="font-size: 12px; color: #64748b;">This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
            <div class="footer">
              EstateFlow Enterprise Real Estate Platform &bull; Official Account Security Notification
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: normalizedEmail,
      subject: 'EstateFlow: Reset Your Password',
      text: `Hello,\n\nWe received a request to reset your EstateFlow password.\n\nPlease visit the following link to choose a new password:\n${resetUrl}\n\nThis link is valid for 1 hour.\n\nEstateFlow Support`,
      html: htmlMessage,
    });

    return NextResponse.json({
      success: true,
      message: `A secure password reset link has been dispatched to ${normalizedEmail}.`,
      configured: true,
    });

  } catch (error: any) {
    console.error('Password Reset Send Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to dispatch password reset email. Please try again later or contact support.',
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
