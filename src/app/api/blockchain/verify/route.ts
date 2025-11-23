import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blockchainService, BatchBlockchainData, StageData } from '@/lib/blockchain/blockchain-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/blockchain/verify?batchId=xxx
 * Verify batch data integrity against blockchain record
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

    // 1. Fetch batch from database
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

    // 2. Check if batch is synced
    if (batch.blockchainStatus !== 'SYNCED') {
      return NextResponse.json({
        verified: false,
        message: 'Batch not yet synced to blockchain',
        blockchainStatus: batch.blockchainStatus || 'NOT_SYNCED',
      });
    }

    // 3. Fetch blockchain record
    const { data: blockchainRecord, error: recordError } = await supabase
      .from('blockchain_records')
      .select('*')
      .eq('batchId', batchId)
      .eq('transactionHash', batch.blockchainTxHash)
      .single();

    if (recordError || !blockchainRecord) {
      return NextResponse.json({
        verified: false,
        message: 'Blockchain record not found',
        error: 'Record missing from database',
      }, { status: 404 });
    }

    // 4. Fetch current batch data (same as sync endpoint)
    const { data: stages } = await supabase
      .from('stages')
      .select('*')
      .eq('batchId', batchId)
      .order('order', { ascending: true });

    const { data: verifications } = await supabase
      .from('image_verifications')
      .select('*')
      .eq('batchId', batchId);

    // 5. Build current batch data structure
    const stageData: StageData[] = (stages || []).map(stage => {
      const imageUrls = stage.imageUrls || [];
      const imageHashes = imageUrls.map((url: string) => 
        blockchainService.hashImage(url)
      );

      const stageVerifications = verifications?.filter(v => v.stageId === stage.id) || [];
      const hasFlags = stageVerifications.some(v => v.verificationStatus === 'FAKE');
      const allVerified = imageUrls.length > 0 && 
        stageVerifications.length === imageUrls.length &&
        stageVerifications.every(v => v.verificationStatus === 'REAL');

      return {
        stageId: stage.id,
        name: stage.name,
        completedAt: stage.completedAt || new Date().toISOString(),
        imageUrls,
        imageHashes,
        verificationStatus: hasFlags ? 'FLAGGED' : (allVerified ? 'VERIFIED' : 'PENDING'),
      };
    });

    const currentBatchData: BatchBlockchainData = {
      batchId: batch.id,
      batchCode: batch.batchCode,
      farmerId: batch.farmerId,
      farmerName: batch.farmerName,
      cropType: batch.cropType,
      quantity: batch.quantity,
      location: batch.location,
      harvestDate: batch.harvestDate,
      stages: stageData,
      timestamp: batch.blockchainSyncedAt || new Date().toISOString(),
    };

    // 6. Verify against blockchain record
    const verificationResult = await blockchainService.verifyOnBlockchain(
      currentBatchData,
      {
        dataHash: blockchainRecord.dataHash,
        merkleRoot: blockchainRecord.merkleRoot,
        transactionHash: blockchainRecord.transactionHash,
      }
    );

    // 7. Log verification attempt
    await supabase
      .from('blockchain_verification_logs')
      .insert({
        batchId,
        transactionHash: blockchainRecord.transactionHash,
        verifierAddress: 'system',
        verifierRole: 'AUTOMATED',
        verificationType: 'AUTHENTICITY_CHECK',
        result: verificationResult.verified ? 'PASSED' : 'FAILED',
        details: JSON.stringify(verificationResult),
      });

    return NextResponse.json({
      verified: verificationResult.verified,
      isValid: verificationResult.isValid,
      message: verificationResult.verified 
        ? 'Batch data verified successfully - integrity intact'
        : 'Verification failed - data has been modified',
      blockchain: {
        transactionHash: blockchainRecord.transactionHash,
        blockNumber: blockchainRecord.blockNumber,
        network: blockchainRecord.blockchainNetwork,
        syncedAt: blockchainRecord.syncedAt,
        explorerUrl: blockchainService.getExplorerUrl(blockchainRecord.transactionHash),
      },
      hashes: {
        current: verificationResult.dataHash,
        onChain: verificationResult.onChainHash,
        match: verificationResult.dataHash === verificationResult.onChainHash,
      },
      verification: {
        date: verificationResult.verificationDate,
        mismatchDetails: verificationResult.mismatchDetails,
      },
    });

  } catch (error) {
    console.error('Error verifying on blockchain:', error);
    return NextResponse.json(
      { error: 'Failed to verify on blockchain', details: String(error) },
      { status: 500 }
    );
  }
}
