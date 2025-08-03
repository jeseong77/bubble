// Create Test Match Manually
// Run with: node scripts/create-test-match.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestMatch() {
  console.log('🎯 CREATING TEST MATCH FOR CHAT TESTING\n');

  try {
    // Get group IDs
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .in('name', ['TestM', 'TestF2']);

    const testM = groups.find(g => g.name === 'TestM');
    const testF2 = groups.find(g => g.name === 'TestF2');

    if (!testM || !testF2) {
      console.log('❌ Could not find required groups');
      return;
    }

    console.log('🎯 Creating match between:');
    console.log(`  TestM: ${testM.id}`);
    console.log(`  TestF2: ${testF2.id}`);

    // Create match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        group_1_id: testM.id,
        group_2_id: testF2.id,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (matchError) {
      console.log('❌ Error creating match:', matchError.message);
      return;
    }

    console.log('✅ Match created:', match.id);

    // Create chat room
    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .insert({
        match_id: match.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (chatRoomError) {
      console.log('❌ Error creating chat room:', chatRoomError.message);
      return;
    }

    console.log('✅ Chat room created:', chatRoom.id);

    // Test get_my_matches
    console.log('\n📱 Testing get_my_matches...');
    const { data: matches, error: matchesError } = await supabase
      .rpc('get_my_matches');

    if (matchesError) {
      console.log('❌ get_my_matches error:', matchesError.message);
    } else {
      console.log('✅ Found', matches.length, 'matches:');
      matches.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.other_group_name}`);
        console.log(`     Chat Room: ${match.chat_room_id}`);
        console.log(`     Match ID: ${match.match_id}`);
      });
    }

    // Send a test message
    console.log('\n💬 Sending test message...');
    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        room_id: chatRoom.id,
        sender_id: '114381a5-fb89-4a1a-9a08-9709d356398d', // Jeseong
        content: 'Test message - chat room is working! 🎉'
      });

    if (messageError) {
      console.log('❌ Error sending message:', messageError.message);
    } else {
      console.log('✅ Test message sent!');
    }

    console.log('\n🎉 TEST MATCH SETUP COMPLETE!');
    console.log('\n📱 Now you can test:');
    console.log('1. Go to chats tab in your app');
    console.log('2. You should see TestF2 in the chat list');
    console.log('3. Tap on it to open the chat room');
    console.log('4. Send messages to test real-time functionality');
    console.log(`\nChat Room ID: ${chatRoom.id}`);

  } catch (error) {
    console.error('❌ Error creating test match:', error);
  }
}

createTestMatch();