import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    // Fetch batch data
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Fetch stages
    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .eq('batchId', batchId)
      .order('order', { ascending: true });

    if (stagesError) {
      console.error('Error fetching stages:', stagesError);
    }

    // Return public batch details
    return NextResponse.json({
      batchCode: batch.batchCode,
      name: batch.name,
      cropType: batch.cropType,
      quantity: batch.quantity || 0,
      farmerName: batch.farmerName || 'Unknown Farmer',
      location: batch.location || 'Unknown Location',
      harvestDate: batch.harvestDate,
      status: batch.status,
      blockchainTxHash: batch.blockchainTxHash,
      blockchainNetwork: batch.blockchainNetwork,
      blockchainSyncedAt: batch.blockchainSyncedAt,
      stages: stages || [],
    });
  } catch (error) {
    console.error('Error fetching batch details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch details' },
      { status: 500 }
    );
  }
}
