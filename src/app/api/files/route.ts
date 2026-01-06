import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const files = await File.find({})
      .sort({ uploadedAt: -1 })
      .select('_id filename originalName mimeType size uploadedAt uploadedBy')
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
