-- Create admin user: sagor.khan@priyo.net
-- Password: Priyopay123456 (hashed with bcrypt)

INSERT INTO "User" (
  id,
  email,
  username,
  password,
  role,
  "isOnline",
  verified,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'sagor.khan@priyo.net',
  'sagor.khan',
  '$2a$12$8K7qGxrJZQXQX8K7qGxrJZQXQX8K7qGxrJZQXQX8K7qGxrJZQXQX8O', -- This is a placeholder, use actual bcrypt hash
  'ADMIN',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  password = '$2a$12$8K7qGxrJZQXQX8K7qGxrJZQXQX8K7qGxrJZQXQX8K7qGxrJZQXQX8O',
  "updatedAt" = NOW();

-- Note: Replace the password hash above with the actual bcrypt hash of 'Priyopay123456'
