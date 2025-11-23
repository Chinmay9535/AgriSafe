import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST endpoint - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, area, location, description, farmerId, sowingDate } = body;

    if (!name || !category || !area || !farmerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get batch count to generate batch code
    const { count } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true });

    const batchCode = 'FB' + String((count || 0) + 1).padStart(3, '0');

    // Create new batch
    const { data: newBatch, error } = await supabase
      .from('batches')
      .insert({
        batchCode,
        name,
        cropType: category, // Map category to cropType
        category,
        area: parseFloat(area),
        sowingDate: sowingDate || new Date().toISOString(),
        harvestDate: sowingDate || new Date().toISOString(), // Required field
        farmerName: 'Farmer', // Will be updated with actual farmer name
        quantity: 0, // Will be updated later
        description: description || '',
        status: 'ACTIVE',
        verified: false,
        verificationStatus: 'PENDING',
        farmerId: farmerId,
        qrCode: null, // QR code will be generated after blockchain sync
        verifyUrl: null,
        imageUrls: [],
        location: location || 'Farm Location, India'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating batch:', error);
      return NextResponse.json(
        { error: 'Failed to create batch' },
        { status: 500 }
      );
    }

    return NextResponse.json(newBatch, { status: 201 });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}

// GET endpoint - Fetch batches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmerId = searchParams.get('farmerId');

    let query = supabase
      .from('batches')
      .select('*')
      .order('createdAt', { ascending: false });

    if (farmerId) {
      query = query.eq('farmerId', farmerId);
    }

    const { data: batches, error } = await query;

    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch batches' },
        { status: 500 }
      );
    }

    return NextResponse.json(batches || []);
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Update batch verification
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, verified, adminId } = body;

    if (!batchId || verified === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: updatedBatch, error } = await supabase
      .from('batches')
      .update({
        verified: verified,
        verificationStatus: verified ? 'VERIFIED' : 'REJECTED',
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminId,
      })
      .eq('id', batchId)
      .select()
      .single();

    if (error) {
      console.error('Error updating batch verification:', error);
      return NextResponse.json(
        { error: 'Failed to update batch verification' },
        { status: 500 }
      );
    }

    // If verified, automatically sync to blockchain
    if (verified) {
      try {
        console.log('🔗 Auto-syncing verified batch to blockchain...');
        
        // Use localhost for internal API calls to avoid ngrok issues
        const internalUrl = 'http://localhost:3005';
        const syncResponse = await fetch(`${internalUrl}/api/blockchain/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId }),
        });

        // Check if response is JSON before parsing
        const contentType = syncResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await syncResponse.text();
          console.error('⚠️ Blockchain sync returned non-JSON response:', text.substring(0, 200));
          throw new Error('Blockchain sync endpoint returned non-JSON response');
        }

        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
          console.log('✅ Batch synced to blockchain with QR code');
          return NextResponse.json({
            ...updatedBatch,
            blockchainSynced: true,
            blockchainTxHash: syncResult.transaction?.hash,
            message: 'Batch verified and synced to blockchain'
          });
        } else {
          console.warn('⚠️ Blockchain sync failed:', syncResult.message);
        }
      } catch (syncError) {
        console.error('⚠️ Blockchain sync error:', syncError);
        // Don't fail the verification if blockchain sync fails
      }
    }

    return NextResponse.json(updatedBatch);
  } catch (error) {
    console.error('Error updating batch verification:', error);
    return NextResponse.json(
      { error: 'Failed to update batch verification' },
      { status: 500 }
    );
  }
}
