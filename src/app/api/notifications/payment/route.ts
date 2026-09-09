import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // 'customer_receipt' | 'vendor_remittance'
      recipientEmail,
      customerName,
      vendorName,
      enterpriseName,
      receiptId,
      expenseId,
      amount,
      formattedAmount,
      currencySymbol = '৳',
      paymentMethod = 'Cash',
      paymentPurpose = 'Installment',
      date,
      projectName,
      flatNumber,
      reference,
      description,
      companyName = 'EstateFlow Real Estate',
      companyPhone,
      companyEmail,
      companyAddress,
    } = body;

    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid recipient email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = recipientEmail.trim().toLowerCase();
    const displayAmount = formattedAmount || `${currencySymbol} ${Number(amount || 0).toLocaleString()}`;
    const displayDate = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US');

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpFromName = process.env.SMTP_FROM_NAME || companyName || 'EstateFlow Accounts';
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || 'noreply@estateflow.com';

    // Verify SMTP settings are configured and not placeholder values
    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPass ||
      smtpHost.includes('yourdomain.com') ||
      smtpHost.includes('yourcompany.com') ||
      smtpPass.includes('your_')
    ) {
      return NextResponse.json(
        {
          success: false,
          warning: 'SMTP email server is not configured or uses placeholder credentials.',
          configured: false,
        },
        { status: 200 }
      );
    }

    // Initialize SMTP transporter
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

    let subject = '';
    let htmlContent = '';

    if (type === 'customer_receipt') {
      subject = `Payment Confirmation & Money Receipt #${receiptId || 'REC'} - ${companyName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .header { background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; padding: 32px 28px; text-align: left; }
              .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
              .badge { display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; }
              .body-content { padding: 28px; }
              .amount-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
              .amount-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; margin-bottom: 4px; }
              .amount-value { font-size: 32px; font-weight: 800; color: #14532d; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .table th { text-align: left; padding: 10px 12px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9; width: 40%; }
              .table td { text-align: right; padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
              .footer { background: #f8fafc; padding: 20px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="brand">${companyName}</div>
                <div style="font-size: 13px; opacity: 0.85;">Official Electronic Money Receipt</div>
                <div class="badge">Payment Received</div>
              </div>
              <div class="body-content">
                <p style="font-size: 15px; margin-top: 0;">Dear <strong>${customerName || 'Valued Client'}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                  We gratefully acknowledge receipt of your payment. Below are the confirmed transaction details for your records:
                </p>

                <div class="amount-card">
                  <div class="amount-label">Amount Paid</div>
                  <div class="amount-value">${displayAmount}</div>
                </div>

                <table class="table">
                  <tr><th>Receipt Number</th><td>#${receiptId || 'N/A'}</td></tr>
                  <tr><th>Payment Date</th><td>${displayDate}</td></tr>
                  ${projectName ? `<tr><th>Project</th><td>${projectName}</td></tr>` : ''}
                  ${flatNumber ? `<tr><th>Unit / Flat</th><td>Flat ${flatNumber}</td></tr>` : ''}
                  <tr><th>Payment Purpose</th><td>${paymentPurpose}</td></tr>
                  <tr><th>Payment Method</th><td>${paymentMethod}</td></tr>
                  ${reference ? `<tr><th>Transaction Reference</th><td>${reference}</td></tr>` : ''}
                </table>

                <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                  This is an automated system confirmation. You may also request or download a detailed signed PDF voucher directly from our corporate office.
                </p>
              </div>
              <div class="footer">
                <strong>${companyName}</strong><br>
                ${companyAddress ? `${companyAddress}<br>` : ''}
                ${companyPhone ? `Contact: ${companyPhone} | ` : ''}${companyEmail ? `Email: ${companyEmail}` : ''}
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      // Vendor Remittance Advice
      subject = `Payment Voucher Notification: ${expenseId || 'EXP'} - ${companyName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .header { background: linear-gradient(135deg, #1e1b4b, #312e81); color: #ffffff; padding: 32px 28px; text-align: left; }
              .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
              .badge { display: inline-block; background: #6366f1; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; }
              .body-content { padding: 28px; }
              .amount-card { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
              .amount-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #3730a3; letter-spacing: 0.5px; margin-bottom: 4px; }
              .amount-value { font-size: 32px; font-weight: 800; color: #1e1b4b; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .table th { text-align: left; padding: 10px 12px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9; width: 40%; }
              .table td { text-align: right; padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
              .footer { background: #f8fafc; padding: 20px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="brand">${companyName}</div>
                <div style="font-size: 13px; opacity: 0.85;">Vendor Payment Remittance Advice</div>
                <div class="badge">Disbursement Processed</div>
              </div>
              <div class="body-content">
                <p style="font-size: 15px; margin-top: 0;">Dear <strong>${vendorName || enterpriseName || 'Vendor Partner'}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                  We are pleased to notify you that a supplier disbursement has been recorded and processed for your enterprise account:
                </p>

                <div class="amount-card">
                  <div class="amount-label">Disbursement Amount</div>
                  <div class="amount-value">${displayAmount}</div>
                </div>

                <table class="table">
                  <tr><th>Voucher / Expense ID</th><td>#${expenseId || 'N/A'}</td></tr>
                  <tr><th>Payment Date</th><td>${displayDate}</td></tr>
                  ${enterpriseName ? `<tr><th>Enterprise Name</th><td>${enterpriseName}</td></tr>` : ''}
                  ${projectName ? `<tr><th>Project Attribution</th><td>${projectName}</td></tr>` : ''}
                  <tr><th>Payment Method</th><td>${paymentMethod}</td></tr>
                  ${reference ? `<tr><th>Payment Reference / Chq #</th><td>${reference}</td></tr>` : ''}
                  ${description ? `<tr><th>Description</th><td>${description}</td></tr>` : ''}
                </table>

                <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                  Please verify this remittance with your accounting department. For any reconciliation questions, reply to this email or contact our finance desk.
                </p>
              </div>
              <div class="footer">
                <strong>${companyName} Accounts Department</strong><br>
                ${companyAddress ? `${companyAddress}<br>` : ''}
                ${companyPhone ? `Contact: ${companyPhone} | ` : ''}${companyEmail ? `Email: ${companyEmail}` : ''}
              </div>
            </div>
          </body>
        </html>
      `;
    }

    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: normalizedEmail,
      subject,
      html: htmlContent,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      recipient: normalizedEmail,
    });
  } catch (error: any) {
    console.error('Payment notification dispatch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to dispatch email notification.',
      },
      { status: 500 }
    );
  }
}
