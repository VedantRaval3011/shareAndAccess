import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import File from '@/models/File';
import { getAuthFromRequest } from '@/lib/auth';
import { getFileStream } from '@/lib/storage';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

// Convert Web ReadableStream to Node.js Readable stream
function webStreamToNodeStream(webStream: ReadableStream): Readable {
  const reader = webStream.getReader();
  
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
    destroy(error, callback) {
      reader.cancel().then(() => callback(error)).catch(callback);
    }
  });
}

// If we need to support recursive folder download
async function getFilesRecursively(folderId: string, currentPath: string = ''): Promise<{storageKey: string, zipPath: string}[]> {
  const files = await File.find({ parentId: folderId }).lean();
  let results: {storageKey: string, zipPath: string}[] = [];

  for (const file of files) {
    if (file.isFolder) {
      const children = await getFilesRecursively(file._id.toString(), `${currentPath}${file.originalName}/`);
      results = results.concat(children);
    } else if (file.storageKey) {
      results.push({
        storageKey: file.storageKey,
        zipPath: `${currentPath}${file.originalName}`
      });
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileIds, folderId } = await request.json();

    if ((!fileIds || fileIds.length === 0) && !folderId) {
       return NextResponse.json({ error: 'No files or folder specified' }, { status: 400 });
    }

    await connectToDatabase();

    let filesToZip: {storageKey: string, zipPath: string}[] = [];
    let zipName = 'download.zip';

    if (folderId) {
      const folder = await File.findById(folderId);
      if (!folder || !folder.isFolder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      zipName = `${folder.originalName}.zip`;
      
      filesToZip = await getFilesRecursively(folderId, '');
      if (filesToZip.length === 0) {
         return NextResponse.json({ error: 'Folder is empty' }, { status: 400 });
      }
    } else {
      const files = await File.find({ _id: { $in: fileIds }, isFolder: false }).lean();
      
      if (files.length === 0) {
        return NextResponse.json({ error: 'No valid files found' }, { status: 404 });
      }
      
      filesToZip = files.map(f => ({
        storageKey: f.storageKey,
        zipPath: f.originalName
      }));
      
      if (files.length === 1) {
         zipName = `${files[0].originalName}.zip`;
      } else {
         zipName = `files_${new Date().getTime()}.zip`;
      }
    }

    // Create PassThrough stream - it's both readable and writable
    const passThrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err: Error) => {
      console.error('Archiver error:', err);
      passThrough.destroy(err);
    });

    archive.on('warning', (err: Error) => {
      console.warn('Archiver warning:', err);
    });

    // Pipe archive to passThrough (writable side)
    archive.pipe(passThrough);

    // Process files async
    (async () => {
      try {
        for (const item of filesToZip) {
          try {
            const webStream = await getFileStream(item.storageKey);
            // Convert Web ReadableStream to Node Readable Stream
            const nodeStream = webStreamToNodeStream(webStream);
            
            archive.append(nodeStream, { name: item.zipPath });
          } catch (err) {
            console.error(`Failed to add file ${item.zipPath} to zip:`, err);
            // Append an error log text file
            archive.append(Buffer.from(`Failed to download: ${err}`), { name: `${item.zipPath}.error.txt` });
          }
        }
        await archive.finalize();
      } catch (error) {
        console.error('Error finalizing archive:', error);
        passThrough.destroy(error as Error);
      }
    })();

    // Return passThrough as readable stream
    return new NextResponse(passThrough as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipName)}"`,
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Zip download error:', error);
    return NextResponse.json({ error: 'Failed to create zip' }, { status: 500 });
  }
}