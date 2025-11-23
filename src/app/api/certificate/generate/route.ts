import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/certificate/generate?batchId=xxx
 * Generate certificate data for a verified batch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 }
      );
    }

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

    // Check if batch is verified and synced to blockchain
    if (!batch.verified || !batch.blockchainTxHash) {
      return NextResponse.json(
        { error: 'Certificate only available for verified and blockchain-synced batches' },
        { status: 400 }
      );
    }

    // Fetch all stages
    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .eq('batchId', batchId)
      .order('order', { ascending: true });

    if (stagesError) {
      console.error('Error fetching stages:', stagesError);
    }

    // Get blockchain explorer URL
    const explorerUrl = batch.blockchainNetwork === 'polygon-amoy'
      ? `https://amoy.polygonscan.com/tx/${batch.blockchainTxHash}`
      : `https://testnet.polygonscan.com/tx/${batch.blockchainTxHash}`;

    // Generate certificate data
    const certificate = {
      certificateId: `CERT-${batch.batchCode}-${Date.now()}`,
      issuedDate: new Date().toISOString(),
      batch: {
        id: batch.id,
        batchCode: batch.batchCode,
        name: batch.name,
        cropType: batch.cropType,
        category: batch.category,
        area: batch.area,
        quantity: batch.quantity || 0,
        farmerName: batch.farmerName,
        location: batch.location,
        sowingDate: batch.sowingDate,
        harvestDate: batch.harvestDate,
        description: batch.description,
      },
      verification: {
        verified: batch.verified,
        verifiedAt: batch.verifiedAt,
        verifiedBy: batch.verifiedBy,
        verificationStatus: batch.verificationStatus,
      },
      blockchain: {
        network: batch.blockchainNetwork,
        transactionHash: batch.blockchainTxHash,
        dataHash: batch.blockchainHash,
        syncedAt: batch.blockchainSyncedAt,
        verified: batch.blockchainVerified,
        explorerUrl: explorerUrl,
      },
      stages: (stages || []).map(stage => ({
        name: stage.name,
        order: stage.order,
        completedAt: stage.completedAt,
        imageCount: (stage.imageUrls || []).length,
        verified: true, // If batch is verified, all stages are verified
      })),
      qrCode: batch.qrCode,
      verifyUrl: batch.verifyUrl,
    };

    return NextResponse.json(certificate);

  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
