import { NextRequest, NextResponse } from 'next/server';
import { supabase, STORAGE_BUCKET, UPLOAD_CONFIG, generateFileName, getPublicUrl } from '@/lib/supabase-config';

// File validation helper
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${UPLOAD_CONFIG.allowedTypes.join(', ')}`
    };
  }

  if (file.size > UPLOAD_CONFIG.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${UPLOAD_CONFIG.maxSize / 1024 / 1024}MB`
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (add your auth logic here)
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const farmerName = formData.get('farmerName') as string;
    const batchName = formData.get('batchName') as string;
    const stageName = formData.get('stageName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate organized file path with folder structure
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    
    // Create organized folder structure: farmer-name/batch-name/stage-name/filename
    const sanitizeFolderName = (name: string) => 
      name?.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'unknown';
    
    const organizedPath = [
      sanitizeFolderName(farmerName),
      sanitizeFolderName(batchName),
      sanitizeFolderName(stageName),
      `${timestamp}-${randomString}.${fileExtension}`
    ].join('/');

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage with organized path
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(organizedPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    // Generate public URL
    const imageUrl = getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      fileName: data.path,
      size: file.size,
      type: file.type,
      folderStructure: {
        farmer: farmerName,
        batch: batchName,
        stage: stageName,
        path: organizedPath
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// Optional: DELETE endpoint to remove uploaded files
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName is required' },
        { status: 400 }
      );
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
