import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, role, tenantId, companyName, invitedByName } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedRole = role || 'Viewer';
    const orgName = companyName || 'EstateFlow Workspace';

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpFromName = process.env.SMTP_FROM_NAME || 'EstateFlow Support';
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || 'noreply@yourdomain.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    // Verify SMTP settings are configured and not still placeholder strings
    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPass ||
      smtpHost === 'mail.yourdomain.com' ||
      smtpHost === 'mail.yourcompany.com' ||
      smtpPass === 'your_mailcow_mailbox_password' ||
      smtpPass === 'your_password'
    ) {
      return NextResponse.json(
        { 
          success: false,
          warning: 'Mailcow SMTP is not configured in .env.local yet. Please update SMTP_PASS in .env.local to dispatch invite emails.',
          configured: false,
        },
        { status: 200 }
      );
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
    });

    // Registration join URL prefilling email
    const joinUrl = `${appUrl}/login?mode=register&email=${encodeURIComponent(normalizedEmail)}`;

    // Branded HTML invitation template
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
            .logo { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 24px; }
            .badge { display: inline-block; background-color: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 12px; padding: 4px 8px; border-radius: 6px; margin-bottom: 16px; }
            .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 20px 0; }
            .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">EstateFlow</div>
            <div class="badge">Team Invitation</div>
            <h2>Join ${orgName} on EstateFlow</h2>
            <p>Hello,</p>
            <p><strong>${invitedByName || 'An Admin'}</strong> has invited you to join the <strong>${orgName}</strong> real estate management workspace as an <strong>${assignedRole}</strong>.</p>
            <p>Click the button below to complete your registration and automatically access your company dashboard:</p>
            <p><a href="${joinUrl}" class="btn">Accept Invitation & Join Team</a></p>
            <p style="font-size: 13px; color: #64748b;">If you were not expecting this invitation, you can safely ignore this email.</p>
            <div class="footer">
              Sent via your self-hosted Mailcow SMTP server &bull; EstateFlow Real Estate Management
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: normalizedEmail,
      subject: `EstateFlow: Invitation to join ${orgName}`,
      text: `Hello,\n\nYou have been invited to join ${orgName} on EstateFlow as an ${assignedRole}.\nVisit the following URL to accept your invite:\n${joinUrl}\n\nIf you did not expect this invitation, please ignore this email.`,
      html: htmlMessage,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation email successfully sent to ${normalizedEmail} via Mailcow SMTP.`,
      configured: true,
    });

  } catch (error: any) {
    console.error('Mailcow SMTP Send Error:', error);

    let friendlyMessage = error.message || 'Failed to send invite email through Mailcow SMTP.';
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      friendlyMessage = `Mailcow Authentication Failed (535): Incorrect password or mailbox not found for "${process.env.SMTP_USER}".`;
    }

    return NextResponse.json(
      { 
        error: friendlyMessage,
        details: error.code || 'SMTP_TRANSACTION_FAILED'
      },
      { status: 500 }
    );
  }
}
