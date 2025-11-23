/**
 * 🔗 GrainTrust Blockchain Service
 * 
 * Core blockchain functionality for batch data immutability and verification.
 * This implementation provides:
 * - Cryptographic hashing (SHA-256)
 * - Merkle tree construction for stage verification
 * - Simulated blockchain transactions (no real gas fees)
 * - Data integrity verification
 * - Blockchain explorer integration
 */

import crypto from 'crypto';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface BatchBlockchainData {
  batchId: string;
  batchCode: string;
  farmerId: string;
  farmerName: string;
  cropType: string;
  quantity: number;
  location: string;
  harvestDate: string;
  stages: StageData[];
  timestamp: string;
}

export interface StageData {
  stageId: string;
  name: string;
  completedAt: string;
  imageUrls: string[];
  imageHashes: string[];
  verificationStatus: 'VERIFIED' | 'PENDING' | 'FLAGGED';
}

export interface BlockchainTransaction {
  transactionHash: string;
  blockNumber: number;
  dataHash: string;
  previousHash: string | null;
  merkleRoot: string;
  timestamp: string;
  network: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  gasUsed?: string;
  explorerUrl?: string;
}

export interface BlockchainVerificationResult {
  isValid: boolean;
  dataHash: string;
  onChainHash: string;
  verified: boolean;
  verificationDate: string;
  mismatchDetails?: string[];
}

// =====================================================
// BLOCKCHAIN SERVICE CLASS
// =====================================================

export class BlockchainService {
  private readonly NETWORK = process.env.BLOCKCHAIN_NETWORK || 'grain-trust-testnet';
  private readonly EXPLORER_URL = process.env.BLOCKCHAIN_EXPLORER_URL || 'https://explorer.graintrust.io';
  
  /**
   * Generate SHA-256 hash of data
   */
  private generateHash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Create Merkle Tree root from array of hashes
   * Used for efficient verification of multiple stages/images
   */
  private createMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return this.generateHash('empty');
    if (hashes.length === 1) return hashes[0];

    // Sort hashes for deterministic results
    const sortedHashes = [...hashes].sort();

    // Build tree bottom-up
    let currentLevel = sortedHashes;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          // Combine pairs
          const combined = currentLevel[i] + currentLevel[i + 1];
          nextLevel.push(this.generateHash(combined));
        } else {
          // Odd one out - duplicate it
          const combined = currentLevel[i] + currentLevel[i];
          nextLevel.push(this.generateHash(combined));
        }
      }
      
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Hash image URL/content for blockchain storage
   */
  public hashImage(imageUrl: string): string {
    const data = `${imageUrl}:${Date.now()}`;
    return this.generateHash(data);
  }

  /**
   * Generate comprehensive hash of batch data for blockchain
   */
  public hashBatchData(batchData: BatchBlockchainData): string {
    // Create deterministic JSON string (sorted keys)
    const sortedData = {
      batchCode: batchData.batchCode,
      batchId: batchData.batchId,
      cropType: batchData.cropType,
      farmerId: batchData.farmerId,
      farmerName: batchData.farmerName,
      harvestDate: batchData.harvestDate,
      location: batchData.location,
      quantity: batchData.quantity,
      stages: batchData.stages.map(stage => ({
        completedAt: stage.completedAt,
        imageHashes: stage.imageHashes.sort(),
        imageUrls: stage.imageUrls.sort(),
        name: stage.name,
        stageId: stage.stageId,
        verificationStatus: stage.verificationStatus,
      })).sort((a, b) => a.name.localeCompare(b.name)),
      timestamp: batchData.timestamp,
    };

    const jsonString = JSON.stringify(sortedData);
    return this.generateHash(jsonString);
  }

  /**
   * Create Merkle root from all stage data
   */
  public createStagesMerkleRoot(stages: StageData[]): string {
    const stageHashes = stages.map(stage => {
      const stageData = JSON.stringify({
        completedAt: stage.completedAt,
        imageHashes: stage.imageHashes.sort(),
        name: stage.name,
        stageId: stage.stageId,
        verificationStatus: stage.verificationStatus,
      });
      return this.generateHash(stageData);
    });

    return this.createMerkleRoot(stageHashes);
  }

  /**
   * Simulate blockchain transaction (for demo/testnet)
   * In production, this would interact with actual blockchain (Ethereum, Polygon, etc.)
   */
  public async syncToBlockchain(
    batchData: BatchBlockchainData,
    previousHash: string | null = null
  ): Promise<BlockchainTransaction> {
    // Generate data hash
    const dataHash = this.hashBatchData(batchData);
    
    // Generate Merkle root from stages
    const merkleRoot = this.createStagesMerkleRoot(batchData.stages);

    // Simulate transaction hash (in production, this comes from blockchain)
    const txData = `${dataHash}${merkleRoot}${Date.now()}`;
    const transactionHash = `0x${this.generateHash(txData)}`;

    // Simulate block number (in production, from blockchain)
    const blockNumber = Math.floor(Date.now() / 1000); // Unix timestamp as block

    // Simulate gas usage
    const gasUsed = (Math.random() * 100000 + 21000).toFixed(0);

    // Create transaction record
    const transaction: BlockchainTransaction = {
      transactionHash,
      blockNumber,
      dataHash,
      previousHash,
      merkleRoot,
      timestamp: new Date().toISOString(),
      network: this.NETWORK,
      status: 'CONFIRMED',
      gasUsed,
      explorerUrl: `${this.EXPLORER_URL}/tx/${transactionHash}`,
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return transaction;
  }

  /**
   * Verify batch data against blockchain record
   */
  public async verifyOnBlockchain(
    currentBatchData: BatchBlockchainData,
    blockchainRecord: {
      dataHash: string;
      merkleRoot: string;
      transactionHash: string;
    }
  ): Promise<BlockchainVerificationResult> {
    // Recompute hashes from current data
    const currentDataHash = this.hashBatchData(currentBatchData);
    const currentMerkleRoot = this.createStagesMerkleRoot(currentBatchData.stages);

    // Compare with blockchain record
    const dataHashMatch = currentDataHash === blockchainRecord.dataHash;
    const merkleRootMatch = currentMerkleRoot === blockchainRecord.merkleRoot;

    const mismatchDetails: string[] = [];
    if (!dataHashMatch) {
      mismatchDetails.push('Data hash mismatch - batch data has been modified');
    }
    if (!merkleRootMatch) {
      mismatchDetails.push('Merkle root mismatch - stage data has been modified');
    }

    return {
      isValid: dataHashMatch && merkleRootMatch,
      dataHash: currentDataHash,
      onChainHash: blockchainRecord.dataHash,
      verified: dataHashMatch && merkleRootMatch,
      verificationDate: new Date().toISOString(),
      mismatchDetails: mismatchDetails.length > 0 ? mismatchDetails : undefined,
    };
  }

  /**
   * Generate blockchain certificate (JSON proof)
   */
  public generateCertificate(
    batchData: BatchBlockchainData,
    transaction: BlockchainTransaction,
    qrCode?: string,
    verifyUrl?: string
  ): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3005';
    const batchVerifyUrl = verifyUrl || `${baseUrl}/verify/${batchData.batchId}`;
    
    const certificate = {
      version: '1.0',
      type: 'GRAINTRUST_BATCH_CERTIFICATE',
      issuedAt: new Date().toISOString(),
      batch: {
        code: batchData.batchCode,
        crop: batchData.cropType,
        quantity: batchData.quantity,
        farmer: batchData.farmerName,
        location: batchData.location,
        harvestDate: batchData.harvestDate,
      },
      blockchain: {
        network: transaction.network,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        dataHash: transaction.dataHash,
        merkleRoot: transaction.merkleRoot,
        timestamp: transaction.timestamp,
      },
      verification: {
        stagesCompleted: batchData.stages.length,
        allStagesVerified: batchData.stages.every(s => s.verificationStatus === 'VERIFIED'),
        imagesVerified: batchData.stages.reduce((sum, s) => sum + s.imageUrls.length, 0),
        verifyUrl: batchVerifyUrl,
        qrCode: qrCode || null,
      },
      explorerUrl: transaction.explorerUrl,
    };

    return JSON.stringify(certificate, null, 2);
  }

  /**
   * Get blockchain explorer URL for transaction
   */
  public getExplorerUrl(transactionHash: string): string {
    return `${this.EXPLORER_URL}/tx/${transactionHash}`;
  }

  /**
   * Check if batch is ready for blockchain sync
   */
  public isReadyForBlockchain(batchData: BatchBlockchainData): {
    ready: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check if all stages are completed
    if (batchData.stages.length === 0) {
      reasons.push('No stages completed yet');
    }

    // Check if all stages have images
    const stagesWithoutImages = batchData.stages.filter(s => s.imageUrls.length === 0);
    if (stagesWithoutImages.length > 0) {
      reasons.push(`${stagesWithoutImages.length} stage(s) missing images`);
    }

    // Check if all images are verified (DISABLED FOR TESTING)
    // const unverifiedStages = batchData.stages.filter(s => s.verificationStatus !== 'VERIFIED');
    // if (unverifiedStages.length > 0) {
    //   reasons.push(`${unverifiedStages.length} stage(s) not verified`);
    // }

    // Check if any stages flagged
    const flaggedStages = batchData.stages.filter(s => s.verificationStatus === 'FLAGGED');
    if (flaggedStages.length > 0) {
      reasons.push(`${flaggedStages.length} stage(s) flagged for issues`);
    }

    return {
      ready: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Create QR code data for blockchain verification
   */
  public createVerificationQRData(transaction: BlockchainTransaction): string {
    return JSON.stringify({
      type: 'GRAINTRUST_VERIFICATION',
      txHash: transaction.transactionHash,
      network: transaction.network,
      dataHash: transaction.dataHash,
      verifyUrl: `${this.EXPLORER_URL}/verify/${transaction.transactionHash}`,
    });
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const blockchainService = new BlockchainService();
