// Test script to verify QR code RPC functions work correctly
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Testing QR Code RPC Functions...')

async function testRPCFunctions() {
  console.log('\n1️⃣ Testing get_bubble RPC function...')
  
  // Test get_bubble with a fake UUID (should fail gracefully)
  const testGroupId = '00000000-0000-4000-8000-000000000000'
  
  try {
    const { data, error } = await supabase.rpc('get_bubble', {
      p_group_id: testGroupId
    })
    
    console.log('📋 get_bubble RPC response:', {
      hasData: !!data,
      dataLength: data?.length,
      hasError: !!error,
      error: error?.message
    })
    
    if (error) {
      console.log('❌ get_bubble RPC failed (this might be expected for test ID):', error.message)
    } else if (!data || data.length === 0) {
      console.log('✅ get_bubble RPC worked correctly (no bubble found for test ID)')
    } else {
      console.log('✅ get_bubble RPC worked correctly, found:', data)
    }
  } catch (e) {
    console.error('💥 Exception testing get_bubble:', e.message)
  }
  
  console.log('\n2️⃣ Testing join_bubble_direct RPC function...')
  
  // Test join_bubble_direct with fake data (should fail gracefully)
  const testUserId = '00000000-0000-4000-8000-000000000001'
  const testToken = 'TESTTOKEN'
  
  try {
    const { data, error } = await supabase.rpc('join_bubble_direct', {
      p_group_id: testGroupId,
      p_user_id: testUserId,
      p_invite_token: testToken
    })
    
    console.log('📋 join_bubble_direct RPC response:', {
      hasData: !!data,
      hasError: !!error,
      success: data?.success,
      message: data?.message,
      error: error?.message
    })
    
    if (error) {
      console.log('❌ join_bubble_direct RPC failed:', error.message)
    } else if (data?.success === false) {
      console.log('✅ join_bubble_direct RPC worked correctly (expected failure for test data):', data.message)
    } else {
      console.log('✅ join_bubble_direct RPC worked correctly:', data)
    }
  } catch (e) {
    console.error('💥 Exception testing join_bubble_direct:', e.message)
  }
  
  console.log('\n🎯 RPC Function tests completed!')
  console.log('\nTo run these tests:')
  console.log('1. Ensure your Supabase environment variables are set')
  console.log('2. Run: node test_qr_rpc.js')
  console.log('3. Check that both RPC functions respond without permission errors')
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRPCFunctions()
}

export { testRPCFunctions }