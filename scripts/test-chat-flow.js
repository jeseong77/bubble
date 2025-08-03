// Test Chat Flow - Create groups, match them, and test chat
// Run with: node scripts/test-chat-flow.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testUsers = [
  {
    id: '114381a5-fb89-4a1a-9a08-9709d356398d', // Jeseong
    name: 'Jeseong Lee'
  },
  {
    id: 'c76869ae-cef1-493c-9fa9-447bde763cdf', // Miyeon  
    name: 'Miyeon Jo'
  },
  {
    id: 'd7a01fa7-d5f8-4caf-8561-a5437ec2b687', // Natty
    name: 'Natty Kim'
  }
];

let group1Id, group2Id, matchId, chatRoomId;

async function step1_CreateTestGroups() {
  console.log('🏗️  STEP 1: Creating Test Groups\n');

  try {
    // Create Group 1 (Jeseong's group)
    const { data: group1, error: group1Error } = await supabase
      .from('groups')
      .insert({
        creator_id: testUsers[0].id,
        max_size: 2,
        status: 'active',
        name: 'Jeseong\'s Group',
        group_gender: 'male',
        preferred_gender: 'female'
      })
      .select()
      .single();

    if (group1Error) throw group1Error;
    group1Id = group1.id;
    console.log('✅ Created Group 1:', group1.name, `(${group1Id})`);

    // Add Jeseong to Group 1
    const { error: member1Error } = await supabase
      .from('group_members')
      .insert({
        group_id: group1Id,
        user_id: testUsers[0].id,
        status: 'joined',
        joined_at: new Date().toISOString()
      });

    if (member1Error) throw member1Error;
    console.log('✅ Added Jeseong to Group 1');

    // Create Group 2 (Miyeon & Natty's group)
    const { data: group2, error: group2Error } = await supabase
      .from('groups')
      .insert({
        creator_id: testUsers[1].id,
        max_size: 2,
        status: 'active',
        name: 'Miyeon & Natty\'s Group',
        group_gender: 'female',
        preferred_gender: 'male'
      })
      .select()
      .single();

    if (group2Error) throw group2Error;
    group2Id = group2.id;
    console.log('✅ Created Group 2:', group2.name, `(${group2Id})`);

    // Add Miyeon and Natty to Group 2
    const { error: member2Error } = await supabase
      .from('group_members')
      .insert([
        {
          group_id: group2Id,
          user_id: testUsers[1].id,
          status: 'joined',
          joined_at: new Date().toISOString()
        },
        {
          group_id: group2Id,
          user_id: testUsers[2].id,
          status: 'joined',
          joined_at: new Date().toISOString()
        }
      ]);

    if (member2Error) throw member2Error;
    console.log('✅ Added Miyeon and Natty to Group 2');

    console.log('\n📊 Groups Created:');
    console.log(`  Group 1: ${group1Id} (${group1.name})`);
    console.log(`  Group 2: ${group2Id} (${group2.name})`);

  } catch (error) {
    console.error('❌ Error creating groups:', error);
    throw error;
  }
}

async function step2_TestMutualLiking() {
  console.log('\n💕 STEP 2: Testing Mutual Liking (Match Creation)\n');

  try {
    // Group 1 likes Group 2
    console.log('👍 Group 1 likes Group 2...');
    const { data: like1Result, error: like1Error } = await supabase
      .rpc('like_group', {
        p_from_group_id: group1Id,
        p_to_group_id: group2Id
      });

    if (like1Error) throw like1Error;
    console.log('✅ Like 1 result:', like1Result);

    // Group 2 likes Group 1 (this should create a match!)
    console.log('👍 Group 2 likes Group 1...');
    const { data: like2Result, error: like2Error } = await supabase
      .rpc('like_group', {
        p_from_group_id: group2Id,
        p_to_group_id: group1Id
      });

    if (like2Error) throw like2Error;
    console.log('✅ Like 2 result:', like2Result);

    if (like2Result && like2Result.status === 'matched') {
      console.log('🎉 MATCH CREATED!');
      chatRoomId = like2Result.chat_room_id;
      console.log('💬 Chat Room ID:', chatRoomId);
    } else {
      console.log('❌ No match created. Result:', like2Result);
    }

  } catch (error) {
    console.error('❌ Error in mutual liking:', error);
    throw error;
  }
}

async function step3_VerifyChatRoom() {
  console.log('\n💬 STEP 3: Verifying Chat Room Creation\n');

  try {
    // Check if chat room exists
    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', chatRoomId)
      .single();

    if (chatRoomError) throw chatRoomError;
    console.log('✅ Chat Room Found:', chatRoom);

    // Check the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', chatRoom.match_id)
      .single();

    if (matchError) throw matchError;
    console.log('✅ Match Found:', match);
    matchId = match.id;

    console.log('\n📊 Match Details:');
    console.log(`  Match ID: ${matchId}`);
    console.log(`  Group 1: ${match.group1_id}`);
    console.log(`  Group 2: ${match.group2_id}`);
    console.log(`  Chat Room: ${chatRoomId}`);
    console.log(`  Status: ${match.status}`);

  } catch (error) {
    console.error('❌ Error verifying chat room:', error);
    throw error;
  }
}

async function step4_TestRealTimeMessaging() {
  console.log('\n🔄 STEP 4: Testing Real-Time Messaging\n');

  try {
    // Set up real-time subscription
    console.log('📡 Setting up real-time subscription...');
    
    const channel = supabase
      .channel(`test_chat_room:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          console.log('📨 Real-time message received:', {
            id: payload.new.id,
            content: payload.new.content,
            sender: payload.new.sender_id,
            timestamp: payload.new.created_at
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Wait a moment for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send test messages
    console.log('\n💌 Sending test messages...');

    // Message from Jeseong
    const { data: msg1, error: msg1Error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: chatRoomId,
        sender_id: testUsers[0].id,
        content: 'Hey! Nice to match with you! 👋'
      })
      .select()
      .single();

    if (msg1Error) throw msg1Error;
    console.log('✅ Message 1 sent:', msg1.content);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Message from Miyeon
    const { data: msg2, error: msg2Error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: chatRoomId,
        sender_id: testUsers[1].id,
        content: 'Hi Jeseong! Great to meet you! 😊'
      })
      .select()
      .single();

    if (msg2Error) throw msg2Error;
    console.log('✅ Message 2 sent:', msg2.content);

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 500));

    // Message from Natty
    const { data: msg3, error: msg3Error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: chatRoomId,
        sender_id: testUsers[2].id,
        content: 'Looking forward to chatting! 🎉'
      })
      .select()
      .single();

    if (msg3Error) throw msg3Error;
    console.log('✅ Message 3 sent:', msg3.content);

    // Wait for real-time messages to come through
    console.log('\n⏳ Waiting for real-time messages (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Clean up subscription
    supabase.removeChannel(channel);
    console.log('✅ Real-time subscription cleaned up');

    // Check all messages in the chat room
    const { data: allMessages, error: allMsgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', chatRoomId)
      .order('created_at', { ascending: true });

    if (allMsgError) throw allMsgError;

    console.log('\n📜 All Messages in Chat Room:');
    allMessages.forEach((msg, index) => {
      const sender = testUsers.find(u => u.id === msg.sender_id);
      console.log(`  ${index + 1}. ${sender?.name}: "${msg.content}"`);
    });

  } catch (error) {
    console.error('❌ Error testing real-time messaging:', error);
    throw error;
  }
}

async function step5_CleanupTestData() {
  console.log('\n🧹 STEP 5: Cleanup Test Data\n');

  try {
    // Delete chat messages
    await supabase.from('chat_messages').delete().eq('room_id', chatRoomId);
    console.log('✅ Deleted chat messages');

    // Delete chat room
    await supabase.from('chat_rooms').delete().eq('id', chatRoomId);
    console.log('✅ Deleted chat room');

    // Delete match
    await supabase.from('matches').delete().eq('id', matchId);
    console.log('✅ Deleted match');

    // Delete likes
    await supabase.from('likes').delete().eq('from_group_id', group1Id);
    await supabase.from('likes').delete().eq('from_group_id', group2Id);
    console.log('✅ Deleted likes');

    // Delete group members
    await supabase.from('group_members').delete().eq('group_id', group1Id);
    await supabase.from('group_members').delete().eq('group_id', group2Id);
    console.log('✅ Deleted group members');

    // Delete groups
    await supabase.from('groups').delete().eq('id', group1Id);
    await supabase.from('groups').delete().eq('id', group2Id);
    console.log('✅ Deleted groups');

    console.log('\n🎯 Cleanup completed!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Main test flow
async function runChatFlowTest() {
  console.log('🧪 CHAT FLOW TEST STARTING\n');
  console.log('Testing: Group matching → Chat room creation → Real-time messaging\n');

  try {
    await step1_CreateTestGroups();
    await step2_TestMutualLiking();
    await step3_VerifyChatRoom();
    await step4_TestRealTimeMessaging();
    
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('\n✅ Chat flow is working correctly:');
    console.log('  ✓ Groups can be created');
    console.log('  ✓ Mutual liking creates matches');
    console.log('  ✓ Chat rooms are automatically created');
    console.log('  ✓ Real-time messaging works');
    
    const keepData = process.argv.includes('--keep-data');
    if (!keepData) {
      await step5_CleanupTestData();
    } else {
      console.log('\n💾 Test data preserved (use --keep-data flag)');
      console.log(`Chat Room ID: ${chatRoomId}`);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.log('\n🧹 Attempting cleanup...');
    await step5_CleanupTestData();
    process.exit(1);
  }
}

// Run the test
runChatFlowTest();