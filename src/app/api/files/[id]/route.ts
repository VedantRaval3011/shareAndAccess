import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { getAuthFromRequest } from '@/lib/auth';
import { deleteFromStorage } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    // Find the file/folder
    const item = await File.findById(id);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // If it's a folder, check if it has contents
    if (item.isFolder) {
      const childCount = await File.countDocuments({ parentId: id });
      if (childCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete folder with contents. Please delete all files and subfolders first.' },
          { status: 400 }
        );
      }
    }

    // Delete from storage (only for files, not folders)
    if (!item.isFolder && item.storageKey) {
      try {
        await deleteFromStorage(item.storageKey);
      } catch (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    await File.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `${item.isFolder ? 'Folder' : 'File'} deleted successfully`,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
