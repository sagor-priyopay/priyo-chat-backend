async function testLogin() {
  const fetch = (await import('node-fetch')).default;
  try {
    console.log('🔍 Testing login endpoint...');
    
    const response = await fetch('https://priyo-chat-64wg.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'agent@priyo.com',
        password: 'agent123'
      })
    });

    console.log(`📡 Response status: ${response.status}`);
    
    const data = await response.json();
    console.log('📄 Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Login successful!');
      console.log(`   User: ${data.user.username}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   Token: ${data.accessToken ? 'Present' : 'Missing'}`);
    } else {
      console.log('❌ Login failed');
      console.log(`   Error: ${data.error || data.message}`);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testLogin();
