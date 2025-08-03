// Database inspection utility
// Run with: node scripts/inspect-db.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('🔍 Inspecting Supabase Database...\n');

  try {
    // 1. Check available tables
    console.log('📋 Available Tables:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      tables.forEach(table => console.log(`  - ${table.table_name}`));
    }

    console.log('\n📊 Table Row Counts:');
    
    // 2. Check row counts for each table
    const tableNames = ['users', 'groups', 'group_members', 'matches', 'chat_rooms', 'chat_messages', 'likes'];
    
    for (const tableName of tableNames) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  - ${tableName}: Error - ${error.message}`);
        } else {
          console.log(`  - ${tableName}: ${count} rows`);
        }
      } catch (err) {
        console.log(`  - ${tableName}: Table might not exist`);
      }
    }

    // 3. Sample data from users table
    console.log('\n👥 Sample Users Data:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, created_at')
      .limit(5);

    if (usersError) {
      console.log('Error fetching users:', usersError.message);
    } else {
      console.table(users);
    }

    // 4. Check RPC functions
    console.log('\n🔧 Available RPC Functions:');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .order('routine_name');

    if (functionsError) {
      console.log('Error fetching functions:', functionsError.message);
    } else {
      functions.forEach(func => console.log(`  - ${func.routine_name} (${func.routine_type})`));
    }

  } catch (error) {
    console.error('Database inspection failed:', error);
  }
}

// 5. Test specific RPC functions from your codebase
async function testRPCFunctions() {
  console.log('\n🧪 Testing RPC Functions:');
  
  // Test get_my_bubbles (requires user_id)
  console.log('\n Testing get_my_bubbles...');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_bubbles', {
    p_user_id: 'test-user-id'
  });
  
  if (rpcError) {
    console.log('RPC Error (expected if no test user):', rpcError.message);
  } else {
    console.log('RPC Success:', rpcData);
  }
}

// Run inspection
inspectDatabase().then(() => {
  testRPCFunctions().then(() => {
    console.log('\n✅ Database inspection complete!');
    process.exit(0);
  });
});