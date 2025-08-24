// const fetch = require('node-fetch');

async function createAdmin() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/admin/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sagor.khan@priyo.net',
        username: 'sagor.khan',
        password: 'Priyopay123456',
        adminKey: 'your-admin-secret-key-here' // Use the key from .env.example
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin user created successfully!');
      console.log('Email:', result.user.email);
      console.log('Username:', result.user.username);
      console.log('Role:', result.user.role);
      console.log('ID:', result.user.id);
    } else {
      console.error('❌ Failed to create admin user:', result.message);
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.log('\n💡 Make sure the server is running on port 3000');
    console.log('Run: npm run dev');
  }
}

createAdmin();
