import { describe, it, expect, vi, beforeEach } from 'vitest';
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import type { Store, Options } from 'express-rate-limit';

// A compliant in-memory store for testing express-rate-limit v8+
class MemoryStore implements Store {
  hits: Record<string, number> = {};
  resetTime: Date | undefined = undefined;
  private windowMs = 60 * 1000; // Default window

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    const now = Date.now();
    if (!this.resetTime || this.resetTime.getTime() <= now) {
      this.resetTime = new Date(now + this.windowMs);
      this.hits = {}; // Reset hits on window expiry
    }

    this.hits[key] = (this.hits[key] || 0) + 1;
    return { totalHits: this.hits[key], resetTime: this.resetTime };
  }

  async decrement(key: string): Promise<void> {
    if (this.hits[key]) {
      this.hits[key]--;
    }
  }

  async resetKey(key: string): Promise<void> {
    delete this.hits[key];
  }

  async resetAll(): Promise<void> {
    this.hits = {};
    this.resetTime = undefined;
  }
}

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    nextFunction = vi.fn();

    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
      app: {
        get: vi.fn(),
      } as any,
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
  });

  const createLimiter = (max: number) => {
    const options = {
      windowMs: 60 * 1000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      store,
    };
    store.init(options as unknown as Options);
    return rateLimit(options);
  };

  it('allows requests within rate limit', async () => {
    const limiter = createLimiter(5);
    await limiter(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('blocks requests after exceeding limit', async () => {
    const limiter = createLimiter(5);

    // Make 5 successful requests
    for (let i = 0; i < 5; i++) {
      await limiter(mockRequest as Request, mockResponse as Response, vi.fn());
    }

    // The 6th request should be blocked
    await limiter(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.send).toHaveBeenCalledWith('Too many requests, please try again later.');
  });

  it('sets rate limit headers on the response', async () => {
    const limiter = createLimiter(5);
    await limiter(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '5');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '4');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Reset', expect.any(String));
  });
});
