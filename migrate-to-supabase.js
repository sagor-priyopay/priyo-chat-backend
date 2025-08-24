#!/usr/bin/env node

/**
 * Supabase Migration Script for Priyo Chat Backend
 * This script helps migrate your existing database to Supabase
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Supabase Migration for Priyo Chat Backend\n');

// Step 1: Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please create one based on .env.example');
    console.log('📝 Update the following variables in your .env file:');
    console.log('   - DATABASE_URL (your Supabase connection string)');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_ANON_KEY');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
}

// Step 2: Install Supabase dependency
console.log('📦 Installing Supabase client...');
try {
    execSync('npm install @supabase/supabase-js@^2.39.3', { stdio: 'inherit' });
    console.log('✅ Supabase client installed successfully\n');
} catch (error) {
    console.log('❌ Failed to install Supabase client');
    process.exit(1);
}

// Step 3: Generate Prisma client
console.log('🔧 Generating Prisma client...');
try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully\n');
} catch (error) {
    console.log('❌ Failed to generate Prisma client');
    process.exit(1);
}

// Step 4: Push schema to Supabase
console.log('📊 Pushing database schema to Supabase...');
try {
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Database schema pushed to Supabase successfully\n');
} catch (error) {
    console.log('❌ Failed to push schema to Supabase');
    console.log('💡 Make sure your DATABASE_URL in .env is correct');
    process.exit(1);
}

// Step 5: Enable Row Level Security (RLS) for Supabase
console.log('🔒 Setting up Row Level Security policies...');
const rlsScript = `
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own data" ON users FOR ALL USING (auth.uid()::text = id);
CREATE POLICY "Authenticated users can view conversations they participate in" ON conversations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversation_users 
    WHERE conversation_users.conversation_id = conversations.id 
    AND conversation_users.user_id = auth.uid()::text
  )
);
CREATE POLICY "Users can view their conversation memberships" ON conversation_users FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "Users can view messages in their conversations" ON messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversation_users 
    WHERE conversation_users.conversation_id = messages.conversation_id 
    AND conversation_users.user_id = auth.uid()::text
  )
);
`;

fs.writeFileSync(path.join(__dirname, 'supabase-rls-setup.sql'), rlsScript);
console.log('📄 RLS setup script created: supabase-rls-setup.sql');
console.log('💡 Run this script in your Supabase SQL editor to enable security\n');

console.log('🎉 Migration completed successfully!');
console.log('\n📋 Next Steps:');
console.log('1. Go to your Supabase dashboard → SQL Editor');
console.log('2. Run the contents of supabase-rls-setup.sql');
console.log('3. Test your application with the new database');
console.log('4. Update your production environment variables');
console.log('5. Deploy to a platform that doesn\'t spin down (Vercel, Netlify, etc.)\n');

console.log('🔗 Useful Supabase Features for your chat app:');
console.log('- Real-time subscriptions for live chat');
console.log('- Built-in authentication');
console.log('- Edge functions for serverless API');
console.log('- File storage for attachments\n');
