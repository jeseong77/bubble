// Check users table structure
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

console.log('Supabase URL:', supabaseUrl);
console.log('Key length:', supabaseKey?.length);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('🔍 Checking users table...\n');

  try {
    // Try to fetch one user to see the structure
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error accessing users table:', error);
      return;
    }

    console.log('✅ Users table accessible!');

    if (data && data.length > 0) {
      console.log('\n📋 Current users table structure:');
      console.log('Columns:', Object.keys(data[0]).join(', '));
      console.log('\n🔍 Checking for push token column...');

      const hasExpoPushToken = Object.keys(data[0]).includes('expo_push_token');
      const hasPushNotificationsEnabled = Object.keys(data[0]).includes('push_notifications_enabled');

      if (hasExpoPushToken) {
        console.log('✅ expo_push_token column EXISTS');
      } else {
        console.log('❌ expo_push_token column DOES NOT EXIST');
      }

      if (hasPushNotificationsEnabled) {
        console.log('✅ push_notifications_enabled column EXISTS');
      } else {
        console.log('❌ push_notifications_enabled column DOES NOT EXIST');
      }
    } else {
      console.log('ℹ️  Users table is empty, cannot check structure');
      console.log('ℹ️  Will try to insert a test row to check constraints...');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsersTable().then(() => {
  console.log('\n✅ Check complete!');
  process.exit(0);
});
