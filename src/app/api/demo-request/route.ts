import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import {
  createDemoRequestDirectly,
  getDemoRequestsDirectly,
  updateDemoRequestStatusDirectly,
} from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function cleanEnvStr(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export async function GET() {
  try {
    const requests = await getDemoRequestsDirectly();
    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    console.error('Failed to get demo requests:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve demo requests.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, phone, projectCount, tier, notes } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const cleanCompany = String(company || '').trim();

    if (!cleanName || !cleanEmail || !emailRegex.test(cleanEmail) || !cleanCompany) {
      return NextResponse.json(
        { error: 'Your name, a valid email address, and company name are required.' },
        { status: 400 }
      );
    }

    const payload = {
      name: cleanName.slice(0, 100),
      email: cleanEmail.slice(0, 100),
      company: cleanCompany.slice(0, 100),
      phone: String(phone || '').trim().slice(0, 50),
      projectCount: String(projectCount || '').trim().slice(0, 50),
      tier: String(tier || 'demo').trim().toLowerCase().slice(0, 30),
      notes: String(notes || '').trim().slice(0, 1000),
    };

    // 1. Save directly to Firestore via authenticated OAuth2 REST API
    const result = await createDemoRequestDirectly(payload);

    // 2. Dispatch notification email to info@remotizedit.com via SMTP
    const smtpHost = cleanEnvStr(process.env.SMTP_HOST);
    const smtpPort = parseInt(cleanEnvStr(process.env.SMTP_PORT) || '587', 10);
    const smtpUser = cleanEnvStr(process.env.SMTP_USER);
    const smtpPass = cleanEnvStr(process.env.SMTP_PASS);
    const smtpSecure = cleanEnvStr(process.env.SMTP_SECURE) === 'true';
    const smtpFromName = cleanEnvStr(process.env.SMTP_FROM_NAME) || 'EstateFlow Demo Alert';
    const smtpFromEmail = cleanEnvStr(process.env.SMTP_FROM_EMAIL) || smtpUser || 'noreply@remotizedit.online';

    if (smtpHost && smtpUser && smtpPass && smtpHost !== 'mail.yourdomain.com') {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 8000,
        });

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
                .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
                .logo { font-size: 20px; font-weight: 800; color: #0f172a; }
                .logo span { color: #d97706; }
                .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { text-align: left; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
                th { background-color: #f8fafc; color: #475569; width: 35%; font-weight: 600; }
                td { color: #0f172a; }
                .notes { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; margin-top: 16px; }
                .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">Estate<span>Flow</span> &bull; <span style="font-size: 14px; font-weight: 600; color: #475569;">New Demo Request</span></div>
                  <div style="margin-top: 6px;"><span class="badge">PROSPECT DEMO INQUIRY</span></div>
                </div>

                <p style="font-size: 14px; color: #334155;">A new prospective client has requested an EstateFlow workspace demo from the product landing page:</p>

                <table>
                  <tr><th>Company / Org</th><td><strong>${payload.company}</strong></td></tr>
                  <tr><th>Contact Person</th><td>${payload.name}</td></tr>
                  <tr><th>Work Email</th><td><a href="mailto:${payload.email}">${payload.email}</a></td></tr>
                  <tr><th>Phone / WhatsApp</th><td>${payload.phone || 'Not provided'}</td></tr>
                  <tr><th>Plan of Interest</th><td><strong style="text-transform: uppercase;">${payload.tier}</strong></td></tr>
                  <tr><th>Development Scale</th><td>${payload.projectCount || 'Not specified'}</td></tr>
                  <tr><th>Submission Date</th><td>${new Date().toUTCString()}</td></tr>
                </table>

                ${payload.notes ? `
                  <div class="notes">
                    <strong>Client Message / Requirements:</strong><br/>
                    ${payload.notes}
                  </div>
                ` : ''}

                <div class="footer">
                  This automated notification was generated by the EstateFlow ERP Portal &bull; Developed by Remotized IT (<a href="mailto:info@remotizedit.com">info@remotizedit.com</a>)
                </div>
              </div>
            </body>
          </html>
        `;

        await transporter.sendMail({
          from: `"${smtpFromName}" <${smtpFromEmail}>`,
          to: 'info@remotizedit.com',
          replyTo: payload.email,
          subject: `✨ New Demo Request: ${payload.company} (${payload.name}) - EstateFlow`,
          html: emailHtml,
        });
      } catch (mailErr) {
        console.warn('Demo request email dispatch note:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Thank you! Your demo request has been received. Our solutions team will contact you shortly.',
    });

  } catch (err: any) {
    console.error('Demo request API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process demo request. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status || !['pending', 'contacted', 'provisioned'].includes(status)) {
      return NextResponse.json(
        { error: 'requestId and a valid status are required.' },
        { status: 400 }
      );
    }

    const success = await updateDemoRequestStatusDirectly(requestId, status);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update demo request status.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update demo request.' },
      { status: 500 }
    );
  }
}
