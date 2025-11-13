// Test Unified Gender System
// Run with: node scripts/test-unified-gender-system.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test all 4 unified gender values
const UNIFIED_GENDERS = ['man', 'woman', 'nonbinary', 'everyone'];

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

async function testUnifiedGenderValues() {
  console.log('🧪 UNIFIED GENDER SYSTEM TEST\n');
  console.log('Testing all combinations of: man, woman, nonbinary, everyone\n');
  
  const testUserId = await getTestUserId();
  console.log(`Using test user ID: ${testUserId}\n`);
  
  let passedTests = 0;
  let totalTests = 0;
  const createdGroups = [];
  
  try {
    // Test 1: Create groups with all gender combinations
    console.log('📋 TEST 1: Create groups with all gender/preference combinations');
    
    for (const gender of UNIFIED_GENDERS) {
      for (const preference of UNIFIED_GENDERS) {
        console.log(`\nCreating group: ${gender} seeking ${preference}`);
        
        try {
          // First update the test user to have this gender
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              gender: gender,
              preferred_gender: preference 
            })
            .eq('id', testUserId);
          
          if (updateError) {
            throw new Error(`Failed to update user gender: ${updateError.message}`);
          }
          
          // Create the group
          const { data: groupId, error: createError } = await supabase.rpc('create_group', {
            p_creator_id: testUserId,
            p_max_size: 2,
            p_group_name: `Test ${gender}-${preference}`,
            p_preferred_gender: preference
          });

          if (createError) {
            throw new Error(`Failed to create group: ${createError.message}`);
          }

          console.log(`✅ Successfully created group ${groupId}`);
          createdGroups.push(groupId);
          passedTests++;
          
        } catch (error) {
          console.log(`❌ Failed: ${error.message}`);
        }
        
        totalTests++;
      }
    }
    
    // Test 2: Verify exact opposite matching works
    console.log('\n📋 TEST 2: Verify exact opposite matching logic');
    
    // Create specific test groups
    await updateUserGender(testUserId, 'man');
    const manGroup = await createTestGroup(testUserId, 'man', 'woman', 'Man seeking Woman');
    
    await updateUserGender(testUserId, 'woman');  
    const womanGroup = await createTestGroup(testUserId, 'woman', 'man', 'Woman seeking Man');
    
    await updateUserGender(testUserId, 'nonbinary');
    const nonbinaryGroup = await createTestGroup(testUserId, 'nonbinary', 'everyone', 'Nonbinary seeking Everyone');
    
    await updateUserGender(testUserId, 'everyone');
    const everyoneGroup = await createTestGroup(testUserId, 'everyone', 'nonbinary', 'Everyone seeking Nonbinary');
    
    createdGroups.push(manGroup, womanGroup, nonbinaryGroup, everyoneGroup);
    
    // Set all groups to 'full' status
    for (const groupId of [manGroup, womanGroup, nonbinaryGroup, everyoneGroup]) {
      await supabase
        .from('groups')
        .update({ status: 'full' })
        .eq('id', groupId);
    }
    
    // Test matching: Man should see Woman
    const { data: manMatches } = await supabase.rpc('find_matching_group', {
      p_group_id: manGroup,
      p_limit: 10,
      p_offset: 0
    });
    
    const manSeesWoman = manMatches && manMatches.find(g => g.group_id === womanGroup);
    console.log(`Man seeking Woman sees Woman seeking Man: ${manSeesWoman ? '✅ YES' : '❌ NO'}`);
    if (manSeesWoman) passedTests++;
    totalTests++;
    
    // Test matching: Nonbinary should see Everyone
    const { data: nonbinaryMatches } = await supabase.rpc('find_matching_group', {
      p_group_id: nonbinaryGroup,
      p_limit: 10,
      p_offset: 0
    });
    
    const nonbinarySeesEveryone = nonbinaryMatches && nonbinaryMatches.find(g => g.group_id === everyoneGroup);
    console.log(`Nonbinary seeking Everyone sees Everyone seeking Nonbinary: ${nonbinarySeesEveryone ? '✅ YES' : '❌ NO'}`);
    if (nonbinarySeesEveryone) passedTests++;
    totalTests++;
    
    // Test matching: Man should NOT see Nonbinary (wrong preference)
    const manSeesNonbinary = manMatches && manMatches.find(g => g.group_id === nonbinaryGroup);
    console.log(`Man seeking Woman does NOT see Nonbinary seeking Everyone: ${!manSeesNonbinary ? '✅ YES' : '❌ NO'}`);
    if (!manSeesNonbinary) passedTests++;
    totalTests++;
    
    // Test 3: Test asymmetric pass system with unified values
    console.log('\n📋 TEST 3: Test asymmetric pass system');
    
    // Man passes on Woman
    const { data: passResult, error: passError } = await supabase.rpc('pass_group', {
      p_from_group_id: manGroup,
      p_to_group_id: womanGroup
    });
    
    if (passError) {
      console.log(`❌ Pass operation failed: ${passError.message}`);
    } else {
      console.log(`✅ Pass operation succeeded: ${passResult}`);
      passedTests++;
    }
    totalTests++;
    
    // Verify Man no longer sees Woman
    const { data: manMatchesAfterPass } = await supabase.rpc('find_matching_group', {
      p_group_id: manGroup,
      p_limit: 10,
      p_offset: 0
    });
    
    const manSeesWomanAfterPass = manMatchesAfterPass && manMatchesAfterPass.find(g => g.group_id === womanGroup);
    console.log(`After pass, Man no longer sees Woman: ${!manSeesWomanAfterPass ? '✅ YES' : '❌ NO'}`);
    if (!manSeesWomanAfterPass) passedTests++;
    totalTests++;
    
    // Verify Woman still sees Man (asymmetric)
    const { data: womanMatches } = await supabase.rpc('find_matching_group', {
      p_group_id: womanGroup,
      p_limit: 10,
      p_offset: 0
    });
    
    const womanSeesMan = womanMatches && womanMatches.find(g => g.group_id === manGroup);
    console.log(`Woman still sees Man (asymmetric): ${womanSeesMan ? '✅ YES' : '❌ NO'}`);
    if (womanSeesMan) passedTests++;
    totalTests++;
    
    // Test silent like discarding
    const { data: likeResult } = await supabase.rpc('like_group', {
      p_from_group_id: womanGroup,
      p_to_group_id: manGroup
    });
    
    console.log(`Woman likes Man after Man passed: Status = ${likeResult.status} (should be "liked", not "matched")`);
    if (likeResult.status === 'liked') passedTests++;
    totalTests++;
    
    // Cleanup
    await cleanupTestGroups(createdGroups);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 UNIFIED GENDER SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed tests: ${passedTests}`);
    console.log(`Failed tests: ${totalTests - passedTests}`);
    console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! The unified gender system is working correctly.');
      console.log('✅ All 4 gender values work: man, woman, nonbinary, everyone');
      console.log('✅ Exact opposite matching logic works');
      console.log('✅ Asymmetric pass system works');
      console.log('✅ Silent like discarding works');
    } else {
      console.log(`\n❌ ${totalTests - passedTests} tests failed. Please check the implementation.`);
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    await cleanupTestGroups(createdGroups);
  }
}

async function updateUserGender(userId, gender) {
  const { error } = await supabase
    .from('users')
    .update({ gender: gender })
    .eq('id', userId);
  
  if (error) {
    throw new Error(`Failed to update user gender: ${error.message}`);
  }
}

async function createTestGroup(userId, gender, preference, name) {
  const { data: groupId, error } = await supabase.rpc('create_group', {
    p_creator_id: userId,
    p_max_size: 2,
    p_group_name: name,
    p_preferred_gender: preference
  });

  if (error) {
    throw new Error(`Failed to create group: ${error.message}`);
  }

  return groupId;
}

async function cleanupTestGroups(groupIds) {
  console.log('\n🧹 Cleaning up test groups...');
  
  for (const groupId of groupIds) {
    try {
      await supabase.from('group_passes').delete().or(`from_group_id.eq.${groupId},to_group_id.eq.${groupId}`);
      await supabase.from('likes').delete().or(`from_group_id.eq.${groupId},to_group_id.eq.${groupId}`);
      await supabase.from('group_members').delete().eq('group_id', groupId);
      await supabase.from('groups').delete().eq('id', groupId);
      console.log(`✅ Cleaned up group ${groupId}`);
    } catch (error) {
      console.log(`⚠️ Error cleaning up group ${groupId}: ${error.message}`);
    }
  }
}

async function main() {
  try {
    await testUnifiedGenderValues();
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

main();