import jwt from 'jsonwebtoken';
import { JWTPayload, TokenPair } from '@/types';

export class JWTService {
  private accessSecret: string;
  private refreshSecret: string;
  private accessExpiresIn: string;
  private refreshExpiresIn: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  generateTokenPair(payload: JWTPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn as any,
    });

    const refreshToken = jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.accessSecret) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  getRefreshTokenExpiry(): Date {
    const expiryTime = this.refreshExpiresIn;
    const match = expiryTime.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      throw new Error('Invalid refresh token expiry format');
    }

    const [, value, unit] = match;
    const now = new Date();
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return new Date(now.getTime() + numValue * 1000);
      case 'm':
        return new Date(now.getTime() + numValue * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + numValue * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + numValue * 24 * 60 * 60 * 1000);
      default:
        throw new Error('Invalid time unit');
    }
  }
}
