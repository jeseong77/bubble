// Test Chat Fix - Verify RPC functions and create test match
// Run with: node scripts/test-chat-fix.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChatFix() {
  console.log('🔧 TESTING CHAT FIX\n');

  try {
    // Test 1: Check if get_my_matches RPC exists and works
    console.log('1. Testing get_my_matches RPC...');
    const { data: matches, error: matchesError } = await supabase
      .rpc('get_my_matches');

    if (matchesError) {
      console.log('❌ get_my_matches error:', matchesError.message);
      console.log('💡 Run the SQL in scripts/fix-chat-issues.sql first');
    } else {
      console.log('✅ get_my_matches works! Found', matches.length, 'matches');
      matches.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.other_group_name} (Room: ${match.chat_room_id})`);
      });
    }

    // Test 2: Get group IDs for testing
    console.log('\n2. Getting group information...');
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .in('name', ['TestM', 'TestF2', 'TestF3']);

    const testM = groups.find(g => g.name === 'TestM');
    const testF2 = groups.find(g => g.name === 'TestF2');
    const testF3 = groups.find(g => g.name === 'TestF3');

    console.log('Groups found:');
    console.log(`  TestM: ${testM?.id}`);
    console.log(`  TestF2: ${testF2?.id}`);
    console.log(`  TestF3: ${testF3?.id}`);

    // Test 3: Check current likes
    console.log('\n3. Current likes status...');
    const { data: likes } = await supabase
      .from('likes')
      .select('from_group_id, to_group_id');

    const testMToF2 = likes.find(l => l.from_group_id === testM?.id && l.to_group_id === testF2?.id);
    const testF2ToM = likes.find(l => l.from_group_id === testF2?.id && l.to_group_id === testM?.id);
    const testMToF3 = likes.find(l => l.from_group_id === testM?.id && l.to_group_id === testF3?.id);
    const testF3ToM = likes.find(l => l.from_group_id === testF3?.id && l.to_group_id === testM?.id);

    console.log('Like status:');
    console.log(`  TestM → TestF2: ${testMToF2 ? '✅' : '❌'}`);
    console.log(`  TestF2 → TestM: ${testF2ToM ? '✅' : '❌'}`);
    console.log(`  TestM → TestF3: ${testMToF3 ? '✅' : '❌'}`);
    console.log(`  TestF3 → TestM: ${testF3ToM ? '✅' : '❌'}`);

    // Test 4: Test like_group RPC function
    if (testM && testF2 && testF2ToM && !testMToF2) {
      console.log('\n4. Testing like_group RPC (TestM → TestF2)...');
      const { data: likeResult, error: likeError } = await supabase
        .rpc('like_group', {
          p_from_group_id: testM.id,
          p_to_group_id: testF2.id
        });

      if (likeError) {
        console.log('❌ like_group error:', likeError.message);
      } else {
        console.log('✅ like_group result:', likeResult);
        
        if (likeResult.status === 'matched') {
          console.log('🎉 MATCH CREATED!');
          console.log('💬 Chat Room ID:', likeResult.chat_room_id);
          
          // Test the get_my_matches again to see if it shows up
          console.log('\n5. Re-testing get_my_matches after match...');
          const { data: newMatches } = await supabase.rpc('get_my_matches');
          console.log('✅ Updated matches:', newMatches.length);
          newMatches.forEach((match, index) => {
            console.log(`  ${index + 1}. ${match.other_group_name} (Room: ${match.chat_room_id})`);
          });
        }
      }
    }

    // Test 5: Check database state
    console.log('\n6. Final database state...');
    const { data: finalMatches } = await supabase.from('matches').select('*');
    const { data: finalChatRooms } = await supabase.from('chat_rooms').select('*');
    
    console.log(`Matches in DB: ${finalMatches.length}`);
    console.log(`Chat rooms in DB: ${finalChatRooms.length}`);

    console.log('\n✅ Chat fix test completed!');
    console.log('\n📱 Next steps:');
    console.log('1. Run the SQL in scripts/fix-chat-issues.sql in Supabase Dashboard');
    console.log('2. Test your app navigation to chat rooms');
    console.log('3. Try liking TestF2 in the matching screen');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChatFix();