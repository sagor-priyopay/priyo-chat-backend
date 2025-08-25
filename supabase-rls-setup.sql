
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
