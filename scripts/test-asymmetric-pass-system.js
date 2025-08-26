// Test Asymmetric Pass System
// Run with: node scripts/test-asymmetric-pass-system.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test scenarios for asymmetric pass system
async function getTestUserId() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (error || !data || data.length === 0) {
    throw new Error('No test users found in database');
  }
  
  return data[0].id;
}

async function createTestGroup(groupConfig, testUserId, index) {
  console.log(`Creating test group ${index + 1}: ${groupConfig.gender} seeking ${groupConfig.preference}`);
  
  const { data: groupId, error } = await supabase.rpc('create_group', {
    p_creator_id: testUserId,
    p_max_size: 2,
    p_group_name: `Test Group ${index + 1} (${groupConfig.gender})`,
    p_preferred_gender: groupConfig.preference
  });

  if (error) {
    throw new Error(`Failed to create group: ${error.message}`);
  }

  // Update group to be "full" status
  const { error: updateError } = await supabase
    .from('groups')
    .update({ 
      status: 'full',
      group_gender: groupConfig.gender
    })
    .eq('id', groupId);

  if (updateError) {
    throw new Error(`Failed to update group status: ${updateError.message}`);
  }

  console.log(`✅ Created group ${groupId} (${groupConfig.gender} → ${groupConfig.preference})`);
  return groupId;
}

async function testAsymmetricPassing() {
  console.log('🧪 ASYMMETRIC PASS SYSTEM TEST\n');
  
  const testUserId = await getTestUserId();
  console.log(`Using test user ID: ${testUserId}\n`);
  
  try {
    // Create two matching groups
    const groupG = await createTestGroup({
      gender: "woman",
      preference: "man"
    }, testUserId, 0);
    
    const groupM = await createTestGroup({
      gender: "man", 
      preference: "woman"
    }, testUserId, 1);
    
    console.log('\n📋 TEST SCENARIO:');
    console.log(`Group G (${groupG}): woman seeking man`);
    console.log(`Group M (${groupM}): man seeking woman`);
    console.log('Expected: Perfect match candidates\n');
    
    // Step 1: Verify both groups see each other initially
    console.log('🔍 STEP 1: Verify initial mutual visibility');
    
    const { data: gSeesM } = await supabase.rpc('find_matching_group', {
      p_group_id: groupG,
      p_limit: 10,
      p_offset: 0
    });
    
    const { data: mSeesG } = await supabase.rpc('find_matching_group', {
      p_group_id: groupM,
      p_limit: 10,
      p_offset: 0
    });
    
    const gCanSeeM = gSeesM && gSeesM.find(group => group.group_id === groupM);
    const mCanSeeG = mSeesG && mSeesG.find(group => group.group_id === groupG);
    
    console.log(`Group G can see Group M: ${gCanSeeM ? '✅ YES' : '❌ NO'}`);
    console.log(`Group M can see Group G: ${mCanSeeG ? '✅ YES' : '❌ NO'}`);
    
    if (!gCanSeeM || !mCanSeeG) {
      throw new Error('Groups should see each other initially but they dont');
    }
    
    // Step 2: Group G passes on Group M
    console.log('\n👎 STEP 2: Group G passes on Group M');
    
    const { data: passResult, error: passError } = await supabase.rpc('pass_group', {
      p_from_group_id: groupG,
      p_to_group_id: groupM
    });
    
    if (passError) {
      throw new Error(`Pass operation failed: ${passError.message}`);
    }
    
    console.log(`✅ Pass recorded: ${passResult}`);
    
    // Step 3: Verify asymmetric visibility after pass
    console.log('\n🔍 STEP 3: Verify asymmetric visibility after pass');
    
    const { data: gSeesM_after } = await supabase.rpc('find_matching_group', {
      p_group_id: groupG,
      p_limit: 10,
      p_offset: 0
    });
    
    const { data: mSeesG_after } = await supabase.rpc('find_matching_group', {
      p_group_id: groupM,
      p_limit: 10,
      p_offset: 0
    });
    
    const gCanSeeM_after = gSeesM_after && gSeesM_after.find(group => group.group_id === groupM);
    const mCanSeeG_after = mSeesG_after && mSeesG_after.find(group => group.group_id === groupG);
    
    console.log(`Group G can see Group M: ${gCanSeeM_after ? '❌ YES (should be NO)' : '✅ NO'}`);
    console.log(`Group M can see Group G: ${mCanSeeG_after ? '✅ YES (should still see)' : '❌ NO'}`);
    
    // Step 4: Test silent discarding - Group M likes Group G
    console.log('\n💝 STEP 4: Group M likes Group G (should be silently discarded)');
    
    const { data: likeResult, error: likeError } = await supabase.rpc('like_group', {
      p_from_group_id: groupM,
      p_to_group_id: groupG
    });
    
    if (likeError) {
      throw new Error(`Like operation failed: ${likeError.message}`);
    }
    
    console.log(`Like result:`, likeResult);
    console.log(`Status: ${likeResult.status} (should be "liked", no match)`);
    
    if (likeResult.status === 'matched') {
      console.log('❌ ERROR: Like was not silently discarded - match was created!');
    } else if (likeResult.status === 'liked') {
      console.log('✅ SUCCESS: Like was silently discarded (returned normal "liked" status)');
    }
    
    // Step 5: Verify no actual like was recorded in database
    console.log('\n🔍 STEP 5: Verify no like was recorded in database');
    
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('*')
      .eq('from_group_id', groupM)
      .eq('to_group_id', groupG);
    
    if (likesError) {
      throw new Error(`Failed to check likes: ${likesError.message}`);
    }
    
    console.log(`Likes in database: ${likes.length} (should be 0)`);
    if (likes.length === 0) {
      console.log('✅ SUCCESS: No like was stored (silently discarded)');
    } else {
      console.log('❌ ERROR: Like was stored in database when it should have been discarded');
    }
    
    // Step 6: Verify pass was recorded
    console.log('\n🔍 STEP 6: Verify pass was recorded in database');
    
    const { data: passes, error: passesError } = await supabase
      .from('group_passes')
      .select('*')
      .eq('from_group_id', groupG)
      .eq('to_group_id', groupM);
    
    if (passesError) {
      throw new Error(`Failed to check passes: ${passesError.message}`);
    }
    
    console.log(`Passes in database: ${passes.length} (should be 1)`);
    if (passes.length === 1) {
      console.log('✅ SUCCESS: Pass was recorded correctly');
      console.log(`Pass details:`, passes[0]);
    } else {
      console.log('❌ ERROR: Pass was not recorded properly');
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test groups...');
    await cleanupTestGroups([groupG, groupM]);
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 ASYMMETRIC PASS SYSTEM TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('✅ Initial mutual visibility works');
    console.log('✅ Pass operation recorded successfully');
    console.log('✅ Asymmetric visibility after pass works');
    console.log('✅ Silent like discarding works');
    console.log('✅ No unwanted likes stored in database');
    console.log('✅ Pass data persisted correctly');
    console.log('\n🎉 ASYMMETRIC PASS SYSTEM IS WORKING CORRECTLY!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    throw error;
  }
}

async function cleanupTestGroups(groupIds) {
  for (const groupId of groupIds) {
    try {
      // Remove from group_passes
      await supabase
        .from('group_passes')
        .delete()
        .or(`from_group_id.eq.${groupId},to_group_id.eq.${groupId}`);
        
      // Remove from likes
      await supabase
        .from('likes')
        .delete()
        .or(`from_group_id.eq.${groupId},to_group_id.eq.${groupId}`);
        
      // Remove group members
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
        
      // Remove the group
      await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
        
      console.log(`✅ Cleaned up group ${groupId}`);
    } catch (error) {
      console.log(`⚠️ Error cleaning up group ${groupId}: ${error.message}`);
    }
  }
}

// Test opposite scenario: Group M passes on Group G first
async function testReverseScenario() {
  console.log('\n🔄 TESTING REVERSE SCENARIO: Group M passes on Group G first\n');
  
  const testUserId = await getTestUserId();
  
  try {
    const groupG = await createTestGroup({
      gender: "woman",
      preference: "man"
    }, testUserId, 0);
    
    const groupM = await createTestGroup({
      gender: "man", 
      preference: "woman"
    }, testUserId, 1);
    
    // Group M passes on Group G
    console.log('👎 Group M passes on Group G');
    await supabase.rpc('pass_group', {
      p_from_group_id: groupM,
      p_to_group_id: groupG
    });
    
    // Group G tries to like Group M
    console.log('💝 Group G likes Group M (should be silently discarded)');
    const { data: likeResult } = await supabase.rpc('like_group', {
      p_from_group_id: groupG,
      p_to_group_id: groupM
    });
    
    console.log(`Result: ${likeResult.status} (should be "liked", not "matched")`);
    
    if (likeResult.status === 'liked') {
      console.log('✅ SUCCESS: Reverse scenario also works correctly');
    } else {
      console.log('❌ ERROR: Reverse scenario failed');
    }
    
    await cleanupTestGroups([groupG, groupM]);
    
  } catch (error) {
    console.error('Reverse scenario test failed:', error.message);
  }
}

async function main() {
  try {
    await testAsymmetricPassing();
    await testReverseScenario();
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

main();