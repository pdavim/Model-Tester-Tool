import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { authenticate } from '../authMiddleware';
import { apiRateLimiter } from '../rateLimiter';
import { requestIdMiddleware, getRequestId } from '../requestId';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/env';
import { RateLimiterService } from '../../../services/RateLimiterService';

vi.mock('../../../infra/Logging');
vi.mock('../../../services/RateLimiterService');

describe('Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction = vi.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
      get: vi.fn(),
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  describe('requestIdMiddleware', () => {
    it('should assign a request ID if not present', () => {
      requestIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use existing X-Request-Id header', () => {
      mockRequest.get = vi.fn().mockReturnValue('existing-id');
      requestIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'existing-id');
    });
  });

  describe('authenticate', () => {
    it('should return 401 if Authorization header is missing', () => {
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 401 if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should proceed if token is valid', () => {
      const token = jwt.sign({ sub: 'user-123', scopes: ['chat:write'] }, config.JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({
        id: 'user-123',
        scopes: ['chat:write'],
      });
    });
  });

  describe('apiRateLimiter', () => {
    it('should block request if rate limit exceeded', async () => {
      vi.mocked(RateLimiterService.checkLimit).mockResolvedValue({
        success: false,
        remaining: 0,
        retryAfter: 60,
      });

      await apiRateLimiter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });

    it('should allow request if within limits', async () => {
      vi.mocked(RateLimiterService.checkLimit).mockResolvedValue({
        success: true,
        remaining: 10,
        retryAfter: 0,
      });

      await apiRateLimiter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '10');
    });
  });
});
