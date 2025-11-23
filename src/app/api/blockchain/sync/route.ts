import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blockchainService, BatchBlockchainData, StageData } from '@/lib/blockchain/blockchain-service';
import { PolygonBlockchainService } from '@/lib/blockchain/polygon-blockchain-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/blockchain/sync
 * Sync verified batch to blockchain
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Blockchain sync request received');
    
    const body = await request.json();
    const { batchId, userId } = body;

    console.log('🔍 Syncing batch:', batchId);

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch batch data from Supabase
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

    // 2. Check if already synced
    if (batch.blockchainStatus === 'SYNCED') {
      return NextResponse.json({
        success: false,
        message: 'Batch already synced to blockchain',
        blockchainTxHash: batch.blockchainTxHash,
        explorerUrl: blockchainService.getExplorerUrl(batch.blockchainTxHash),
      });
    }

    // 3. Fetch all stages for the batch
    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .eq('batchId', batchId)
      .order('order', { ascending: true });

    if (stagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch stages' },
        { status: 500 }
      );
    }

    // 4. Fetch verification status for images
    const { data: verifications } = await supabase
      .from('image_verifications')
      .select('*')
      .eq('batchId', batchId);

    // 5. Build blockchain data structure
    const stageData: StageData[] = (stages || []).map(stage => {
      const imageUrls = stage.imageUrls || [];
      const imageHashes = imageUrls.map((url: string) => 
        blockchainService.hashImage(url)
      );

      // Determine verification status
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

    const batchData: BatchBlockchainData = {
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
    };

    // 6. Check if ready for blockchain
    const readinessCheck = blockchainService.isReadyForBlockchain(batchData);
    if (!readinessCheck.ready) {
      return NextResponse.json({
        success: false,
        message: 'Batch not ready for blockchain sync',
        reasons: readinessCheck.reasons,
      }, { status: 400 });
    }

    // 7. Get previous blockchain record if exists
    const { data: previousRecord } = await supabase
      .from('blockchain_records')
      .select('dataHash')
      .eq('batchId', batchId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    // 8. Sync to blockchain (Polygon or Simulated)
    const useRealBlockchain = process.env.USE_REAL_BLOCKCHAIN === 'true';
    
    let transaction;
    if (useRealBlockchain) {
      console.log('🔗 Using REAL Polygon Amoy blockchain...');
      try {
        // Validate required environment variables
        if (!process.env.POLYGON_CONTRACT_ADDRESS) {
          throw new Error('POLYGON_CONTRACT_ADDRESS not set in environment variables');
        }
        if (!process.env.POLYGON_PRIVATE_KEY) {
          throw new Error('POLYGON_PRIVATE_KEY not set in environment variables');
        }
        
        const polygonService = new PolygonBlockchainService({
          useRealBlockchain: true,
          contractAddress: process.env.POLYGON_CONTRACT_ADDRESS,
          privateKey: process.env.POLYGON_PRIVATE_KEY,
          rpcUrl: process.env.POLYGON_RPC_URL,
        });
        transaction = await polygonService.syncToPolygon(batchData);
      } catch (polygonError) {
        console.error('❌ Polygon blockchain error:', polygonError);
        // Fallback to simulated blockchain
        console.log('⚠️ Falling back to simulated blockchain...');
        transaction = await blockchainService.syncToBlockchain(
          batchData,
          previousRecord?.dataHash || null
        );
      }
    } else {
      console.log('🔗 Using simulated blockchain...');
      transaction = await blockchainService.syncToBlockchain(
        batchData,
        previousRecord?.dataHash || null
      );
    }

    // 9. Save blockchain record to database
    const { error: recordError } = await supabase
      .from('blockchain_records')
      .insert({
        batchId,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        blockchainNetwork: transaction.network,
        dataHash: transaction.dataHash,
        previousHash: transaction.previousHash,
        merkleRoot: transaction.merkleRoot,
        recordType: 'BATCH_CREATED',
        gasUsed: transaction.gasUsed,
        status: transaction.status,
        syncedAt: transaction.timestamp,
      });

    if (recordError) {
      console.error('Failed to save blockchain record:', recordError);
    }

    // 10. Update batch with blockchain info
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        blockchainHash: transaction.dataHash,
        blockchainTxHash: transaction.transactionHash,
        blockchainSyncedAt: transaction.timestamp,
        blockchainStatus: 'SYNCED',
        blockchainNetwork: transaction.network,
        blockchainVerified: true,
        status: 'BLOCKCHAIN_SYNCED',
      })
      .eq('id', batchId);

    if (updateError) {
      console.error('Failed to update batch:', updateError);
    }

    // 11. Generate QR code for verification
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3005';
    const verifyUrl = `${baseUrl}/verify/${batchId}`;
    
    let qrCode = '';
    try {
      const QRCode = require('qrcode');
      qrCode = await QRCode.toDataURL(verifyUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (qrError) {
      console.error('Failed to generate QR code:', qrError);
    }

    // 12. Update batch with QR code
    if (qrCode) {
      await supabase
        .from('batches')
        .update({ qrCode, verifyUrl })
        .eq('id', batchId);
    }

    // 13. Generate certificate with QR code
    const certificate = blockchainService.generateCertificate(batchData, transaction, qrCode, verifyUrl);

    // 14. Create QR data for verification
    const qrData = blockchainService.createVerificationQRData(transaction);

    return NextResponse.json({
      success: true,
      message: 'Batch successfully synced to blockchain',
      transaction: {
        hash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        network: transaction.network,
        explorerUrl: transaction.explorerUrl,
        dataHash: transaction.dataHash,
        merkleRoot: transaction.merkleRoot,
        gasUsed: transaction.gasUsed,
      },
      certificate,
      qrData,
    });

  } catch (error) {
    console.error('Error syncing to blockchain:', error);
    return NextResponse.json(
      { error: 'Failed to sync to blockchain', details: String(error) },
      { status: 500 }
    );
  }
}
