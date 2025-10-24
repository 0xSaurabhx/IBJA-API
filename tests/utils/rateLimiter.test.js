// Comprehensive tests for rate limiter configuration and middleware functionality
const rateLimiter = require("../../api/_rateLimiter");

describe("Rate Limiter Module", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      headers: {},
      socket: {},
    };
    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Mock Date.now to have consistent timestamps
    jest.spyOn(Date, "now").mockReturnValue(1640000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Configuration and Exports", () => {
    it("should export the required objects", () => {
      expect(rateLimiter.generalLimiter).toBeDefined();
      expect(rateLimiter.dataHeavyLimiter).toBeDefined();
      expect(rateLimiter.utilityLimiter).toBeDefined();
      expect(rateLimiter.applyRateLimit).toBeDefined();
    });

    it("should have correct configuration for limiters", () => {
      expect(rateLimiter.generalLimiter.points).toBe(100);
      expect(rateLimiter.generalLimiter.duration).toBe(900); // 15 minutes

      expect(rateLimiter.dataHeavyLimiter.points).toBe(20);
      expect(rateLimiter.dataHeavyLimiter.duration).toBe(900);

      expect(rateLimiter.utilityLimiter.points).toBe(50);
      expect(rateLimiter.utilityLimiter.duration).toBe(900);
    });

    it("should export applyRateLimit as a function", () => {
      expect(typeof rateLimiter.applyRateLimit).toBe("function");
    });
  });

  describe("Rate Limiter Middleware", () => {
    it("should handle successful rate limiting with x-forwarded-for header", async () => {
      // Mock successful consumption
      const mockConsume = jest.fn().mockResolvedValue({
        remainingPoints: 99,
        msBeforeNext: 15000,
      });

      const mockLimiter = {
        points: 100,
        consume: mockConsume,
      };

      mockReq.headers["x-forwarded-for"] = "192.168.1.1, 10.0.0.1";

      const middleware = rateLimiter.applyRateLimit(mockLimiter);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockConsume).toHaveBeenCalledWith("192.168.1.1");
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 100);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        99
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Reset",
        1640000015
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle successful rate limiting with socket remoteAddress", async () => {
      // Mock successful consumption
      const mockConsume = jest.fn().mockResolvedValue({
        remainingPoints: 19,
        msBeforeNext: 30000,
      });

      const mockLimiter = {
        points: 20,
        consume: mockConsume,
      };

      mockReq.socket.remoteAddress = "127.0.0.1";

      const middleware = rateLimiter.applyRateLimit(mockLimiter);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockConsume).toHaveBeenCalledWith("127.0.0.1");
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 20);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        19
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Reset",
        1640000030
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 400 when no IP address can be determined", async () => {
      const mockLimiter = {
        points: 100,
        consume: jest.fn(),
      };

      // No IP information provided
      const middleware = rateLimiter.applyRateLimit(mockLimiter);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Could not identify client IP",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 429 when rate limit is exceeded", async () => {
      // Mock rate limit exceeded
      const mockConsume = jest.fn().mockRejectedValue({
        msBeforeNext: 45000,
      });

      const mockLimiter = {
        points: 50,
        consume: mockConsume,
      };

      mockReq.headers["x-forwarded-for"] = "192.168.1.100";

      const middleware = rateLimiter.applyRateLimit(mockLimiter);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockConsume).toHaveBeenCalledWith("192.168.1.100");
      expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", 45);
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 50);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        0
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Reset",
        1640000045
      );
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
        retryAfter: 45,
        limit: 50,
        remaining: 0,
        resetTime: new Date(1640000045000).toISOString(),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle x-forwarded-for header with single IP", async () => {
      // Mock successful consumption
      const mockConsume = jest.fn().mockResolvedValue({
        remainingPoints: 49,
        msBeforeNext: 10000,
      });

      const mockLimiter = {
        points: 50,
        consume: mockConsume,
      };

      mockReq.headers["x-forwarded-for"] = "203.0.113.1";

      const middleware = rateLimiter.applyRateLimit(mockLimiter);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockConsume).toHaveBeenCalledWith("203.0.113.1");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should use the actual rate limiters from the module", async () => {
      // Test with actual generalLimiter
      mockReq.headers["x-forwarded-for"] = "10.0.0.1";

      const middleware = rateLimiter.applyRateLimit(rateLimiter.generalLimiter);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 100);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should calculate reset time correctly for rate limit exceeded", async () => {
      const msBeforeNext = 120000; // 2 minutes

      const mockConsume = jest.fn().mockRejectedValue({
        msBeforeNext: msBeforeNext,
      });

      const mockLimiter = {
        points: 20,
        consume: mockConsume,
      };

      mockReq.headers["x-forwarded-for"] = "198.51.100.1";

      const middleware = rateLimiter.applyRateLimit(mockLimiter);
      await middleware(mockReq, mockRes, mockNext);

      const expectedResetTime = Math.ceil(
        (1640000000000 + msBeforeNext) / 1000
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Reset",
        expectedResetTime
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", 120);
    });
  });
});
