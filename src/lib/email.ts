import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5
});

export async function sendVerificationEmail(email: string, code: string) {
  const mailOptions = {
    from: `PRICIO AI <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Verify your email address - PRICIO AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6B46C1;">Welcome to PRICIO AI!</h1>
        <p>Thank you for signing up! Please use the verification code below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 5px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #6B46C1;">${code}</span>
          </div>
        </div>
        <p style="color: #666;">This code will expire in 24 hours. If you did not sign up for this account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">This is an automated message from PRICIO AI. Please do not reply to this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}