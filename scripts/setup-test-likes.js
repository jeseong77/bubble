// Setup Test Likes for Manual Testing
// Run with: node scripts/setup-test-likes.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestLikes() {
  console.log('💕 SETTING UP TEST LIKES FOR MATCHING\n');

  try {
    // First, let's get the current groups to confirm their IDs
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .order('name');

    if (groupsError) throw groupsError;

    console.log('📊 Available Groups:');
    groups.forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.name} (${group.id})`);
    });

    // Find the specific groups
    const testF2 = groups.find(g => g.name === 'TestF2');
    const testF3 = groups.find(g => g.name === 'TestF3'); 
    const testM = groups.find(g => g.name === 'TestM');

    if (!testF2 || !testF3 || !testM) {
      console.log('\n❌ Could not find required groups:');
      console.log('TestF2:', testF2 ? '✅' : '❌');
      console.log('TestF3:', testF3 ? '✅' : '❌');
      console.log('TestM:', testM ? '✅' : '❌');
      return;
    }

    console.log('\n🎯 Target Groups:');
    console.log(`TestF2: ${testF2.id}`);
    console.log(`TestF3: ${testF3.id}`);
    console.log(`TestM: ${testM.id}`);

    // Check existing likes first
    console.log('\n🔍 Checking existing likes...');
    const { data: existingLikes, error: likesError } = await supabase
      .from('likes')
      .select('from_group_id, to_group_id')
      .or(`from_group_id.eq.${testM.id},to_group_id.eq.${testM.id}`);

    if (likesError) throw likesError;

    console.log('Existing likes involving TestM:', existingLikes.length);
    existingLikes.forEach(like => {
      const fromName = groups.find(g => g.id === like.from_group_id)?.name || 'Unknown';
      const toName = groups.find(g => g.id === like.to_group_id)?.name || 'Unknown';
      console.log(`  ${fromName} → ${toName}`);
    });

    // Setup the likes we need
    console.log('\n💕 Setting up required likes...');

    // 1. TestF3 likes TestM back (to complete the mutual like you already made)
    console.log('\n1. Making TestF3 like TestM back...');
    const { error: like1Error } = await supabase
      .from('likes')
      .upsert({
        from_group_id: testF3.id,
        to_group_id: testM.id,
        created_at: new Date().toISOString()
      });

    if (like1Error) {
      console.log('❌ Error creating TestF3 → TestM like:', like1Error.message);
    } else {
      console.log('✅ TestF3 now likes TestM back!');
    }

    // 2. TestF2 likes TestM (so when TestM likes TestF2, it will be mutual)
    console.log('\n2. Making TestF2 like TestM...');
    const { error: like2Error } = await supabase
      .from('likes')
      .upsert({
        from_group_id: testF2.id,
        to_group_id: testM.id,
        created_at: new Date().toISOString()
      });

    if (like2Error) {
      console.log('❌ Error creating TestF2 → TestM like:', like2Error.message);
    } else {
      console.log('✅ TestF2 now likes TestM!');
    }

    // Verify the setup
    console.log('\n🔍 Verifying likes setup...');
    const { data: newLikes, error: newLikesError } = await supabase
      .from('likes')
      .select('from_group_id, to_group_id')
      .or(`from_group_id.eq.${testM.id},to_group_id.eq.${testM.id}`);

    if (newLikesError) throw newLikesError;

    console.log('\n📊 All likes involving TestM:');
    newLikes.forEach(like => {
      const fromName = groups.find(g => g.id === like.from_group_id)?.name || 'Unknown';
      const toName = groups.find(g => g.id === like.to_group_id)?.name || 'Unknown';
      console.log(`  ${fromName} → ${toName}`);
    });

    // Check for existing matches
    console.log('\n🔍 Checking for existing matches...');
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .or(`group1_id.eq.${testM.id},group2_id.eq.${testM.id}`);

    if (matchesError) throw matchesError;

    console.log('Existing matches involving TestM:', matches.length);
    matches.forEach(match => {
      const group1Name = groups.find(g => g.id === match.group1_id)?.name || 'Unknown';
      const group2Name = groups.find(g => g.id === match.group2_id)?.name || 'Unknown';
      console.log(`  ${group1Name} ↔ ${group2Name} (${match.status})`);
    });

    console.log('\n🎯 TESTING SCENARIOS NOW READY:');
    console.log('\n✅ Scenario 1: TestM ↔ TestF3 (Should already be matched)');
    console.log('   - You liked TestF3');
    console.log('   - TestF3 now likes you back');
    console.log('   - This should create a match and chat room');

    console.log('\n✅ Scenario 2: TestM ↔ TestF2 (Ready for matching)');
    console.log('   - TestF2 now likes TestM');
    console.log('   - When you like TestF2 in the app → MATCH + CHAT ROOM!');

    console.log('\n📱 NEXT STEPS:');
    console.log('1. Open your app: npm start');
    console.log('2. Go to matching screen');
    console.log('3. Look for TestF2 and like it → should create match!');
    console.log('4. Check if TestF3 match already exists in chat list');

  } catch (error) {
    console.error('❌ Error setting up test likes:', error);
  }
}

async function checkMutualLikes() {
  console.log('\n🔍 CHECKING MUTUAL LIKES STATUS\n');

  try {
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .in('name', ['TestF2', 'TestF3', 'TestM']);

    const testF2 = groups.find(g => g.name === 'TestF2');
    const testF3 = groups.find(g => g.name === 'TestF3');
    const testM = groups.find(g => g.name === 'TestM');

    if (!testF2 || !testF3 || !testM) return;

    const { data: likes } = await supabase
      .from('likes')
      .select('from_group_id, to_group_id');

    // Check TestM ↔ TestF3
    const testMToF3 = likes.find(l => l.from_group_id === testM.id && l.to_group_id === testF3.id);
    const testF3ToM = likes.find(l => l.from_group_id === testF3.id && l.to_group_id === testM.id);

    console.log('TestM ↔ TestF3:');
    console.log(`  TestM → TestF3: ${testMToF3 ? '✅' : '❌'}`);
    console.log(`  TestF3 → TestM: ${testF3ToM ? '✅' : '❌'}`);
    console.log(`  Mutual: ${testMToF3 && testF3ToM ? '✅ READY FOR MATCH' : '❌'}`);

    // Check TestM ↔ TestF2
    const testMToF2 = likes.find(l => l.from_group_id === testM.id && l.to_group_id === testF2.id);
    const testF2ToM = likes.find(l => l.from_group_id === testF2.id && l.to_group_id === testM.id);

    console.log('\nTestM ↔ TestF2:');
    console.log(`  TestM → TestF2: ${testMToF2 ? '✅' : '❌'}`);
    console.log(`  TestF2 → TestM: ${testF2ToM ? '✅' : '❌'}`);
    console.log(`  Ready for match when TestM likes TestF2: ${testF2ToM ? '✅' : '❌'}`);

  } catch (error) {
    console.error('Error checking mutual likes:', error);
  }
}

// Main execution
async function main() {
  await setupTestLikes();
  await checkMutualLikes();
  console.log('\n🎉 Test likes setup complete!');
}

main();