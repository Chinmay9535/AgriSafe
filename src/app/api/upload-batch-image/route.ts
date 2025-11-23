import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST endpoint - Upload image to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userName = formData.get('userName') as string; // User's name for folder
    const stageName = formData.get('stageName') as string; // Stage name (1-7)

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userName || !stageName) {
      return NextResponse.json(
        { error: 'userName and stageName are required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create folder structure: {userName}/{stageName}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedUserName = userName.replace(/[^a-zA-Z0-9-_]/g, '_'); // Remove special chars
    const sanitizedStageName = stageName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${sanitizedUserName}/${sanitizedStageName}/${timestamp}-${file.name}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('batch-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('batch-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
      folder: `${sanitizedUserName}/${sanitizedStageName}`
    });

  } catch (error) {
    console.error('Error in image upload:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
