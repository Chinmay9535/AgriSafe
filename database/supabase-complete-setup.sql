-- ============================================================================
-- 🔗 GRAINTRUST 2.0 - COMPLETE SUPABASE DATABASE SETUP
-- ============================================================================
-- This script creates ALL tables needed for GrainTrust including blockchain
-- Run this in your Supabase SQL Editor after creating a new project
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CONSUMER',
  "isVerified" BOOLEAN DEFAULT FALSE,
  "onboardingComplete" BOOLEAN DEFAULT FALSE,
  avatar TEXT,
  "profilePicture" TEXT,
  phone TEXT,
  bio TEXT,
  organization TEXT,
  location TEXT,
  state TEXT,
  country TEXT,
  specialization TEXT,
  experience TEXT,
  "farmSize" TEXT,
  "organizationType" TEXT,
  "lastLogin" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- 2. BATCHES TABLE (with Blockchain fields)
-- ============================================================================
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchCode" TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "cropType" TEXT NOT NULL,
  quantity FLOAT NOT NULL,
  "farmerId" UUID NOT NULL,
  "farmerName" TEXT NOT NULL,
  location TEXT NOT NULL,
  "harvestDate" TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'PENDING',
  
  -- Blockchain fields
  "blockchainHash" TEXT UNIQUE,
  "blockchainTxHash" TEXT,
  "blockchainSyncedAt" TIMESTAMPTZ,
  "blockchainStatus" TEXT DEFAULT 'NOT_SYNCED',
  "blockchainNetwork" TEXT,
  "blockchainVerified" BOOLEAN DEFAULT FALSE,
  
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_batches_farmer FOREIGN KEY ("farmerId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batches_farmer ON batches("farmerId");
CREATE INDEX IF NOT EXISTS idx_batches_code ON batches("batchCode");
CREATE INDEX IF NOT EXISTS idx_batches_blockchain_status ON batches("blockchainStatus");
CREATE INDEX IF NOT EXISTS idx_batches_blockchain_hash ON batches("blockchainHash");

-- ============================================================================
-- 3. STAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchId" UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  "completedAt" TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  
  -- Image tracking
  "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "imageHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Verification
  "verifiedBy" UUID,
  "verifiedAt" TIMESTAMPTZ,
  
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_stages_batch FOREIGN KEY ("batchId") REFERENCES batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_stages_verifier FOREIGN KEY ("verifiedBy") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stages_batch ON stages("batchId");
CREATE INDEX IF NOT EXISTS idx_stages_order ON stages("order");

-- ============================================================================
-- 4. IMAGE VERIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS image_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchId" UUID NOT NULL,
  "stageId" UUID NOT NULL,
  "farmerId" UUID NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "verificationStatus" TEXT DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "verifiedBy" UUID,
  "verifiedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_image_verifications_batch FOREIGN KEY ("batchId") REFERENCES batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_image_verifications_stage FOREIGN KEY ("stageId") REFERENCES stages(id) ON DELETE CASCADE,
  CONSTRAINT fk_image_verifications_farmer FOREIGN KEY ("farmerId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_image_verifications_verifier FOREIGN KEY ("verifiedBy") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_image_verifications_batch ON image_verifications("batchId");
CREATE INDEX IF NOT EXISTS idx_image_verifications_stage ON image_verifications("stageId");
CREATE INDEX IF NOT EXISTS idx_image_verifications_farmer ON image_verifications("farmerId");
CREATE INDEX IF NOT EXISTS idx_image_verifications_status ON image_verifications("verificationStatus");

-- ============================================================================
-- 5. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_notifications_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt");

-- ============================================================================
-- 6. BLOCKCHAIN RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blockchain_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchId" UUID NOT NULL,
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
  "syncedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_blockchain_records_batch FOREIGN KEY ("batchId") REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blockchain_records_batch ON blockchain_records("batchId");
CREATE INDEX IF NOT EXISTS idx_blockchain_records_tx ON blockchain_records("transactionHash");
CREATE INDEX IF NOT EXISTS idx_blockchain_records_hash ON blockchain_records("dataHash");
CREATE INDEX IF NOT EXISTS idx_blockchain_records_status ON blockchain_records(status);

-- ============================================================================
-- 7. BLOCKCHAIN VERIFICATION LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blockchain_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchId" UUID NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "verifierAddress" TEXT NOT NULL,
  "verifierRole" TEXT NOT NULL,
  "verificationType" TEXT NOT NULL,
  result TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_verification_logs_batch FOREIGN KEY ("batchId") REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_batch ON blockchain_verification_logs("batchId");
CREATE INDEX IF NOT EXISTS idx_verification_logs_tx ON blockchain_verification_logs("transactionHash");
CREATE INDEX IF NOT EXISTS idx_verification_logs_result ON blockchain_verification_logs(result);

-- ============================================================================
-- 8. APPEALS TABLE (Optional - for image verification appeals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "imageVerificationId" UUID NOT NULL,
  "farmerId" UUID NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMPTZ,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_appeals_verification FOREIGN KEY ("imageVerificationId") REFERENCES image_verifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_appeals_farmer FOREIGN KEY ("farmerId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appeals_reviewer FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_appeals_verification ON appeals("imageVerificationId");
CREATE INDEX IF NOT EXISTS idx_appeals_farmer ON appeals("farmerId");
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS POLICIES (Basic - Adjust as needed)
-- ============================================================================

-- Users: Can read own profile, admins can read all
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Batches: Farmers can read own, consumers can read all, admins can do all
CREATE POLICY "Farmers can read own batches" ON batches
  FOR SELECT USING ("farmerId" = auth.uid());

CREATE POLICY "Consumers can read all batches" ON batches
  FOR SELECT USING (true);

CREATE POLICY "Farmers can create own batches" ON batches
  FOR INSERT WITH CHECK ("farmerId" = auth.uid());

CREATE POLICY "Admins can update batches" ON batches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Stages: Anyone can read, farmers can insert/update own
CREATE POLICY "Anyone can read stages" ON stages
  FOR SELECT USING (true);

CREATE POLICY "Farmers can manage own stages" ON stages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM batches WHERE id = stages."batchId" AND "farmerId" = auth.uid()
    )
  );

-- Image Verifications: Farmers and admins can read
CREATE POLICY "Farmers can read own verifications" ON image_verifications
  FOR SELECT USING ("farmerId" = auth.uid());

CREATE POLICY "Admins can manage verifications" ON image_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Notifications: Users can read own
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING ("userId" = auth.uid());

-- Blockchain records: Public read (for transparency)
CREATE POLICY "Anyone can read blockchain records" ON blockchain_records
  FOR SELECT USING (true);

-- Blockchain verification logs: Public read
CREATE POLICY "Anyone can read verification logs" ON blockchain_verification_logs
  FOR SELECT USING (true);

-- Appeals: Farmers can manage own
CREATE POLICY "Farmers can read own appeals" ON appeals
  FOR SELECT USING ("farmerId" = auth.uid());

CREATE POLICY "Farmers can create appeals" ON appeals
  FOR INSERT WITH CHECK ("farmerId" = auth.uid());

CREATE POLICY "Admins can manage appeals" ON appeals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- 11. STORAGE BUCKETS (for images)
-- ============================================================================

-- Create storage bucket for batch images
INSERT INTO storage.buckets (id, name, public)
VALUES ('batch-images', 'batch-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can read, authenticated users can upload
CREATE POLICY "Anyone can read batch images"
ON storage.objects FOR SELECT
USING (bucket_id = 'batch-images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'batch-images' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- 12. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_verifications_updated_at BEFORE UPDATE ON image_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blockchain_records_updated_at BEFORE UPDATE ON blockchain_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appeals_updated_at BEFORE UPDATE ON appeals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. SEED DATA (Optional - Test Users and Batches)
-- ============================================================================

-- Insert test admin user
INSERT INTO users (id, email, name, password, role, "onboardingComplete", "isVerified")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@graintrust.com',
  'Admin User',
  '$2a$10$7Q3ZY6Z8Z8Z8Z8Z8Z8Z8ZeZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z',  -- Change this!
  'ADMIN',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert test farmer user
INSERT INTO users (id, email, name, password, role, "onboardingComplete", "isVerified", location, "farmSize")
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'farmer@graintrust.com',
  'Test Farmer',
  '$2a$10$7Q3ZY6Z8Z8Z8Z8Z8Z8Z8ZeZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z',  -- Change this!
  'FARMER',
  true,
  true,
  'Punjab, India',
  '10 acres'
) ON CONFLICT (id) DO NOTHING;

-- Insert test consumer user
INSERT INTO users (id, email, name, password, role, "onboardingComplete", "isVerified")
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'consumer@graintrust.com',
  'Test Consumer',
  '$2a$10$7Q3ZY6Z8Z8Z8Z8Z8Z8Z8ZeZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z',  -- Change this!
  'CONSUMER',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show table counts
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'batches', COUNT(*) FROM batches
UNION ALL
SELECT 'stages', COUNT(*) FROM stages
UNION ALL
SELECT 'image_verifications', COUNT(*) FROM image_verifications
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'blockchain_records', COUNT(*) FROM blockchain_records
UNION ALL
SELECT 'blockchain_verification_logs', COUNT(*) FROM blockchain_verification_logs
UNION ALL
SELECT 'appeals', COUNT(*) FROM appeals;

-- ============================================================================
-- 🎉 GRAINTRUST DATABASE SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Update your .env file with new Supabase credentials
-- 2. Test the connection
-- 3. Start your Next.js app: npm run dev
-- ============================================================================
