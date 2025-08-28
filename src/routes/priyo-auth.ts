import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = DatabaseService.getInstance();

// Interface for Priyo Pay user data
interface PriyoPayUser {
  id: string;
  email: string;
  username: string;
  phone?: string;
  verified: boolean;
  // Add other fields as needed from Priyo Pay API
}

// Customer authentication with Priyo Pay account
router.post('/customer/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { priyoPayToken, priyoPayUserId } = req.body;

    if (!priyoPayToken || !priyoPayUserId) {
      res.status(400).json({
        success: false,
        message: 'Priyo Pay token and user ID are required'
      });
      return;
    }

    // TODO: Replace with actual Priyo Pay API verification
    // This is a placeholder - you'll need to integrate with your actual Priyo Pay API
    const priyoPayUser = await verifyPriyoPayToken(priyoPayToken, priyoPayUserId);
    
    if (!priyoPayUser) {
      res.status(401).json({
        success: false,
        message: 'Invalid Priyo Pay credentials'
      });
      return;
    }

    // Check if user exists in our system
    let user = await prisma.user.findUnique({
      where: { email: priyoPayUser.email }
    });

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: priyoPayUser.email,
          username: priyoPayUser.username,
          password: await bcrypt.hash(Math.random().toString(36), 10), // Random password since they use Priyo Pay auth
          role: 'CUSTOMER',
          isOnline: true,
            verified: priyoPayUser.verified
        }
      });
    } else {
      // Update user status and last seen
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
          }
      });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: 'USER',
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: 'USER',
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json({
      success: true,
      message: 'Customer authenticated successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: 'USER',
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('Priyo Pay customer auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// Agent login (separate from customer auth)
router.post('/agent/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Find agent user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }


    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date()
      }
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: 'USER',
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: 'USER',
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json({
      success: true,
      message: 'Agent authenticated successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Agent login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Create admin account (super admin only)
router.post('/admin/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, adminKey } = req.body;

    // Verify admin key (you should set this in environment variables)
    const expectedAdminKey = process.env.ADMIN_CREATE_KEY || 'your-secret-admin-key';
    if (adminKey !== expectedAdminKey) {
      res.status(403).json({
        success: false,
        message: 'Invalid admin key'
      });
      return;
    }

    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'Email, username, and password are required'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: 'USER',
        isOnline: false,
        verified: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin account'
    });
  }
});

// Create agent account (admin only)
router.post('/agent/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, adminKey } = req.body;

    // Verify admin key (you should set this in environment variables)
    const expectedAdminKey = process.env.ADMIN_CREATE_KEY || 'your-secret-admin-key';
    if (adminKey !== expectedAdminKey) {
      res.status(403).json({
        success: false,
        message: 'Invalid admin key'
      });
      return;
    }

    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'Email, username, and password are required'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create agent user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: 'USER',
        isOnline: false,
        verified: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Agent account created successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Agent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent account'
    });
  }
});

// Placeholder function for Priyo Pay API verification
// Replace this with actual Priyo Pay API integration
async function verifyPriyoPayToken(token: string, userId: string): Promise<PriyoPayUser | null> {
  try {
    // TODO: Implement actual Priyo Pay API call
    // Example:
    // const response = await fetch('https://api.priyo.com/verify', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ userId })
    // });
    // 
    // if (!response.ok) {
    //   return null;
    // }
    // 
    // const userData = await response.json();
    // return userData;

    // For now, return mock data for testing
    // Remove this when implementing actual API
    if (token === 'mock-priyo-token' && userId) {
      return {
        id: userId,
        email: `user${userId}@priyo.com`,
        username: `PriyoUser${userId}`,
        verified: true
      };
    }

    return null;
  } catch (error) {
    console.error('Priyo Pay API verification error:', error);
    return null;
  }
}

export default router;
