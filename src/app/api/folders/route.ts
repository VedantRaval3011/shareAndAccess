
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { getAuthFromRequest } from '@/lib/auth';

import { hashPassword } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, parentId, password, emoji } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Check for existing folder with same name in same parent
    const existing = await File.findOne({
      originalName: name,
      parentId: parentId || null,
      isFolder: true
    });

    if (existing) {
      return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
    }

    const folder = new File({
      filename: name, // Folders don't have a storage key, but need a filename
      originalName: name,
      mimeType: 'application/x-directory',
      size: 0,
      storageKey: `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Dummy key for unique constraint
      checksum: 'folder', // Dummy checksum
      uploadedBy: auth.username,
      parentId: parentId || null,
      isFolder: true,
      passwordHash: password ? hashPassword(password) : undefined,
      emoji: emoji || null,
    });

    await folder.save();

    return NextResponse.json({
      success: true,
      folder: {
        id: folder._id,
        name: folder.originalName,
        isFolder: true,
        parentId: folder.parentId,
        isProtected: !!folder.passwordHash,
        emoji: folder.emoji,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
