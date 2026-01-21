
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { getAuthFromRequest, verifyRecoveryToken } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/encryption';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, emoji, password, currentPassword, recoveryToken } = await request.json();

    await connectToDatabase();
    const folder = await File.findById(id);

    if (!folder || !folder.isFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Security Check
    // If we are modifying security (password) OR just editing a protected folder
    if (folder.passwordHash) {
      let authorized = false;

      // 1. Check recovery token
      if (recoveryToken) {
        const recoveredId = await verifyRecoveryToken(recoveryToken);
        if (recoveredId === id) authorized = true;
      }

      // 2. Check current password
      if (!authorized && currentPassword) {
        if (verifyPassword(currentPassword, folder.passwordHash)) {
          authorized = true;
        }
      }

      if (!authorized) {
        return NextResponse.json({ error: 'Password required or invalid recovery token' }, { status: 403 });
      }
    }

    // Update fields
    if (name) {
       // Check for duplicates if name changed
       if (name !== folder.originalName) {
         const existing = await File.findOne({
            originalName: name,
            parentId: folder.parentId,
            isFolder: true,
            _id: { $ne: id }
         });
         if (existing) {
           return NextResponse.json({ error: 'Folder with this name already exists' }, { status: 409 });
         }
         folder.originalName = name;
         folder.filename = name;
       }
    }

    if (emoji !== undefined) folder.emoji = emoji;

    if (password) {
      folder.passwordHash = hashPassword(password);
    } 
    // If password is sent as empty string explicitly, maybe remove password?
    // Let's assume sending '' means remove protection.
    if (password === '') {
      folder.passwordHash = undefined;
    }

    await folder.save();

    return NextResponse.json({
      success: true,
      folder: {
        id: folder._id,
        name: folder.originalName,
        isFolder: true,
        emoji: folder.emoji,
        isProtected: !!folder.passwordHash
      }
    });

  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}
