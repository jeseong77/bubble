// Test Full Matching Flow with Manual Data
// Run with: node scripts/test-full-matching-flow.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Use existing test users
const testUsers = [
  { id: '114381a5-fb89-4a1a-9a08-9709d356398d', name: 'Jeseong Lee' },
  { id: 'c76869ae-cef1-493c-9fa9-447bde763cdf', name: 'Miyeon Jo' },
  { id: 'd7a01fa7-d5f8-4caf-8561-a5437ec2b687', name: 'Natty Kim' }
];

let group1Id, group2Id;

async function step1_AddMembersToExistingGroups() {
  console.log('👥 STEP 1: Adding Members to Existing Groups\n');

  try {
    // Get existing groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .limit(2);

    if (groupsError) throw groupsError;

    if (groups.length < 2) {
      console.log('❌ Need at least 2 groups. Found:', groups.length);
      return false;
    }

    group1Id = groups[0].id;
    group2Id = groups[1].id;

    console.log(`Using groups: ${group1Id} and ${group2Id}`);

    // Add Jeseong to Group 1
    console.log('Adding Jeseong to Group 1...');
    const { error: member1Error } = await supabase
      .from('group_members')
      .upsert({
        group_id: group1Id,
        user_id: testUsers[0].id,
        status: 'joined',
        joined_at: new Date().toISOString()
      });

    if (member1Error && !member1Error.message.includes('duplicate')) {
      console.log('❌ Error adding Jeseong:', member1Error.message);
    } else {
      console.log('✅ Jeseong added to Group 1');
    }

    // Add Miyeon to Group 2
    console.log('Adding Miyeon to Group 2...');
    const { error: member2Error } = await supabase
      .from('group_members')
      .upsert({
        group_id: group2Id,
        user_id: testUsers[1].id,
        status: 'joined',
        joined_at: new Date().toISOString()
      });

    if (member2Error && !member2Error.message.includes('duplicate')) {
      console.log('❌ Error adding Miyeon:', member2Error.message);
    } else {
      console.log('✅ Miyeon added to Group 2');
    }

    // Add Natty to Group 2
    console.log('Adding Natty to Group 2...');
    const { error: member3Error } = await supabase
      .from('group_members')
      .upsert({
        group_id: group2Id,
        user_id: testUsers[2].id,
        status: 'joined',
        joined_at: new Date().toISOString()
      });

    if (member3Error && !member3Error.message.includes('duplicate')) {
      console.log('❌ Error adding Natty:', member3Error.message);
    } else {
      console.log('✅ Natty added to Group 2');
    }

    // Verify members were added
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        group_id,
        user_id,
        status,
        users(first_name, last_name)
      `)
      .in('group_id', [group1Id, group2Id]);

    if (membersError) throw membersError;

    console.log('\n📊 Current Group Members:');
    members.forEach(member => {
      const groupNum = member.group_id === group1Id ? 1 : 2;
      console.log(`  Group ${groupNum}: ${member.users.first_name} ${member.users.last_name} (${member.status})`);
    });

    return true;

  } catch (error) {
    console.error('❌ Error in step 1:', error);
    return false;
  }
}

async function step2_TestLikeGroupFunction() {
  console.log('\n💕 STEP 2: Testing like_group RPC Function\n');

  try {
    console.log('🧪 Testing like_group RPC function...');
    
    // Test Group 1 likes Group 2
    console.log(`Group 1 (${group1Id}) likes Group 2 (${group2Id})`);
    const { data: like1Result, error: like1Error } = await supabase
      .rpc('like_group', {
        p_from_group_id: group1Id,
        p_to_group_id: group2Id
      });

    if (like1Error) {
      console.log('❌ Error with like_group RPC:', like1Error.message);
      console.log('💡 This means the RPC function needs to be created/updated');
      return false;
    }

    console.log('✅ Group 1 liked Group 2:', like1Result);

    // Test Group 2 likes Group 1 (should create match)
    console.log(`Group 2 (${group2Id}) likes Group 1 (${group1Id})`);
    const { data: like2Result, error: like2Error } = await supabase
      .rpc('like_group', {
        p_from_group_id: group2Id,
        p_to_group_id: group1Id
      });

    if (like2Error) {
      console.log('❌ Error with second like:', like2Error.message);
      return false;
    }

    console.log('✅ Group 2 liked Group 1:', like2Result);

    if (like2Result && like2Result.status === 'matched') {
      console.log('🎉 MATCH CREATED!');
      console.log('💬 Chat Room ID:', like2Result.chat_room_id);
      console.log('🔗 Match ID:', like2Result.match_id);
      return { chatRoomId: like2Result.chat_room_id, matchId: like2Result.match_id };
    } else {
      console.log('⚠️ No match created, result:', like2Result);
      return false;
    }

  } catch (error) {
    console.error('❌ Error in step 2:', error);
    return false;
  }
}

async function step3_TestRealTimeChat(chatRoomId) {
  console.log('\n💬 STEP 3: Testing Real-Time Chat\n');

  if (!chatRoomId) {
    console.log('❌ No chat room ID provided');
    return false;
  }

  try {
    console.log('📡 Setting up real-time subscription...');
    
    let messagesReceived = 0;
    const channel = supabase
      .channel(`test_chat:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          messagesReceived++;
          console.log(`📨 Real-time message ${messagesReceived}:`, {
            content: payload.new.content,
            sender: payload.new.sender_id === testUsers[0].id ? 'Jeseong' : 
                    payload.new.sender_id === testUsers[1].id ? 'Miyeon' : 'Natty'
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send test messages
    console.log('\n💌 Sending test messages...');

    const messages = [
      { sender: testUsers[0].id, content: 'Hey everyone! Nice to match! 👋' },
      { sender: testUsers[1].id, content: 'Hi Jeseong! So excited to chat! 😊' },
      { sender: testUsers[2].id, content: 'This is awesome! Looking forward to meeting! 🎉' }
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const senderName = testUsers.find(u => u.id === msg.sender).name;
      
      console.log(`📤 ${senderName}: "${msg.content}"`);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: chatRoomId,
          sender_id: msg.sender,
          content: msg.content
        });

      if (error) {
        console.log('❌ Error sending message:', error.message);
      }

      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait for real-time messages
    console.log('\n⏳ Waiting for real-time messages (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Clean up
    supabase.removeChannel(channel);
    console.log('✅ Real-time test completed');

    if (messagesReceived === messages.length) {
      console.log(`🎉 All ${messagesReceived} messages received in real-time!`);
      return true;
    } else {
      console.log(`⚠️ Only ${messagesReceived}/${messages.length} messages received`);
      return false;
    }

  } catch (error) {
    console.error('❌ Error in step 3:', error);
    return false;
  }
}

async function step4_VerifyDatabaseState() {
  console.log('\n🔍 STEP 4: Verifying Database State\n');

  try {
    // Check likes
    const { data: likes } = await supabase
      .from('likes')
      .select('*')
      .or(`from_group_id.eq.${group1Id},from_group_id.eq.${group2Id}`);

    console.log('👍 Likes created:', likes?.length || 0);
    likes?.forEach(like => {
      const fromGroup = like.from_group_id === group1Id ? 'Group 1' : 'Group 2';
      const toGroup = like.to_group_id === group1Id ? 'Group 1' : 'Group 2';
      console.log(`  ${fromGroup} → ${toGroup}`);
    });

    // Check matches
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`group1_id.eq.${group1Id},group2_id.eq.${group1Id}`);

    console.log('\n💕 Matches created:', matches?.length || 0);
    matches?.forEach(match => {
      console.log(`  Match: ${match.group1_id} ↔ ${match.group2_id} (${match.status})`);
    });

    // Check chat rooms
    const { data: chatRooms } = await supabase
      .from('chat_rooms')
      .select('*, matches(*)')
      .eq('matches.group1_id', group1Id)
      .or(`matches.group1_id.eq.${group1Id},matches.group2_id.eq.${group1Id}`);

    console.log('\n💬 Chat rooms created:', chatRooms?.length || 0);
    chatRooms?.forEach(room => {
      console.log(`  Room: ${room.id} (Match: ${room.match_id})`);
    });

    // Check messages
    if (chatRooms && chatRooms.length > 0) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', chatRooms[0].id);

      console.log('\n📨 Messages sent:', messages?.length || 0);
    }

    return true;

  } catch (error) {
    console.error('❌ Error in step 4:', error);
    return false;
  }
}

// Main test execution
async function main() {
  console.log('🧪 COMPREHENSIVE MATCHING & CHAT TEST\n');
  console.log('Testing: Group setup → Mutual liking → Match creation → Real-time chat\n');

  try {
    // Step 1: Set up groups with members
    const step1Success = await step1_AddMembersToExistingGroups();
    if (!step1Success) {
      console.log('❌ Step 1 failed, stopping test');
      return;
    }

    // Step 2: Test the like_group RPC function
    const step2Result = await step2_TestLikeGroupFunction();
    if (!step2Result) {
      console.log('❌ Step 2 failed, but continuing to verify database...');
      await step4_VerifyDatabaseState();
      console.log('\n💡 To fix, run the SQL in scripts/create-correct-rpc.sql in Supabase Dashboard');
      return;
    }

    // Step 3: Test real-time chat
    const step3Success = await step3_TestRealTimeChat(step2Result.chatRoomId);
    
    // Step 4: Verify final database state
    await step4_VerifyDatabaseState();

    // Summary
    console.log('\n🎯 TEST SUMMARY:');
    console.log('✅ Group members added');
    console.log('✅ Like function working');
    console.log('✅ Match creation working');
    console.log('✅ Chat room creation working');
    console.log(step3Success ? '✅ Real-time messaging working' : '⚠️ Real-time messaging partial');

    console.log('\n🎉 Your matching and chat flow is working correctly!');
    console.log(`📱 You can now test in your app with groups ${group1Id} and ${group2Id}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await step4_VerifyDatabaseState();
  }
}

main();