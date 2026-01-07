import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { getAuthFromRequest } from '@/lib/auth';

import { verifyPassword } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId') || null;
    const password = request.headers.get('x-folder-password');

    await connectToDatabase();

    // Verify folder access if parentId is provided
    if (parentId) {
      const parentFolder = await File.findById(parentId);
      
      if (!parentFolder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      // Check if folder is protected
      if (parentFolder.passwordHash) {
        // If password provided, verify it
        if (password) {
          const isValid = verifyPassword(password, parentFolder.passwordHash);
          if (!isValid) {
             return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
          }
        } else {
           // If no password provided, return 403 (Forbidden)
           return NextResponse.json({ error: 'Password required' }, { status: 403 });
        }
      }
    }

    const files = await File.find({ parentId })
      .sort({ isFolder: -1, uploadedAt: -1 }) // Folders first
      .select('_id filename originalName mimeType size uploadedAt uploadedBy isFolder passwordHash')
      .lean();

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        id: file._id,
        name: file.originalName,
        filename: file.filename,
        type: file.mimeType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        uploadedBy: file.uploadedBy,
        isFolder: file.isFolder || false,
        isProtected: !!file.passwordHash
      })),
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
