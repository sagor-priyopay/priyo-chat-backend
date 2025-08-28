import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: 'USER';
    // Optional fields for backward compatibility and widget support
    userId?: string;
    visitorId?: string;
  };
  file?: any;
  body: any;
  params: any;
  query: any;
  headers: any;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: 'USER';
  visitorId?: string;
  isWidget?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  role?: 'USER';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateConversationRequest {
  participantIds: string[];
  name?: string;
  type: 'DIRECT' | 'GROUP';
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'IMAGE';
}

export interface SocketUser {
  id: string;
  email: string;
  username: string;
  role: 'USER';
  socketId: string;
  isWidget?: boolean;
}

export interface TypingData {
  conversationId: string;
  userId: string;
  username: string;
}

export interface MessageData {
  id: string;
  content: string;
  type: 'TEXT' | 'FILE' | 'IMAGE';
  fileUrl?: string;
  fileName?: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  createdAt: Date;
}

export interface MessageDeliveredData {
  messageId: string;
  conversationId: string;
  deliveredTo: string[];
}

export interface MessageReadData {
  messageId: string;
  conversationId: string;
  readBy: string;
  readAt: Date;
}
