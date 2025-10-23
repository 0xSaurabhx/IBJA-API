// Mock the rate limiter before requiring the handler
jest.mock("../../api/_rateLimiter", () => ({
  utilityLimiter: { points: 50 },
  applyRateLimit: jest.fn(() => (handler) => handler),
}));

const axios = require("axios");
const convertHandler = require("../../api/convert");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("Convert API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/convert?amount=1000&from=INR&to=USD",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  it("should convert currency successfully", async () => {
    // Mock exchange rates response
    const mockExchangeRatesResponse = {
      data: {
        rates: {
          INR: 1,
          USD: 0.012,
          EUR: 0.011,
          GBP: 0.0095,
          JPY: 1.8,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockExchangeRatesResponse);

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "INR",
        to: "USD",
        amount: 1000,
        convertedAmount: expect.any(Number),
        rate: expect.any(Number),
        lastUpdated: expect.any(String),
      })
    );
  });

  it("should return 400 for missing required parameters", async () => {
    req.url = "/convert";

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Missing required parameter: to"),
      })
    );
  });

  it("should use default amount of 1 for invalid amount", async () => {
    req.url = "/convert?amount=invalid&from=INR&to=USD";

    const mockExchangeRatesResponse = {
      data: {
        rates: {
          INR: 1,
          USD: 0.012,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockExchangeRatesResponse);

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1, // Should default to 1 for invalid amount
      })
    );
  });

  it("should return 400 for negative amount", async () => {
    req.url = "/convert?amount=-100&from=INR&to=USD";

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Invalid amount parameter"),
      })
    );
  });

  it("should return 400 for unsupported currency", async () => {
    req.url = "/convert?amount=1000&from=INR&to=XYZ";

    // Mock exchange rates response without XYZ currency
    const mockExchangeRatesResponse = {
      data: {
        rates: {
          INR: 1,
          USD: 0.012,
          EUR: 0.011,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockExchangeRatesResponse);

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Unsupported 'to' currency: XYZ"),
      })
    );
  });

  it("should return 400 for unsupported from currency", async () => {
    req.url = "/convert?amount=1000&from=XYZ&to=USD";

    const mockExchangeRatesResponse = {
      data: {
        rates: {
          INR: 1,
          USD: 0.012,
          EUR: 0.011,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockExchangeRatesResponse);

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Unsupported 'from' currency: XYZ"),
      })
    );
  });

  it("should use default amount of 1 when not provided", async () => {
    req.url = "/convert?from=INR&to=USD";

    const mockExchangeRatesResponse = {
      data: {
        rates: {
          INR: 1,
          USD: 0.012,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockExchangeRatesResponse);

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1,
      })
    );
  });

  it("should handle case insensitive currency codes", async () => {
    req.url = "/convert?amount=1000&from=inr&to=usd";

    const mockExchangeRatesResponse = {
      data: {
        rates: {
          INR: 1,
          USD: 0.012,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockExchangeRatesResponse);

    await convertHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "INR",
        to: "USD",
      })
    );
  });
});
