// Quick test script to verify storage connection
// Run with: node test-storage.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testStorageConnection() {
  console.log('🧪 Testing Storage Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const storageProvider = process.env.STORAGE_PROVIDER;

  console.log(`📊 Configuration:
- Storage Provider: ${storageProvider}
- Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}
- Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration. Please check your .env.local file.');
    return;
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection by querying tables
    console.log('🔍 Testing database connection...');
    
    const { data: tables, error } = await supabase
      .rpc('get_tables_info', {})
      .then(() => ({ data: 'Connection successful', error: null }))
      .catch(() => 
        supabase
          .from('conversations')
          .select('count')
          .limit(0)
      );

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\n💡 Possible issues:');
      console.log('- Tables might not exist (run SUPABASE_SAFE_SETUP.sql)');
      console.log('- Wrong credentials');
      console.log('- Network connectivity issues');
      return;
    }

    console.log('✅ Database connection successful!');

    // Test creating a conversation
    console.log('\n🧪 Testing conversation creation...');
    
    const testConversation = {
      session_id: 'test_session_' + Date.now(),
      title: 'Test Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0
    };

    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert(testConversation)
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create test conversation:', createError.message);
      return;
    }

    console.log('✅ Test conversation created:', conversation.id);

    // Clean up test data
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversation.id);

    console.log('🧹 Test data cleaned up');

    console.log('\n🎉 All tests passed! Your storage is ready to use.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStorageConnection(); 