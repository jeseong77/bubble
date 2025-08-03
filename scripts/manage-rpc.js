// RPC Function Management Utility
// Run with: node scripts/manage-rpc.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read and execute RPC functions from your database folder
async function deployRPCFunctions() {
  console.log('🚀 Deploying RPC Functions...\n');

  try {
    const rpcFilePath = path.join(__dirname, '../database/rpc_functions.sql');
    
    if (!fs.existsSync(rpcFilePath)) {
      console.log('❌ RPC functions file not found at:', rpcFilePath);
      return;
    }

    const sqlContent = fs.readFileSync(rpcFilePath, 'utf8');
    console.log('📄 RPC Functions SQL Content:');
    console.log(sqlContent.substring(0, 500) + '...\n');

    // Note: Direct SQL execution requires service_role key, not anon key
    console.log('⚠️  To execute SQL directly, you need to:');
    console.log('1. Use Supabase Dashboard SQL Editor');
    console.log('2. Use Supabase CLI with: supabase db push');
    console.log('3. Use service_role key (not anon key) for direct execution\n');

  } catch (error) {
    console.error('Error reading RPC functions:', error);
  }
}

// Test existing RPC functions
async function testExistingRPCs() {
  console.log('🧪 Testing Existing RPC Functions...\n');

  const rpcTests = [
    {
      name: 'get_my_bubbles',
      params: { p_user_id: 'dummy-user-id' },
      description: 'Get user bubbles'
    },
    {
      name: 'find_matching_group',
      params: { p_group_id: 'dummy-group-id', p_limit: 5, p_offset: 0 },
      description: 'Find matching groups'
    },
    {
      name: 'get_bubble',
      params: { p_group_id: 'dummy-group-id' },
      description: 'Get bubble details'
    },
    {
      name: 'like_group',
      params: { p_from_group_id: 'dummy-from', p_to_group_id: 'dummy-to' },
      description: 'Like a group'
    }
  ];

  for (const test of rpcTests) {
    console.log(`Testing ${test.name} - ${test.description}`);
    
    try {
      const { data, error } = await supabase.rpc(test.name, test.params);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Success: Function exists and responded`);
        console.log(`  📊 Response type: ${Array.isArray(data) ? 'array' : typeof data}`);
      }
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
    }
    
    console.log('');
  }
}

// Create a new RPC function example
async function createSampleRPC() {
  console.log('📝 Sample RPC Function Creation:\n');

  const sampleRPC = `
-- Example: Create a simple RPC function
CREATE OR REPLACE FUNCTION hello_world(name TEXT DEFAULT 'World')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'Hello, ' || name || '!';
END;
$$;

-- Example: Get user count
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  RETURN user_count;
END;
$$;
`;

  console.log('📄 Sample RPC SQL:');
  console.log(sampleRPC);
  console.log('💡 To execute this SQL:');
  console.log('1. Copy the SQL above');
  console.log('2. Go to Supabase Dashboard > SQL Editor');
  console.log('3. Paste and run the SQL');
  console.log('4. Test with: supabase.rpc("hello_world", { name: "Claude" })\n');
}

// Main execution
async function main() {
  console.log('🗄️  Supabase RPC Management Tool\n');
  
  await deployRPCFunctions();
  await testExistingRPCs();
  await createSampleRPC();
  
  console.log('✅ RPC management complete!');
}

main().catch(console.error);