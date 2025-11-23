# 🔗 GrainTrust Blockchain Integration

## 📋 Overview

The blockchain integration provides **immutable** and **transparent** tracking of agricultural batches from farm to consumer. This implementation uses cryptographic hashing, Merkle trees, and simulated blockchain transactions to ensure data integrity.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GRAINTRUST BLOCKCHAIN                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐      ┌───────────────┐                   │
│  │ Batch Data    │──────│  Hash (SHA256)│                   │
│  │ + Stages      │      │  + Merkle Root│                   │
│  │ + Images      │      └───────┬───────┘                   │
│  └───────────────┘              │                           │
│                                  ▼                           │
│                      ┌──────────────────────┐               │
│                      │ Blockchain Transaction│               │
│                      │  - TX Hash           │               │
│                      │  - Block Number       │               │
│                      │  - Timestamp          │               │
│                      └──────────┬───────────┘               │
│                                  │                           │
│                     ┌────────────▼───────────┐              │
│                     │  Verification System   │              │
│                     │  - Data Integrity      │              │
│                     │  - Tampering Detection │              │
│                     └────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Components Created

### 1. **Database Schema** (`prisma/schema-blockchain-extension.prisma`)
- `Batch` model with blockchain fields
- `BlockchainRecord` - transaction records
- `BlockchainVerificationLog` - audit trail
- Enums for status tracking

### 2. **Blockchain Service** (`src/lib/blockchain/blockchain-service.ts`)
- SHA-256 hashing
- Merkle tree construction
- Transaction simulation
- Data verification
- Certificate generation

### 3. **API Endpoints**
- `POST /api/blockchain/sync` - Sync batch to blockchain
- `GET /api/blockchain/verify` - Verify data integrity
- `GET /api/blockchain/status` - Get blockchain status

---

## 🚀 Setup Instructions

### Step 1: Update Prisma Schema

Add the blockchain extensions to your `prisma/schema.prisma`:

```bash
# Copy content from prisma/schema-blockchain-extension.prisma
# and merge it into your existing schema.prisma
```

### Step 2: Run Database Migrations

```bash
cd blockchain/graintrust-2.0

# Generate migration
npx prisma migrate dev --name add_blockchain_support

# Push to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Step 3: Update Supabase Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Add blockchain fields to batches table
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS "blockchainHash" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "blockchainTxHash" TEXT,
ADD COLUMN IF NOT EXISTS "blockchainSyncedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "blockchainStatus" TEXT DEFAULT 'NOT_SYNCED',
ADD COLUMN IF NOT EXISTS "blockchainNetwork" TEXT,
ADD COLUMN IF NOT EXISTS "blockchainVerified" BOOLEAN DEFAULT FALSE;

-- Create blockchain_records table
CREATE TABLE IF NOT EXISTS blockchain_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchId" UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  "transactionHash" TEXT UNIQUE NOT NULL,
  "blockNumber" INTEGER,
  "blockchainNetwork" TEXT NOT NULL,
  "contractAddress" TEXT,
  "dataHash" TEXT NOT NULL,
  "previousHash" TEXT,
  "merkleRoot" TEXT,
  "recordType" TEXT DEFAULT 'BATCH_CREATED',
  "gasUsed" TEXT,
  "gasPrice" TEXT,
  status TEXT DEFAULT 'PENDING',
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMPTZ,
  "verificationProof" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "syncedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_records_batch ON blockchain_records("batchId");
CREATE INDEX IF NOT EXISTS idx_blockchain_records_tx ON blockchain_records("transactionHash");

-- Create blockchain_verification_logs table
CREATE TABLE IF NOT EXISTS blockchain_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchId" UUID NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "verifierAddress" TEXT NOT NULL,
  "verifierRole" TEXT NOT NULL,
  "verificationType" TEXT NOT NULL,
  result TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_batch ON blockchain_verification_logs("batchId");
CREATE INDEX IF NOT EXISTS idx_verification_logs_tx ON blockchain_verification_logs("transactionHash");

-- Add imageHashes column to stages
ALTER TABLE stages
ADD COLUMN IF NOT EXISTS "imageHashes" TEXT[] DEFAULT ARRAY[]::TEXT[];
```

### Step 4: Environment Variables (Optional)

Add to `.env` file:

```env
# Blockchain Configuration (optional)
BLOCKCHAIN_NETWORK=grain-trust-testnet
BLOCKCHAIN_EXPLORER_URL=https://explorer.graintrust.io
```

---

## 📡 API Usage

### 1. Sync Batch to Blockchain

**Endpoint**: `POST /api/blockchain/sync`

**Request**:
```json
{
  "batchId": "uuid-here",
  "userId": "user-uuid"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Batch successfully synced to blockchain",
  "transaction": {
    "hash": "0xabcd1234...",
    "blockNumber": 1234567,
    "network": "grain-trust-testnet",
    "explorerUrl": "https://explorer.graintrust.io/tx/0xabcd1234...",
    "dataHash": "a1b2c3d4...",
    "merkleRoot": "e5f6g7h8...",
    "gasUsed": "45000"
  },
  "certificate": "{...}", 
  "qrData": "{...}"
}
```

**Response** (Not Ready):
```json
{
  "success": false,
  "message": "Batch not ready for blockchain sync",
  "reasons": [
    "2 stage(s) not verified",
    "1 stage(s) flagged for issues"
  ]
}
```

### 2. Verify Batch on Blockchain

**Endpoint**: `GET /api/blockchain/verify?batchId=xxx`

**Response**:
```json
{
  "verified": true,
  "isValid": true,
  "message": "Batch data verified successfully - integrity intact",
  "blockchain": {
    "transactionHash": "0xabcd1234...",
    "blockNumber": 1234567,
    "network": "grain-trust-testnet",
    "syncedAt": "2025-11-01T15:30:00Z",
    "explorerUrl": "https://explorer.graintrust.io/tx/0xabcd1234..."
  },
  "hashes": {
    "current": "a1b2c3d4...",
    "onChain": "a1b2c3d4...",
    "match": true
  },
  "verification": {
    "date": "2025-11-01T15:45:00Z",
    "mismatchDetails": null
  }
}
```

### 3. Get Blockchain Status

**Endpoint**: `GET /api/blockchain/status?batchId=xxx`

**Response**:
```json
{
  "batch": {
    "id": "uuid",
    "code": "FB001",
    "status": "BLOCKCHAIN_SYNCED"
  },
  "blockchain": {
    "status": "SYNCED",
    "synced": true,
    "hash": "a1b2c3d4...",
    "txHash": "0xabcd1234...",
    "network": "grain-trust-testnet",
    "syncedAt": "2025-11-01T15:30:00Z",
    "verified": true,
    "explorerUrl": "https://explorer.graintrust.io/tx/0xabcd1234..."
  },
  "readiness": null,
  "records": [...],
  "verificationHistory": [...],
  "stats": {
    "totalRecords": 1,
    "totalVerifications": 3,
    "lastVerified": "2025-11-01T15:45:00Z"
  }
}
```

---

## 🔐 Security Features

### 1. **Cryptographic Hashing (SHA-256)**
- All batch data hashed deterministically
- Sorted keys for consistent hashing
- Includes all stages and verification statuses

### 2. **Merkle Tree**
- Efficient verification of stage data
- Tamper-evident structure
- Bottom-up tree construction

### 3. **Data Integrity Checks**
- Current data vs blockchain record comparison
- Automatic mismatch detection
- Detailed audit trail

### 4. **Immutability**
- Once synced, data changes are detectable
- Blockchain hash stored permanently
- Verification fails if data modified

---

## 🧪 Testing Guide

### Test 1: Sync Ready Batch

```bash
# 1. Ensure all stages have images
# 2. Verify all images are marked as REAL
# 3. Call sync endpoint

curl -X POST http://localhost:3005/api/blockchain/sync \
  -H "Content-Type: application/json" \
  -d '{"batchId": "YOUR_BATCH_ID"}'
```

**Expected**: Success response with transaction hash

### Test 2: Sync Not Ready Batch

```bash
# 1. Have pending or flagged images
# 2. Call sync endpoint

curl -X POST http://localhost:3005/api/blockchain/sync \
  -H "Content-Type: application/json" \
  -d '{"batchId": "YOUR_BATCH_ID"}'
```

**Expected**: Error response with reasons

### Test 3: Verify Synced Batch

```bash
curl http://localhost:3005/api/blockchain/verify?batchId=YOUR_BATCH_ID
```

**Expected**: Verified=true, hashes match

### Test 4: Check Status

```bash
curl http://localhost:3005/api/blockchain/status?batchId=YOUR_BATCH_ID
```

**Expected**: Complete status with readiness check

---

## 📊 Blockchain Readiness Criteria

A batch is ready for blockchain sync when:

✅ **All stages completed** - All 7 farming stages exist  
✅ **All stages have images** - Each stage has uploaded photos  
✅ **All images verified** - Admin marked all as REAL  
❌ **No flagged images** - No images marked as FAKE  

---

## 🎨 UI Integration (Next Steps)

### Components to Create:

1. **Blockchain Status Badge**
   - Shows NOT_SYNCED / SYNCING / SYNCED / VERIFIED
   - Color-coded indicators

2. **Sync Button**
   - Checks readiness before sync
   - Shows progress during sync
   - Displays transaction details

3. **Blockchain Certificate Viewer**
   - Shows transaction hash
   - Links to explorer
   - Displays verification status
   - QR code for mobile verification

4. **Transaction History**
   - Lists all blockchain records
   - Shows verification logs
   - Timeline view

---

## 🔄 Data Flow

```
1. Farmer completes all stages
      ↓
2. Admin verifies all images (marks as REAL)
      ↓
3. Batch becomes "Ready for Blockchain"
      ↓
4. Farmer/Admin clicks "Sync to Blockchain"
      ↓
5. System generates:
   - Data hash (SHA-256)
   - Merkle root (from all stages)
   - Transaction hash (simulated)
      ↓
6. Blockchain record saved to database
      ↓
7. Batch status updated to "BLOCKCHAIN_SYNCED"
      ↓
8. Certificate generated (JSON proof)
      ↓
9. Anyone can verify integrity using verify endpoint
```

---

## 🚀 Production Deployment

### For Real Blockchain (Future):

1. **Choose Network**:
   - Ethereum Mainnet (expensive)
   - Polygon (affordable)
   - Binance Smart Chain (fast)
   - Private consortium chain

2. **Install Real Dependencies**:
   ```bash
   npm install ethers@6
   ```

3. **Update Service**:
   - Replace simulated transaction with real Web3 calls
   - Use actual wallet for signing
   - Pay real gas fees

4. **Smart Contract** (Optional):
   - Deploy GrainTrust contract
   - Store batch hashes on-chain
   - Emit verification events

---

## 📈 Benefits

### For Farmers:
- ✅ Proof of authentic farming practices
- ✅ Transparent record-keeping
- ✅ Trust-building with buyers
- ✅ Premium pricing potential

### For Consumers:
- ✅ Verify product authenticity
- ✅ See complete farm-to-table journey
- ✅ Check image verification status
- ✅ Trust in product quality

### For Platform:
- ✅ Tamper-proof records
- ✅ Automated verification
- ✅ Regulatory compliance
- ✅ Competitive advantage

---

## 📞 Support & Troubleshooting

### Common Issues:

**"Batch not ready for blockchain sync"**
- Check: All images verified?
- Check: Any flagged images?
- Solution: Verify/re-upload flagged images

**"Blockchain record not found"**
- Check: Was batch synced?
- Check: Database migration complete?
- Solution: Run migrations, then sync again

**"Verification failed - data modified"**
- This is expected behavior if data changed after sync
- Shows tampering detection working correctly
- Re-sync batch to update blockchain record

---

## 🎯 Current Status

✅ **Implemented**:
- Database schema extensions
- Blockchain service (hashing, Merkle trees)
- API endpoints (sync, verify, status)
- Certificate generation
- Verification logging

⏳ **Pending** (See UI Components section):
- Frontend UI components
- Sync button in farmer dashboard
- Blockchain status indicators
- Certificate viewer
- Transaction history display

---

## 📝 Next Steps

1. **Add UI Components** (see BLOCKCHAIN_UI_GUIDE.md - to be created)
2. **Test with Real Data** (complete testing guide above)
3. **Add to Farmer Dashboard** (integrate sync button)
4. **Consumer Verification Page** (public verification interface)
5. **Mobile QR Scanning** (verify batches via QR code)

---

**Built with**: Next.js 15, Supabase, TypeScript, Crypto (SHA-256)  
**Network**: Simulated testnet (ready for real blockchain)  
**Version**: 1.0.0  
**Last Updated**: November 1, 2025
