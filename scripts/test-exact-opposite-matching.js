// Test Exact Opposite Matching System
// Run with: node scripts/test-exact-opposite-matching.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test scenarios for exact opposite matching
const testScenarios = [
  {
    name: "Man seeking Woman ↔ Woman seeking Man",
    group1: { gender: "man", preference: "woman" },
    group2: { gender: "woman", preference: "man" },
    shouldMatch: true
  },
  {
    name: "Man seeking Nonbinary ↔ Nonbinary seeking Man",
    group1: { gender: "man", preference: "nonbinary" },
    group2: { gender: "nonbinary", preference: "man" },
    shouldMatch: true
  },
  {
    name: "Man seeking Everyone ↔ Everyone seeking Man",
    group1: { gender: "man", preference: "everyone" },
    group2: { gender: "everyone", preference: "man" },
    shouldMatch: true
  },
  {
    name: "Woman seeking Nonbinary ↔ Nonbinary seeking Woman",
    group1: { gender: "woman", preference: "nonbinary" },
    group2: { gender: "nonbinary", preference: "woman" },
    shouldMatch: true
  },
  {
    name: "Woman seeking Everyone ↔ Everyone seeking Woman",
    group1: { gender: "woman", preference: "everyone" },
    group2: { gender: "everyone", preference: "woman" },
    shouldMatch: true
  },
  {
    name: "Nonbinary seeking Everyone ↔ Everyone seeking Nonbinary",
    group1: { gender: "nonbinary", preference: "everyone" },
    group2: { gender: "everyone", preference: "nonbinary" },
    shouldMatch: true
  },
  // Non-matching scenarios
  {
    name: "Man seeking Woman ↔ Woman seeking Woman (should NOT match)",
    group1: { gender: "man", preference: "woman" },
    group2: { gender: "woman", preference: "woman" },
    shouldMatch: false
  },
  {
    name: "Man seeking Man ↔ Man seeking Man (should NOT match)",
    group1: { gender: "man", preference: "man" },
    group2: { gender: "man", preference: "man" },
    shouldMatch: false
  },
  {
    name: "Woman seeking Everyone ↔ Man seeking Woman (should NOT match)",
    group1: { gender: "woman", preference: "everyone" },
    group2: { gender: "man", preference: "woman" },
    shouldMatch: false
  }
];

// Get first test user ID for group creation
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
      group_gender: groupConfig.gender  // Ensure group_gender is set correctly
    })
    .eq('id', groupId);

  if (updateError) {
    throw new Error(`Failed to update group status: ${updateError.message}`);
  }

  console.log(`✅ Created group ${groupId} (${groupConfig.gender} → ${groupConfig.preference})`);
  return groupId;
}

async function testMatching(group1Id, group2Id, scenario) {
  console.log(`\n🔍 Testing: ${scenario.name}`);
  
  // Use find_matching_group RPC to see if group2 appears for group1
  const { data: matches, error } = await supabase.rpc('find_matching_group', {
    p_group_id: group1Id,
    p_limit: 10,
    p_offset: 0
  });

  if (error) {
    console.log(`❌ RPC Error: ${error.message}`);
    return false;
  }

  const group2InResults = matches && matches.find(match => match.group_id === group2Id);
  const foundMatch = !!group2InResults;

  if (foundMatch === scenario.shouldMatch) {
    console.log(`✅ CORRECT: ${foundMatch ? 'Match found' : 'No match found'} as expected`);
    if (foundMatch) {
      console.log(`   Match score: ${group2InResults.match_score}`);
    }
    return true;
  } else {
    console.log(`❌ INCORRECT: Expected ${scenario.shouldMatch ? 'match' : 'no match'}, got ${foundMatch ? 'match' : 'no match'}`);
    if (foundMatch) {
      console.log(`   Unexpected match details:`, group2InResults);
    }
    return false;
  }
}

async function cleanupTestGroups(groupIds) {
  console.log('\n🧹 Cleaning up test groups...');
  
  for (const groupId of groupIds) {
    try {
      // Remove group members first
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

async function runMatchingTests() {
  console.log('🧪 EXACT OPPOSITE MATCHING SYSTEM TEST\n');
  console.log('Testing new gender preference system: man, woman, nonbinary, everyone\n');
  
  const testUserId = await getTestUserId();
  console.log(`Using test user ID: ${testUserId}\n`);
  
  let passedTests = 0;
  let totalTests = 0;
  const createdGroups = [];
  
  try {
    for (const scenario of testScenarios) {
      console.log(`\n📋 SCENARIO: ${scenario.name}`);
      console.log(`Group 1: ${scenario.group1.gender} → ${scenario.group1.preference}`);
      console.log(`Group 2: ${scenario.group2.gender} → ${scenario.group2.preference}`);
      console.log(`Expected: ${scenario.shouldMatch ? 'MATCH' : 'NO MATCH'}`);
      
      // Create two test groups
      const group1Id = await createTestGroup(scenario.group1, testUserId, 0);
      const group2Id = await createTestGroup(scenario.group2, testUserId, 1);
      
      createdGroups.push(group1Id, group2Id);
      
      // Test matching in both directions
      const test1Pass = await testMatching(group1Id, group2Id, scenario);
      const test2Pass = await testMatching(group2Id, group1Id, {
        ...scenario,
        name: `${scenario.name} (reverse direction)`
      });
      
      if (test1Pass && test2Pass) {
        passedTests += 1;
        console.log(`🎉 SCENARIO PASSED`);
      } else {
        console.log(`💥 SCENARIO FAILED`);
      }
      
      totalTests += 1;
      
      // Clean up these groups before next test
      await cleanupTestGroups([group1Id, group2Id]);
      createdGroups.length = 0; // Clear the array
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total scenarios tested: ${totalTests}`);
    console.log(`Scenarios passed: ${passedTests}`);
    console.log(`Scenarios failed: ${totalTests - passedTests}`);
    console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! The exact opposite matching system is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the matching logic in find_matching_group RPC function.');
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    await cleanupTestGroups(createdGroups);
  }
}

// Verification function to check the database schema supports new gender values
async function verifyDatabaseSchema() {
  console.log('🔧 Verifying database schema supports new gender values...\n');
  
  try {
    // Check if we can create a group with new gender values
    const testUserId = await getTestUserId();
    
    const testGroup = await createTestGroup({
      gender: "everyone",
      preference: "nonbinary"
    }, testUserId, 999);
    
    console.log('✅ Database supports new gender values');
    
    // Clean up
    await cleanupTestGroups([testGroup]);
    
    return true;
  } catch (error) {
    console.log('❌ Database schema issue:', error.message);
    console.log('\n💡 You may need to update the create_group RPC function in Supabase');
    return false;
  }
}

async function main() {
  try {
    const schemaOk = await verifyDatabaseSchema();
    if (!schemaOk) {
      return;
    }
    
    await runMatchingTests();
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

main();