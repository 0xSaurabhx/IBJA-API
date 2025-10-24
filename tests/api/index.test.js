// Mock the rate limiter before requiring the handler
jest.mock("../../api/_rateLimiter", () => ({
  generalLimiter: { points: 100 },
  applyRateLimit: jest.fn(() => (req, res, next) => {
    res.setHeader("X-RateLimit-Limit", 100);
    res.setHeader("X-RateLimit-Remaining", 99);
    res.setHeader("X-RateLimit-Reset", new Date().toISOString());
    next();
  }),
}));

const axios = require("axios");
const indexHandler = require("../../api/index");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("Index API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  describe("GET /", () => {
    it("should return welcome message and available endpoints", async () => {
      await indexHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "s-maxage=7200, stale-while-revalidate"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Welcome to the IBJA Gold API",
        endpoint1: "/latest",
        endpoint2: "/history",
        endpoint3: "/silver",
        endpoint4: "/uptime",
        endpoint5: "/convert",
        endpoint6: "/platinum",
        endpoint7: "/pdf",
        endpoint8: "/chart",
        description: "Fetches IBJA gold rates in India",
      });
    });

    it("should handle empty URL path", async () => {
      req.url = "";

      await indexHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Welcome to the IBJA Gold API",
        })
      );
    });
  });

  describe("GET /latest", () => {
    beforeEach(() => {
      req.url = "/latest";
    });

    it("should return gold rates when successful", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <span id="lblGold999_AM">65000</span>
            <span id="lblGold995_AM">64500</span>
            <span id="lblGold916_AM">59500</span>
            <span id="lblGold750_AM">48750</span>
            <span id="lblGold585_AM">38025</span>
            <span id="lblGold585_PM">38100</span>
            <span id="lblGold750_PM">48800</span>
            <span id="lblGold916_PM">59550</span>
            <span id="lblGold995_PM">64550</span>
            <span id="lblGold999_PM">65050</span>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      await indexHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "s-maxage=7200, stale-while-revalidate"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          lblGold999_AM: "65000",
          lblGold995_AM: "64500",
          lblGold916_AM: "59500",
          lblGold750_AM: "48750",
          lblGold585_AM: "38025",
          lblGold585_PM: "38100",
          lblGold750_PM: "48800",
          lblGold916_PM: "59550",
          lblGold995_PM: "64550",
          lblGold999_PM: "65050",
        })
      );
    });

    it("should return 404 when no rates are found", async () => {
      const mockEmptyHtmlResponse = `
        <html>
          <body>
            <span id="lblGold999_AM"></span>
            <span id="lblGold995_AM"></span>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockEmptyHtmlResponse });

      await indexHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Live gold rates not available currently.",
      });
    });

    it("should return 500 when axios request fails", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));

      await indexHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch gold rates",
      });
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 for unknown endpoints", async () => {
      req.url = "/unknown";

      await indexHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Endpoint not found",
      });
    });
  });
});
