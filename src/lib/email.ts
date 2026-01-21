import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(otp: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    console.error('ADMIN_EMAIL not set');
    return false;
  }

  // Fallback for development if SMTP not configured: Log OTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('---------------------------------------------------');
    console.log(`[DEV MODE] OTP for ${adminEmail}: ${otp}`);
    console.log('---------------------------------------------------');
    return true; // Pretend we sent it
  }

  try {
    await transporter.sendMail({
      from: adminEmail,
      to: adminEmail,
      subject: 'Folder Access OTP',
      text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
