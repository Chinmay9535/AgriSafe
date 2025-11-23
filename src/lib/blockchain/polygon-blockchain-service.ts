/**
 * 🔗 GrainTrust Polygon Blockchain Service
 * 
 * Real blockchain integration using Polygon Mumbai testnet
 * Extends the base blockchain service with actual Web3 functionality
 */

import { ethers } from 'ethers';
import { blockchainService, BatchBlockchainData, BlockchainTransaction } from './blockchain-service';

// Polygon Amoy Testnet Configuration
const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology';
const POLYGON_AMOY_CHAIN_ID = 80002;
const POLYGON_EXPLORER = 'https://amoy.polygonscan.com';

// Smart Contract ABI (Application Binary Interface)
const GRAINTRUST_ABI = [
  'function syncBatch(string batchId, string batchCode, bytes32 dataHash, bytes32 merkleRoot) public',
  'function verifyBatch(string batchId, bytes32 dataHash, bytes32 merkleRoot) public returns (bool)',
  'function getBatch(string batchId) public view returns (string, bytes32, bytes32, uint256, address)',
  'function batchExists(string batchId) public view returns (bool)',
  'event BatchSynced(string indexed batchId, string batchCode, bytes32 dataHash, bytes32 merkleRoot, uint256 timestamp, address indexed submittedBy)'
];

export interface PolygonConfig {
  useRealBlockchain: boolean;
  contractAddress?: string;
  privateKey?: string;
  rpcUrl?: string;
}

export class PolygonBlockchainService {
  private config: PolygonConfig;
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;

  constructor(config: PolygonConfig) {
    this.config = {
      rpcUrl: POLYGON_AMOY_RPC,
      ...config
    };

    if (this.config.useRealBlockchain) {
      this.initializePolygon();
    }
  }

  /**
   * Initialize Polygon connection
   */
  private initializePolygon() {
    try {
      // Create provider
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

      // Create signer if private key provided
      if (this.config.privateKey) {
        this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
      }

      // Create contract instance if address provided
      if (this.config.contractAddress && this.signer) {
        this.contract = new ethers.Contract(
          this.config.contractAddress,
          GRAINTRUST_ABI,
          this.signer
        );
      }

      console.log('✅ Polygon Amoy testnet connected');
    } catch (error) {
      console.error('❌ Failed to initialize Polygon:', error);
      throw new Error('Polygon initialization failed');
    }
  }

  /**
   * Convert hex string to bytes32 format for Solidity
   */
  private toBytes32(hexString: string): string {
    // Remove '0x' if present
    const cleaned = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    
    // Pad to 64 characters (32 bytes)
    const padded = cleaned.padStart(64, '0');
    
    return '0x' + padded;
  }

  /**
   * Sync batch to Polygon blockchain (REAL TRANSACTION)
   */
  async syncToPolygon(batchData: BatchBlockchainData): Promise<BlockchainTransaction> {
    if (!this.config.useRealBlockchain || !this.contract) {
      // Fallback to simulated blockchain
      return blockchainService.syncToBlockchain(batchData);
    }

    try {
      // Generate hashes using base service
      const dataHash = blockchainService.hashBatchData(batchData);
      const merkleRoot = blockchainService.createStagesMerkleRoot(batchData.stages);

      // Convert to bytes32 format
      const dataHashBytes32 = this.toBytes32(dataHash);
      const merkleRootBytes32 = this.toBytes32(merkleRoot);

      console.log('📤 Sending transaction to Polygon Amoy...');
      console.log('Batch ID:', batchData.batchId);
      console.log('Batch Code:', batchData.batchCode);
      console.log('Data Hash:', dataHashBytes32);
      console.log('Merkle Root:', merkleRootBytes32);

      // Call smart contract
      const tx = await this.contract!.syncBatch(
        batchData.batchId,
        batchData.batchCode,
        dataHashBytes32,
        merkleRootBytes32
      );

      console.log('⏳ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('Block Number:', receipt!.blockNumber);
      console.log('Gas Used:', receipt!.gasUsed.toString());

      // Create transaction record
      const transaction: BlockchainTransaction = {
        transactionHash: receipt!.hash,
        blockNumber: receipt!.blockNumber,
        dataHash,
        previousHash: null,
        merkleRoot,
        timestamp: new Date().toISOString(),
        network: 'polygon-amoy',
        status: 'CONFIRMED',
        gasUsed: receipt!.gasUsed.toString(),
        explorerUrl: `${POLYGON_EXPLORER}/tx/${receipt!.hash}`
      };

      return transaction;

    } catch (error: any) {
      console.error('❌ Polygon transaction failed:', error);
      
      // Check for specific errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient MATIC for gas fees. Get testnet MATIC from faucet.');
      }
      
      if (error.message?.includes('already synced')) {
        throw new Error('Batch already synced to blockchain');
      }

      throw new Error(`Polygon sync failed: ${error.message}`);
    }
  }

  /**
   * Verify batch on Polygon blockchain
   */
  async verifyOnPolygon(
    batchId: string,
    currentDataHash: string,
    currentMerkleRoot: string
  ): Promise<{
    verified: boolean;
    onChainData: any;
    explorerUrl: string;
  }> {
    if (!this.config.useRealBlockchain || !this.contract) {
      throw new Error('Real blockchain not enabled');
    }

    try {
      // Check if batch exists
      const exists = await this.contract!.batchExists(batchId);
      
      if (!exists) {
        return {
          verified: false,
          onChainData: null,
          explorerUrl: `${POLYGON_EXPLORER}/address/${this.config.contractAddress}`
        };
      }

      // Get batch data from blockchain
      const [batchCode, dataHash, merkleRoot, timestamp, submittedBy] = 
        await this.contract!.getBatch(batchId);

      // Remove '0x' and leading zeros for comparison
      const cleanDataHash = dataHash.replace(/^0x0+/, '');
      const cleanMerkleRoot = merkleRoot.replace(/^0x0+/, '');
      const cleanCurrentDataHash = currentDataHash.replace(/^0x0+/, '');
      const cleanCurrentMerkleRoot = currentMerkleRoot.replace(/^0x0+/, '');

      // Compare hashes
      const dataHashMatch = cleanDataHash === cleanCurrentDataHash;
      const merkleRootMatch = cleanMerkleRoot === cleanCurrentMerkleRoot;

      return {
        verified: dataHashMatch && merkleRootMatch,
        onChainData: {
          batchCode,
          dataHash,
          merkleRoot,
          timestamp: timestamp.toString(),
          submittedBy,
          blockchainNetwork: 'polygon-mumbai'
        },
        explorerUrl: `${POLYGON_EXPLORER}/address/${this.config.contractAddress}`
      };

    } catch (error: any) {
      console.error('❌ Polygon verification failed:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Get account balance (testnet MATIC)
   */
  async getBalance(): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error('Wallet not initialized');
    }

    const balance = await this.provider.getBalance(this.signer.address);
    return ethers.formatEther(balance);
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    if (!this.signer) {
      throw new Error('Wallet not initialized');
    }
    return this.signer.address;
  }

  /**
   * Check if using real blockchain
   */
  isUsingRealBlockchain(): boolean {
    return this.config.useRealBlockchain && this.contract !== null;
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    network: string;
    contractAddress: string | undefined;
    walletAddress: string | undefined;
    balance: string | undefined;
  }> {
    if (!this.provider) {
      return {
        chainId: 0,
        network: 'simulated',
        contractAddress: undefined,
        walletAddress: undefined,
        balance: undefined
      };
    }

    const network = await this.provider.getNetwork();
    const balance = this.signer ? await this.getBalance() : undefined;

    return {
      chainId: Number(network.chainId),
      network: network.name,
      contractAddress: this.config.contractAddress,
      walletAddress: this.signer?.address,
      balance
    };
  }
}

// Export factory function
export function createPolygonService(config?: Partial<PolygonConfig>): PolygonBlockchainService {
  const fullConfig: PolygonConfig = {
    useRealBlockchain: process.env.USE_REAL_BLOCKCHAIN === 'true',
    contractAddress: process.env.POLYGON_CONTRACT_ADDRESS,
    privateKey: process.env.POLYGON_PRIVATE_KEY,
    rpcUrl: process.env.POLYGON_RPC_URL || POLYGON_MUMBAI_RPC,
    ...config
  };

  return new PolygonBlockchainService(fullConfig);
}
