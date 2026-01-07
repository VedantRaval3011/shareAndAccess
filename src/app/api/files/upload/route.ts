import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { uploadToStorage, generateStorageKey, sanitizeFilename } from '@/lib/storage';
import { getAuthFromRequest } from '@/lib/auth';

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const parentId = formData.get('parentId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Read file into buffer and calculate checksum
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const checksum = createHash('md5').update(buffer).digest('hex');

    // Connect to database
    await connectToDatabase();

    // Check for duplicate by checksum
    const existingByChecksum = await File.findOne({ checksum });
    if (existingByChecksum) {
      return NextResponse.json(
        { 
          error: 'Duplicate file detected', 
          message: 'A file with identical content already exists',
          existingFile: {
            id: existingByChecksum._id,
            name: existingByChecksum.originalName,
          }
        },
        { status: 409 }
      );
    }

    // Check for duplicate by filename + size + parentId
    const existingByNameSize = await File.findOne({
      originalName: file.name,
      size: file.size,
      parentId: parentId || null,
    });
    if (existingByNameSize) {
      return NextResponse.json(
        { 
          error: 'Duplicate file detected', 
          message: 'A file with the same name and size already exists',
          existingFile: {
            id: existingByNameSize._id,
            name: existingByNameSize.originalName,
          }
        },
        { status: 409 }
      );
    }

    // Generate storage key and upload
    const sanitizedName = sanitizeFilename(file.name);
    const storageKey = generateStorageKey(sanitizedName);

    await uploadToStorage(arrayBuffer, storageKey, file.type);

    // Save metadata to MongoDB
    const fileDoc = new File({
      filename: sanitizedName,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      storageKey,
      checksum,
      uploadedBy: auth.username,
      parentId: parentId || null,
    });

    await fileDoc.save();

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully',
        file: {
          id: fileDoc._id,
          name: fileDoc.originalName,
          size: fileDoc.size,
          type: fileDoc.mimeType,
          uploadedAt: fileDoc.uploadedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
