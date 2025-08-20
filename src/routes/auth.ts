import { Router, Response } from 'express';
import { AuthenticatedRequest, LoginRequest, RegisterRequest, RefreshTokenRequest } from '@/types';
import { DatabaseService } from '@/services/database';
import { JWTService } from '@/utils/jwt';
import { PasswordService } from '@/utils/password';
import { validateRequest } from '@/middleware/validation';
import { authValidation } from '@/utils/validation';
import { authenticateToken } from '@/middleware/auth';

const router = Router();
const prisma = DatabaseService.getInstance();
const jwtService = new JWTService();

// Register
router.post('/register', validateRequest(authValidation.register), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, username, password, role = 'CUSTOMER' }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email or username already exists' });
      return;
    }

    // Hash password and create user
    const hashedPassword = await PasswordService.hash(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role as any,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: jwtService.getRefreshTokenExpiry(),
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', validateRequest(authValidation.login), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await PasswordService.compare(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Generate tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role as any,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: jwtService.getRefreshTokenExpiry(),
      },
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
      tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', validateRequest(authValidation.refreshToken), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(403).json({ error: 'Invalid refresh token' });
      return;
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(403).json({ error: 'Refresh token expired or not found' });
      return;
    }

    // Generate new tokens
    const tokens = jwtService.generateTokenPair({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      username: storedToken.user.username,
      role: storedToken.user.role as any,
    });

    // Remove old refresh token and store new one
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.user.id,
        expiresAt: jwtService.getRefreshTokenExpiry(),
      },
    });

    res.json({
      message: 'Tokens refreshed successfully',
      tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Update user offline status
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    // Remove all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
