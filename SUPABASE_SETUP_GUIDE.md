# 🚀 Complete Supabase Setup Guide for GrainTrust

## Step 1: Create New Supabase Project

1. **Go to** [https://supabase.com](https://supabase.com)
2. **Sign in** or create an account
3. **Click** "New Project"
4. **Fill in** project details:
   - **Project Name**: `graintrust` (or your choice)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you (e.g., Asia Pacific - Mumbai)
   - **Pricing Plan**: Free tier is sufficient
5. **Click** "Create new project"
6. **Wait** 2-3 minutes for project to initialize

---

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. **Go to** Project Settings (gear icon on left sidebar)
2. **Click** "API" section
3. **Copy** these values:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

4. **Go to** "Database" section
5. **Copy** "Connection string" (Transaction mode)

---

## Step 3: Update Your .env File

Open `blockchain/graintrust-2.0/.env` and update:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...

# Database URLs (from connection string)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Blockchain Configuration (optional)
BLOCKCHAIN_NETWORK=grain-trust-testnet
BLOCKCHAIN_EXPLORER_URL=https://explorer.graintrust.io
```

**Replace**:
- `xxxxxxxxxxxxx` with your actual project reference
- `[YOUR-PASSWORD]` with your database password

---

## Step 4: Run Database Setup Script

1. **Open** Supabase Dashboard
2. **Click** "SQL Editor" (left sidebar)
3. **Click** "New query"
4. **Copy** the entire content from `database/supabase-complete-setup.sql`
5. **Paste** into SQL Editor
6. **Click** "Run" (or press Ctrl+Enter)
7. **Wait** for script to complete (30-60 seconds)

### What to Expect:

You should see output showing:
```
✅ Tables created
✅ Indexes created
✅ RLS policies applied
✅ Triggers set up
✅ 3 test users inserted
```

**Last query shows table names and counts:**
```
appeals
batches
blockchain_records
blockchain_verification_logs
image_verifications
notifications
stages
users
```

---

## Step 5: Verify Database Setup

### Check Tables Created

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected 8 tables:**
- appeals
- batches
- blockchain_records
- blockchain_verification_logs
- image_verifications
- notifications
- stages
- users

### Check Test Users

```sql
SELECT id, email, name, role 
FROM users 
ORDER BY role;
```

**Expected 3 users:**
- admin@graintrust.com (ADMIN)
- consumer@graintrust.com (CONSUMER)
- farmer@graintrust.com (FARMER)

---

## Step 6: Configure Storage

1. **Go to** Storage (left sidebar)
2. **Verify** bucket "batch-images" was created
3. **Click** on "batch-images"
4. **Verify** policies:
   - "Anyone can read batch images"
   - "Authenticated users can upload images"

---

## Step 7: Test Connection from Your App

1. **Open terminal** in project root:

```bash
cd blockchain/graintrust-2.0
npm install  # If not already done
npm run dev
```

2. **Open browser** to `http://localhost:3005`
3. **Try to sign in** with test users:

**Admin Login:**
```
Email: admin@graintrust.com
Password: admin123  (or whatever you set)
```

**Farmer Login:**
```
Email: farmer@graintrust.com
Password: farmer123
```

---

## Step 8: Test Blockchain Endpoints

Once server is running, test API endpoints:

### Test Health Check:
```bash
curl http://localhost:3005/api/blockchain/status?batchId=test
```

**Expected**: Error (no batch with that ID) - this is good! It means API is working.

### Create a Test Batch:

First, get a user ID:
```sql
SELECT id FROM users WHERE role = 'FARMER' LIMIT 1;
```

Then test batch creation through your app's UI.

---

## 🔐 Security Notes

### Change Default Passwords!

The setup script includes placeholder passwords. Update them:

```sql
-- Update admin password (hash your actual password)
UPDATE users 
SET password = 'YOUR_HASHED_PASSWORD_HERE'
WHERE email = 'admin@graintrust.com';

-- Or delete test users and create real ones through your app
DELETE FROM users WHERE email LIKE '%@graintrust.com';
```

### RLS Policies

The script enables Row Level Security (RLS) on all tables. Current policies:
- ✅ Users can only see their own data
- ✅ Admins can see all data
- ✅ Blockchain records are publicly readable (for transparency)
- ✅ Consumers can read all batches

**Customize** RLS policies as needed in SQL Editor.

---

## 🧪 Testing Checklist

- [ ] New Supabase project created
- [ ] Credentials copied
- [ ] .env file updated
- [ ] SQL script run successfully
- [ ] 8 tables created
- [ ] 3 test users present
- [ ] Storage bucket "batch-images" exists
- [ ] App connects to database (npm run dev works)
- [ ] Can sign in with test users
- [ ] API endpoints accessible

---

## 🐛 Troubleshooting

### Error: "relation 'users' already exists"

**Solution**: Tables already exist. Either:
- Drop all tables first: 
  ```sql
  DROP TABLE IF EXISTS appeals CASCADE;
  DROP TABLE IF EXISTS blockchain_verification_logs CASCADE;
  DROP TABLE IF EXISTS blockchain_records CASCADE;
  DROP TABLE IF EXISTS notifications CASCADE;
  DROP TABLE IF EXISTS image_verifications CASCADE;
  DROP TABLE IF EXISTS stages CASCADE;
  DROP TABLE IF EXISTS batches CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  ```
- Or use a fresh Supabase project

### Error: "permission denied for table users"

**Solution**: Make sure you're using the SQL Editor as project owner/admin, not as a regular user.

### Error: "cannot connect to database"

**Solution**: 
1. Check DATABASE_URL in .env matches Supabase connection string
2. Verify database password is correct
3. Check if Supabase project is still initializing (wait a few minutes)

### API returns 401/403 errors

**Solution**:
1. Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
2. Check RLS policies allow the operation
3. Verify user is authenticated

---

## 📊 What's Included

### Tables Created (8):
1. **users** - User accounts (farmers, admins, consumers)
2. **batches** - Grain batches with blockchain fields
3. **stages** - Farming stages for each batch
4. **image_verifications** - Image approval/rejection records
5. **notifications** - User notifications
6. **blockchain_records** - Blockchain transaction records
7. **blockchain_verification_logs** - Verification audit trail
8. **appeals** - Farmer appeals for flagged images

### Features Enabled:
- ✅ Row Level Security (RLS)
- ✅ Automatic timestamp updates
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Storage bucket for images
- ✅ Test user accounts

### Blockchain Ready:
- ✅ All blockchain fields in batches table
- ✅ Transaction records table
- ✅ Verification logs table
- ✅ Ready for blockchain sync API

---

## 🎯 Next Steps After Setup

1. **Test the app**: `npm run dev`
2. **Create a batch** as farmer
3. **Upload images** for stages
4. **Verify images** as admin
5. **Test blockchain sync** with ready batch

---

## 📞 Need Help?

### Common Issues:

**Q: Can't connect to Supabase?**
A: Double-check your .env file has correct URLs and keys from Supabase dashboard.

**Q: Tables not showing up?**
A: Refresh SQL Editor, or check "Table Editor" in left sidebar.

**Q: RLS policies blocking requests?**
A: Either disable RLS temporarily for testing, or use service role key in API calls.

**Q: Want to start fresh?**
A: Delete your Supabase project and create a new one, then run setup again.

---

## 🎉 Success!

Once all steps complete:
- ✅ You have a working Supabase database
- ✅ All tables created with proper relationships
- ✅ Blockchain integration ready
- ✅ Test users available
- ✅ Your app can connect and work

**Ready to build!** 🚀

---

**Setup Time**: 10-15 minutes  
**File**: `database/supabase-complete-setup.sql`  
**Total SQL**: 461 lines  
**Tables**: 8  
**Test Users**: 3
