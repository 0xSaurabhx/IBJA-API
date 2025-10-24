// Mock the rate limiter before requiring the handler
jest.mock("../../api/_rateLimiter", () => ({
  utilityLimiter: { points: 50 },
  applyRateLimit: jest.fn(() => (req, res, next) => {
    res.setHeader("X-RateLimit-Limit", 50);
    res.setHeader("X-RateLimit-Remaining", 49);
    res.setHeader("X-RateLimit-Reset", new Date().toISOString());
    next();
  }),
}));

const axios = require("axios");
const pdfHandler = require("../../api/pdf");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("PDF API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/pdf",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  describe("GET /pdf (root)", () => {
    it("should return welcome message for root path", async () => {
      req.url = "/pdf";

      await pdfHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "s-maxage=3600, stale-while-revalidate"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "IBJA PDF Downloads API",
        endpoint: "/last30",
        description: "Returns PDF download links for historical data",
      });
    });

    it("should handle empty URL path", async () => {
      req.url = "/";

      await pdfHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "IBJA PDF Downloads API",
        endpoint: "/last30",
        description: "Returns PDF download links for historical data",
      });
    });
  });

  describe("GET /pdf/last30", () => {
    beforeEach(() => {
      req.url = "/pdf/last30";
    });

    it("should return PDF download link when found", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <div>
              <a href="rates_last_30_days.pdf">Previous 30 Days Historical Data</a>
              <a href="other_document.pdf">Other Document</a>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      await pdfHandler(req, res);

      expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "s-maxage=3600, stale-while-revalidate"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Previous 30 Days Historical Data",
          description:
            "Daily Opening and Closing Market Rate PDF (Gold & Silver)",
          downloadUrl: expect.stringContaining(".pdf"),
          directLink: expect.stringContaining(".pdf"),
          fileType: "PDF",
          period: "Last 30 Days",
          lastChecked: expect.any(String),
          source: "https://www.ibjarates.com",
        })
      );
    });

    it("should handle relative URLs correctly", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <a href="../pdfs/last_30_days.pdf">Last 30 Days Report</a>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      await pdfHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadUrl: expect.stringContaining("https://www.ibjarates.com"),
        })
      );
    });

    it("should return 404 when no PDF link found", async () => {
      const mockEmptyHtmlResponse = `
        <html>
          <body>
            <div>
              <a href="index.html">Home Page</a>
              <p>No PDF files available</p>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockEmptyHtmlResponse });

      await pdfHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "PDF link not found",
        message:
          "Could not find the last 30 days PDF link on the IBJA website. The structure might have changed.",
      });
    });

    it("should return 500 when axios request fails", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));

      await pdfHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch PDF download link",
      });
    });

    it("should handle absolute URLs", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <a href="https://example.com/documents/previous_30_days.pdf">Previous 30 Days Data</a>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      await pdfHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadUrl: "https://example.com/documents/previous_30_days.pdf",
        })
      );
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 for unknown endpoints", async () => {
      req.url = "/pdf/unknown";

      await pdfHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Endpoint not found",
      });
    });
  });
});
