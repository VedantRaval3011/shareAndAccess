
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { sendOtpEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json();
    if (!folderId) return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });

    await connectToDatabase();
    const folder = await File.findById(folderId);
    if (!folder || !folder.isFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    folder.recoveryOtp = otp;
    folder.recoveryOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await folder.save();

    const sent = await sendOtpEmail(otp);
    if (!sent) {
       // Ideally rollback or inform user.
       // But log shows it might be dev mode.
       return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
