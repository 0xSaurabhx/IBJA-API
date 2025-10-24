// Mock the rate limiter before requiring the handler
jest.mock("../../api/_rateLimiter", () => ({
  dataHeavyLimiter: { points: 20 },
  applyRateLimit: jest.fn(() => (handler) => handler),
}));

const axios = require("axios");
const chartHandler = require("../../api/chart");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("Chart API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/chart",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  it("should return chart data when successful", async () => {
    const mockHtmlResponse = `
      <html>
        <body>
          <div id="tab-am">
            <table>
              <tbody>
                <tr>
                  <td>23/10/2024</td>
                  <td>65000</td>
                  <td></td>
                  <td>59500</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>22/10/2024</td>
                  <td>64800</td>
                  <td></td>
                  <td>59300</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div id="tab-pm">
            <table>
              <tbody>
                <tr>
                  <td>23/10/2024</td>
                  <td>65050</td>
                  <td></td>
                  <td>59550</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

    await chartHandler(req, res);

    expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "s-maxage=7200, stale-while-revalidate"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        lastUpdated: expect.any(String),
        statistics: expect.objectContaining({
          average_999: expect.any(Number),
          average_916: expect.any(Number),
          average_difference: expect.any(Number),
          total_records_parsed: expect.any(Number),
          valid_records_combined: expect.any(Number),
        }),
        data: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            session: expect.stringMatching(/^(AM|PM)$/),
            gold_999: expect.any(Number),
            gold_916: expect.any(Number),
            difference: expect.any(Number),
            purity_ratio: expect.any(String),
          }),
        ]),
      })
    );
  });

  it("should return empty data array when no chart data found", async () => {
    const mockEmptyHtmlResponse = `
      <html>
        <body>
          <div id="tab-am">
            <table><tbody></tbody></table>
          </div>
          <div id="tab-pm">
            <table><tbody></tbody></table>
          </div>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockEmptyHtmlResponse });

    await chartHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Chart data not available currently.",
    });
  });

  it("should filter out invalid data entries", async () => {
    const mockHtmlResponse = `
      <html>
        <body>
          <div id="tab-am">
            <table>
              <tbody>
                <tr>
                  <td>23/10/2024</td>
                  <td>65000</td>
                  <td></td>
                  <td>59500</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>invalid-date</td>
                  <td>invalid</td>
                  <td></td>
                  <td>invalid</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div id="tab-pm">
            <table><tbody></tbody></table>
          </div>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

    await chartHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            date: "23/10/2024",
            gold_999: 65000,
            gold_916: 59500,
          }),
        ]),
        statistics: expect.objectContaining({
          valid_records_combined: 1,
        }),
      })
    );
  });

  it("should return 500 when axios request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    await chartHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch chart data",
    });
  });
});
