import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blockchainService } from '@/lib/blockchain/blockchain-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/blockchain/status?batchId=xxx
 * Get blockchain sync status and history for a batch
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

    // 1. Fetch batch
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

    // 2. Fetch all blockchain records for this batch
    const { data: records, error: recordsError } = await supabase
      .from('blockchain_records')
      .select('*')
      .eq('batchId', batchId)
      .order('createdAt', { ascending: false });

    // 3. Fetch verification logs
    const { data: verificationLogs } = await supabase
      .from('blockchain_verification_logs')
      .select('*')
      .eq('batchId', batchId)
      .order('createdAt', { ascending: false })
      .limit(10);

    // 4. Calculate readiness if not synced
    let readinessCheck = null;
    if (batch.blockchainStatus !== 'SYNCED') {
      const { data: stages } = await supabase
        .from('stages')
        .select('*')
        .eq('batchId', batchId);

      const { data: verifications } = await supabase
        .from('image_verifications')
        .select('*')
        .eq('batchId', batchId);

      const stageData = (stages || []).map((stage: any) => {
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

      readinessCheck = blockchainService.isReadyForBlockchain({
        batchId: batch.id,
        batchCode: batch.batchCode,
        farmerId: batch.farmerId,
        farmerName: batch.farmerName,
        cropType: batch.cropType,
        quantity: batch.quantity,
        location: batch.location,
        harvestDate: batch.harvestDate,
        stages: stageData,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Build response
    return NextResponse.json({
      batch: {
        id: batch.id,
        code: batch.batchCode,
        status: batch.status,
      },
      blockchain: {
        status: batch.blockchainStatus || 'NOT_SYNCED',
        synced: batch.blockchainStatus === 'SYNCED',
        hash: batch.blockchainHash,
        txHash: batch.blockchainTxHash,
        network: batch.blockchainNetwork,
        syncedAt: batch.blockchainSyncedAt,
        verified: batch.blockchainVerified || false,
        explorerUrl: batch.blockchainTxHash 
          ? blockchainService.getExplorerUrl(batch.blockchainTxHash)
          : null,
      },
      readiness: readinessCheck,
      records: records?.map(record => ({
        id: record.id,
        transactionHash: record.transactionHash,
        blockNumber: record.blockNumber,
        network: record.blockchainNetwork,
        dataHash: record.dataHash,
        merkleRoot: record.merkleRoot,
        recordType: record.recordType,
        status: record.status,
        gasUsed: record.gasUsed,
        syncedAt: record.syncedAt,
        explorerUrl: blockchainService.getExplorerUrl(record.transactionHash),
      })) || [],
      verificationHistory: verificationLogs?.map(log => ({
        id: log.id,
        type: log.verificationType,
        result: log.result,
        verifierRole: log.verifierRole,
        createdAt: log.createdAt,
      })) || [],
      stats: {
        totalRecords: records?.length || 0,
        totalVerifications: verificationLogs?.length || 0,
        lastVerified: verificationLogs?.[0]?.createdAt || null,
      },
    });

  } catch (error) {
    console.error('Error fetching blockchain status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blockchain status', details: String(error) },
      { status: 500 }
    );
  }
}
