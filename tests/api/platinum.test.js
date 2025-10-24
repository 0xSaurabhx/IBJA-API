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
const platinumHandler = require("../../api/platinum");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("Platinum API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/platinum",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  describe("GET /platinum (root)", () => {
    it("should return welcome message for root path", async () => {
      req.url = "/platinum";

      await platinumHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "s-maxage=7200, stale-while-revalidate"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Welcome to the IBJA Platinum API",
        endpoint: "/latest",
        description: "Fetches IBJA platinum rates in India",
      });
    });

    it("should handle empty URL path", async () => {
      req.url = "/";

      await platinumHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Welcome to the IBJA Platinum API",
        endpoint: "/latest",
        description: "Fetches IBJA platinum rates in India",
      });
    });
  });

  describe("GET /platinum/latest", () => {
    beforeEach(() => {
      req.url = "/platinum/latest";
    });

    it("should return platinum rate from label when available", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <span id="lblPlatinum999">3500</span>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      await platinumHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "s-maxage=7200, stale-while-revalidate"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          lblPlatinum999_AM: "3500",
          lblPlatinum999_PM: "3500",
        })
      );
    });

    it("should fallback to table parsing when label is empty", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <span id="lblPlatinum999"></span>
            <table>
              <tr>
                <td>PLATINUM 999</td>
                <td>per gram</td>
                <td>3,500</td>
              </tr>
              <tr>
                <td>Gold 999</td>
                <td>per gram</td>
                <td>65,000</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      await platinumHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          lblPlatinum999_AM: "3500", // Should remove commas
          lblPlatinum999_PM: "3500",
        })
      );
    });

    it("should return 404 when no platinum rate found", async () => {
      const mockEmptyHtmlResponse = `
        <html>
          <body>
            <span id="lblPlatinum999"></span>
            <table>
              <tr>
                <td>Gold 999</td>
                <td>per gram</td>
                <td>65,000</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockEmptyHtmlResponse });

      await platinumHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Platinum rate not available currently.",
      });
    });

    it("should return 500 when axios request fails", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));

      await platinumHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch platinum rates",
      });
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 for unknown endpoints", async () => {
      req.url = "/platinum/unknown";

      await platinumHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Endpoint not found",
      });
    });
  });
});
