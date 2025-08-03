// Test Chat with Existing Data
// Run with: node scripts/test-existing-chat.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectExistingData() {
  console.log('🔍 INSPECTING EXISTING DATA\n');

  try {
    // Check existing groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*');

    if (groupsError) throw groupsError;
    
    console.log('📊 Existing Groups:');
    if (groups.length === 0) {
      console.log('  No groups found');
    } else {
      groups.forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.name || 'Unnamed'} (${group.id})`);
        console.log(`     Status: ${group.status}, Gender: ${group.group_gender}, Max: ${group.max_size}`);
      });
    }

    // Check group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('*');

    if (membersError) throw membersError;
    
    console.log('\n👥 Group Members:');
    if (members.length === 0) {
      console.log('  No group members found');
    } else {
      members.forEach((member, index) => {
        console.log(`  ${index + 1}. User ${member.user_id} in Group ${member.group_id} (${member.status})`);
      });
    }

    // Check existing matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*');

    if (matchesError) throw matchesError;
    
    console.log('\n💕 Existing Matches:');
    if (matches.length === 0) {
      console.log('  No matches found');
    } else {
      matches.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.group1_id} ↔ ${match.group2_id} (${match.status})`);
      });
    }

    // Check existing chat rooms
    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('*');

    if (chatRoomsError) throw chatRoomsError;
    
    console.log('\n💬 Existing Chat Rooms:');
    if (chatRooms.length === 0) {
      console.log('  No chat rooms found');
    } else {
      chatRooms.forEach((room, index) => {
        console.log(`  ${index + 1}. Room ${room.id} (Match: ${room.match_id})`);
      });
    }

    // Check existing messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) throw messagesError;
    
    console.log('\n📨 Recent Messages:');
    if (messages.length === 0) {
      console.log('  No messages found');
    } else {
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. "${msg.content}" from ${msg.sender_id}`);
        console.log(`      Room: ${msg.room_id}, Time: ${msg.created_at}`);
      });
    }

    return { groups, members, matches, chatRooms, messages };

  } catch (error) {
    console.error('❌ Error inspecting data:', error);
    throw error;
  }
}

async function testRPCFunctions() {
  console.log('\n🧪 TESTING RPC FUNCTIONS\n');

  try {
    // Get some user data first
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .limit(3);

    if (usersError) throw usersError;

    if (users.length === 0) {
      console.log('❌ No users found for testing');
      return;
    }

    const testUser = users[0];
    console.log(`🧑 Using test user: ${testUser.first_name} ${testUser.last_name} (${testUser.id})`);

    // Test get_my_bubbles
    console.log('\n🫧 Testing get_my_bubbles...');
    const { data: myBubbles, error: bubblesError } = await supabase
      .rpc('get_my_bubbles', { p_user_id: testUser.id });

    if (bubblesError) {
      console.log('❌ Error:', bubblesError.message);
    } else {
      console.log('✅ Success:', myBubbles || 'No bubbles returned');
    }

    // Test find_matching_group (with dummy data)
    console.log('\n🔍 Testing find_matching_group...');
    const { data: matchingGroups, error: matchingError } = await supabase
      .rpc('find_matching_group', {
        p_group_id: 'dummy-group-id',
        p_limit: 5,
        p_offset: 0
      });

    if (matchingError) {
      console.log('❌ Error (expected):', matchingError.message);
    } else {
      console.log('✅ Success:', matchingGroups || 'No matching groups');
    }

    // Test get_user_active_bubble
    console.log('\n🔄 Testing get_user_active_bubble...');
    const { data: activeBubble, error: activeError } = await supabase
      .rpc('get_user_active_bubble', { p_user_id: testUser.id });

    if (activeError) {
      console.log('❌ Error:', activeError.message);
    } else {
      console.log('✅ Success:', activeBubble || 'No active bubble');
    }

  } catch (error) {
    console.error('❌ Error testing RPC functions:', error);
  }
}

async function testBasicChatOperations() {
  console.log('\n💬 TESTING BASIC CHAT OPERATIONS\n');

  try {
    // Check if we can read from chat tables
    console.log('📖 Testing read permissions...');

    const tables = ['groups', 'group_members', 'matches', 'chat_rooms', 'chat_messages'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  ❌ ${table}: ${error.message}`);
        } else {
          console.log(`  ✅ ${table}: Can read (${count} rows)`);
        }
      } catch (err) {
        console.log(`  ❌ ${table}: ${err.message}`);
      }
    }

    // Test real-time subscription setup
    console.log('\n📡 Testing real-time subscription setup...');
    
    const channel = supabase
      .channel('test_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        console.log('📨 Real-time event received:', payload.eventType);
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription working!');
        }
      });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clean up
    supabase.removeChannel(channel);
    console.log('✅ Real-time test completed');

  } catch (error) {
    console.error('❌ Error testing chat operations:', error);
  }
}

async function suggestNextSteps(data) {
  console.log('\n🚀 NEXT STEPS & RECOMMENDATIONS\n');

  const { groups, members, matches, chatRooms } = data;

  if (groups.length === 0) {
    console.log('📝 To test the full chat flow, you need:');
    console.log('  1. Create groups in your app UI');
    console.log('  2. Add members to groups');
    console.log('  3. Use the matching feature to create matches');
    console.log('  4. Test chat in the created chat rooms');
  } else if (members.length === 0) {
    console.log('👥 You have groups but no members. Add members to test matching.');
  } else if (matches.length === 0) {
    console.log('💕 You have groups with members. Use the matching feature to create matches.');
  } else if (chatRooms.length === 0) {
    console.log('❌ You have matches but no chat rooms. Check your match → chat room creation logic.');
  } else {
    console.log('✅ You have the full flow set up! Test messaging in your existing chat rooms.');
  }

  console.log('\n🛠️  Development workflow:');
  console.log('  1. Use your mobile app to create groups and members');
  console.log('  2. Test matching through the UI');
  console.log('  3. Use this script to verify database state');
  console.log('  4. Test real-time messaging in the app');

  console.log('\n📱 App testing suggestions:');
  console.log('  • Run: npm start');
  console.log('  • Test on iOS simulator or Expo Go');
  console.log('  • Create groups through the onboarding flow');
  console.log('  • Use the matching screen to test liking');
  console.log('  • Verify chat rooms appear and work');
}

// Main execution
async function main() {
  console.log('🧪 BUBBLE CHAT SYSTEM TEST\n');
  console.log('Testing with existing data and permissions...\n');

  try {
    const data = await inspectExistingData();
    await testRPCFunctions();
    await testBasicChatOperations();
    await suggestNextSteps(data);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();