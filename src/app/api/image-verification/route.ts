import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      imageUrl, 
      verificationStatus, 
      rejectionReason, // Admin's reason when marking as FAKE
      stageId, 
      batchId, 
      farmerId, 
      verifiedBy 
    } = body;

    if (!imageUrl || !verificationStatus || !stageId || !batchId || !farmerId || !verifiedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If marking as FAKE, rejectionReason is required
    if (verificationStatus === 'FAKE' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when marking image as FAKE' },
        { status: 400 }
      );
    }

    // Validate verification status
    if (!['REAL', 'FAKE'].includes(verificationStatus)) {
      return NextResponse.json(
        { error: 'Invalid verification status. Must be REAL or FAKE' },
        { status: 400 }
      );
    }

    // If marking as FAKE, delete the image from Supabase Storage
    if (verificationStatus === 'FAKE') {
      try {
        // Extract file path from Supabase URL
        const urlParts = imageUrl.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          const { error: deleteError } = await supabase.storage
            .from('batch-images')
            .remove([filePath]);
          
          if (deleteError) {
            console.error('Error deleting fake image from storage:', deleteError);
          } else {
            console.log('Successfully deleted fake image from storage:', filePath);
          }
        }
      } catch (deleteErr) {
        console.error('Error parsing/deleting image URL:', deleteErr);
      }
    }

    // Check if verification record already exists
    const { data: existing } = await supabase
      .from('image_verifications')
      .select('*')
      .eq('imageUrl', imageUrl)
      .eq('stageId', stageId)
      .single();

    let imageVerification;
    
    if (existing) {
      // Update existing record
      const updateData: any = {
        verificationStatus,
        verifiedBy,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add rejection reason if marking as FAKE
      if (verificationStatus === 'FAKE') {
        updateData.rejectionReason = rejectionReason;
      } else {
        // Clear rejection reason if marking as REAL
        updateData.rejectionReason = null;
      }

      const { data, error } = await supabase
        .from('image_verifications')
        .update(updateData)
        .eq('imageUrl', imageUrl)
        .eq('stageId', stageId)
        .select()
        .single();

      if (error) throw error;
      imageVerification = data;
    } else {
      // Insert new record
      const insertData: any = {
        imageUrl,
        verificationStatus,
        verifiedBy,
        verifiedAt: new Date().toISOString(),
        stageId,
        batchId,
        farmerId
      };

      // Add rejection reason if marking as FAKE
      if (verificationStatus === 'FAKE') {
        insertData.rejectionReason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('image_verifications')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      imageVerification = data;
    }

    // Create notification for farmer (async, non-blocking)
    createNotificationForFarmer(imageVerification, farmerId, verificationStatus, rejectionReason)
      .then(() => {
        console.log('✅ Notification created successfully for farmer:', farmerId);
      })
      .catch(err => {
        console.error('❌ Error creating notification:', err);
      });

    return NextResponse.json({
      success: true,
      verification: imageVerification,
      notificationCreated: true // Let frontend know notification was triggered
    });

  } catch (error) {
    console.error('Error updating image verification:', error);
    return NextResponse.json(
      { error: 'Failed to update image verification' },
      { status: 500 }
    );
  }
}

// Helper function to create farmer notification
async function createNotificationForFarmer(
  verification: any,
  farmerId: string,
  status: string,
  rejectionReason?: string
) {
  try {
    console.log('📧 Creating notification for farmer:', farmerId, 'Status:', status);
    
    const notificationData: any = {
      userId: farmerId,
      metadata: {
        imageUrl: verification.imageUrl,
        stageId: verification.stageId,
        batchId: verification.batchId,
        verificationId: verification.id
      }
    };

    if (status === 'REAL') {
      notificationData.type = 'IMAGE_VERIFIED';
      notificationData.title = '✅ Image Verified';
      notificationData.message = 'Your uploaded image has been verified as authentic by admin.';
    } else if (status === 'FAKE') {
      notificationData.type = 'IMAGE_FLAGGED';
      notificationData.title = '❌ Image Flagged';
      notificationData.message = rejectionReason 
        ? `Your image was flagged as fake. Reason: ${rejectionReason}`
        : 'Your image was flagged as fake. Please review and reupload.';
      notificationData.metadata.rejectionReason = rejectionReason;
    }

    console.log('📧 Notification data:', JSON.stringify(notificationData, null, 2));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select();

    if (error) {
      console.error('❌ Supabase error creating notification:', error);
      throw error;
    }

    console.log('✅ Notification created in database:', data);

  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error; // Throw so we can see the error in logs
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get('stageId');
    const batchId = searchParams.get('batchId');

    if (!stageId && !batchId) {
      return NextResponse.json(
        { error: 'Either stageId or batchId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('image_verifications')
      .select('*');

    if (stageId) {
      query = query.eq('stageId', stageId);
    } else if (batchId) {
      query = query.eq('batchId', batchId);
    }

    const { data: verifications, error } = await query;

    if (error) {
      console.error('Error fetching verifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verifications' },
        { status: 500 }
      );
    }

    // Optionally fetch verifier details separately if needed
    const verificationsWithDetails = verifications || [];

    return NextResponse.json({ verifications: verificationsWithDetails });

  } catch (error) {
    console.error('Error fetching image verifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image verifications' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('imageUrl');
    const stageId = searchParams.get('stageId');

    if (!imageUrl || !stageId) {
      return NextResponse.json(
        { error: 'imageUrl and stageId are required' },
        { status: 400 }
      );
    }

    // Delete the verification record
    const { error } = await supabase
      .from('image_verifications')
      .delete()
      .eq('imageUrl', imageUrl)
      .eq('stageId', stageId);

    if (error) {
      console.error('Error deleting verification:', error);
      return NextResponse.json(
        { error: 'Failed to delete verification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification status reset'
    });

  } catch (error) {
    console.error('Error resetting image verification:', error);
    return NextResponse.json(
      { error: 'Failed to reset image verification' },
      { status: 500 }
    );
  }
}
