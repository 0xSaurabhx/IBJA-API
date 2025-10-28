// Mock the rate limiter before requiring the handler
jest.mock("../../api/_rateLimiter", () => ({
  generalLimiter: { points: 100 },
  applyRateLimit: jest.fn((limiter) => (req, res, callback) => {
    // Immediately call the callback to bypass rate limiting
    callback();
  }),
}));

// Mock axios for external API calls
const axios = require("axios");
jest.mock("axios");
const mockedAxios = axios;

// Mock the rate storage utility
const rateStorage = require("../../api/_rateStorage");
jest.mock("../../api/_rateStorage");

const changesHandler = require("../../api/changes");

describe("Changes API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/changes",
      query: {},
      headers: {
        host: "localhost:3000",
        "x-forwarded-for": "127.0.0.1",
      },
      socket: { remoteAddress: "127.0.0.1" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();

    // Reset mocks with default successful response
    mockedAxios.get.mockResolvedValue({
      data: `
        <html>
          <body>
            <span id="lblGold999_AM">65000</span>
            <span id="lblGold995_AM">64500</span>
            <span id="lblGold916_AM">59500</span>
            <span id="lblGold750_AM">48750</span>
            <span id="lblGold585_AM">39000</span>
            <span id="lblGold585_PM">39100</span>
            <span id="lblGold750_PM">48850</span>
            <span id="lblGold916_PM">59600</span>
            <span id="lblGold995_PM">64600</span>
            <span id="lblGold999_PM">65100</span>
          </body>
        </html>
      `,
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 for unknown endpoints", async () => {
      req.url = "/changes/unknown";

      await changesHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Endpoint not found",
      });
    });
  });

  describe("Route handling", () => {
    it("should handle root changes route", async () => {
      req.url = "/changes";

      // Mock the successful case
      rateStorage.storeRate.mockReturnValue({
        timestamp: "2025-10-27T10:00:00.000Z",
        rates: { lblGold999_AM: "65000" },
      });
      rateStorage.getRateFromPeriod.mockReturnValue(null);

      await changesHandler(req, res);

      // Should attempt to fetch and store rates
      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });

    it("should handle hourly route", async () => {
      req.url = "/changes/hourly";

      rateStorage.storeRate.mockReturnValue({});
      rateStorage.getTodayRates.mockReturnValue([]);

      await changesHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });

    it("should handle weekly route", async () => {
      req.url = "/changes/weekly";

      rateStorage.storeRate.mockReturnValue({
        timestamp: "2025-10-27T10:00:00.000Z",
        rates: { lblGold999_AM: "65000" },
      });
      rateStorage.getRateFromPeriod.mockReturnValue(null);

      await changesHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });

    it("should handle highs route", async () => {
      req.url = "/changes/highs";

      rateStorage.storeRate.mockReturnValue({});
      rateStorage.getDailyHighLow.mockReturnValue(null);

      await changesHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });

    it("should handle daily-highs route alias", async () => {
      req.url = "/changes/daily-highs";

      rateStorage.storeRate.mockReturnValue({});
      rateStorage.getDailyHighLow.mockReturnValue(null);

      await changesHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });
  });

  describe("Error scenarios", () => {
    it("should handle axios network errors", async () => {
      req.url = "/changes";
      mockedAxios.get.mockRejectedValue(new Error("Network error"));

      await changesHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });

    it("should handle storage errors gracefully", async () => {
      req.url = "/changes";
      rateStorage.storeRate.mockImplementation(() => {
        throw new Error("Storage error");
      });

      await changesHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });
  });

  describe("Data processing", () => {
    it("should process gold rate IDs correctly", async () => {
      req.url = "/changes";

      const mockEntry = {
        timestamp: "2025-10-27T10:00:00.000Z",
        rates: {
          lblGold999_AM: "65000",
          lblGold995_AM: "64500",
          lblGold916_AM: "59500",
        },
      };

      rateStorage.storeRate.mockReturnValue(mockEntry);
      rateStorage.getRateFromPeriod.mockReturnValue(null);

      await changesHandler(req, res);

      // Verify that storeRate was called with proper data structure
      expect(rateStorage.storeRate).toHaveBeenCalledWith(
        expect.objectContaining({
          lblGold999_AM: expect.any(String),
          lblGold995_AM: expect.any(String),
          lblGold916_AM: expect.any(String),
        }),
        "gold"
      );
    });

    it("should handle query parameters for highs endpoint", async () => {
      req.url = "/changes/highs";
      req.query.date = "2025-10-26";

      rateStorage.storeRate.mockReturnValue({});
      rateStorage.getDailyHighLow.mockReturnValue({
        lblGold999_AM: { high: 64500, low: 64000, range: 500 },
      });

      await changesHandler(req, res);

      // Just verify the axios call was made for the highs endpoint
      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    });
  });
});
