
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { createRecoveryToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { folderId, otp } = await request.json();
    if (!folderId || !otp) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    await connectToDatabase();
    const folder = await File.findById(folderId).select('+recoveryOtp +recoveryOtpExpires');
    
    if (!folder || !folder.recoveryOtp || !folder.recoveryOtpExpires) {
       return NextResponse.json({ error: 'Invalid OTP request' }, { status: 400 });
    }

    if (new Date() > folder.recoveryOtpExpires) {
       return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    if (folder.recoveryOtp !== otp) {
       return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // Clear OTP
    folder.recoveryOtp = undefined;
    folder.recoveryOtpExpires = undefined;
    await folder.save();

    // Generate token
    const recoveryToken = await createRecoveryToken(folder.id);

    return NextResponse.json({ success: true, recoveryToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
