async function debugAuth() {
  const fetch = (await import('node-fetch')).default;
  
  try {
    console.log('🔍 Testing authentication flow...');
    
    // Step 1: Login
    console.log('\n1. Testing login...');
    const loginResponse = await fetch('https://priyo-chat-64wg.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'agent@priyo.com',
        password: 'agent123'
      })
    });

    const loginData = await loginResponse.json();
    console.log(`   Status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData.error);
      return;
    }
    
    console.log('✅ Login successful');
    console.log(`   User: ${loginData.user.username}`);
    console.log(`   Role: ${loginData.user.role}`);
    
    const accessToken = loginData.tokens.accessToken;
    console.log(`   Token length: ${accessToken.length}`);
    
    // Step 2: Test /me endpoint
    console.log('\n2. Testing /me endpoint...');
    const meResponse = await fetch('https://priyo-chat-64wg.onrender.com/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${meResponse.status}`);
    
    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('✅ /me endpoint working');
      console.log(`   User: ${meData.user.username}`);
      console.log(`   Role: ${meData.user.role}`);
    } else {
      const errorData = await meResponse.json();
      console.log('❌ /me endpoint failed:', errorData.error);
    }
    
    // Step 3: Test agent dashboard endpoint
    console.log('\n3. Testing agent dashboard endpoint...');
    const dashboardResponse = await fetch('https://priyo-chat-64wg.onrender.com/api/agent-dashboard/conversations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${dashboardResponse.status}`);
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ Dashboard endpoint working');
      console.log(`   Conversations: ${dashboardData.conversations?.length || 0}`);
    } else {
      const errorData = await dashboardResponse.json();
      console.log('❌ Dashboard endpoint failed:', errorData.error);
    }
    
    // Step 4: Check token expiration
    console.log('\n4. Checking token details...');
    const tokenParts = accessToken.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = payload.exp - now;
        
        console.log(`   Token expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 60)} minutes)`);
        console.log(`   Issued at: ${new Date(payload.iat * 1000).toISOString()}`);
        console.log(`   Expires at: ${new Date(payload.exp * 1000).toISOString()}`);
        
        if (expiresIn <= 0) {
          console.log('❌ Token is expired!');
        } else if (expiresIn < 300) {
          console.log('⚠️  Token expires soon (< 5 minutes)');
        } else {
          console.log('✅ Token is valid');
        }
      } catch (e) {
        console.log('❌ Could not decode token payload');
      }
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

debugAuth();
