// Mock the rate limiter before requiring the handler
jest.mock("../../api/_rateLimiter", () => ({
  dataHeavyLimiter: { points: 20 },
  applyRateLimit: jest.fn(() => (handler) => handler),
}));

const axios = require("axios");
const historyHandler = require("../../api/history");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("History API Handler", () => {
  let req, res;

  beforeEach(() => {
    req = {
      url: "/history",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  it("should return historical data when successful", async () => {
    const mockHtmlResponse = `
      <html>
        <body>
          <div id="tab-am">
            <table>
              <tbody>
                <tr>
                  <td>23/10/2024</td>
                  <td>65000</td>
                  <td>64500</td>
                  <td>59500</td>
                  <td>48750</td>
                  <td>38025</td>
                  <td>85000</td>
                </tr>
                <tr>
                  <td>22/10/2024</td>
                  <td>64800</td>
                  <td>64300</td>
                  <td>59300</td>
                  <td>48600</td>
                  <td>37950</td>
                  <td>84500</td>
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
                  <td>64550</td>
                  <td>59550</td>
                  <td>48800</td>
                  <td>38100</td>
                  <td>85200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

    await historyHandler(req, res);

    expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ibjarates.com");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "s-maxage=7200, stale-while-revalidate"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        updated: expect.any(String),
        am: expect.arrayContaining([
          expect.objectContaining({
            date: "23/10/2024",
            gold_999: "65000",
            gold_995: "64500",
            gold_916: "59500",
            gold_750: "48750",
            gold_585: "38025",
            silver_999: "85000",
          }),
          expect.objectContaining({
            date: "22/10/2024",
            gold_999: "64800",
            gold_995: "64300",
            gold_916: "59300",
            gold_750: "48600",
            gold_585: "37950",
            silver_999: "84500",
          }),
        ]),
        pm: expect.arrayContaining([
          expect.objectContaining({
            date: "23/10/2024",
            gold_999: "65050",
            gold_995: "64550",
            gold_916: "59550",
            gold_750: "48800",
            gold_585: "38100",
            silver_999: "85200",
          }),
        ]),
      })
    );
  });

  it("should return 404 when no historical data found", async () => {
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

    await historyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Historical data not available currently.",
    });
  });

  it("should filter out rows with empty gold and silver values", async () => {
    const mockHtmlResponse = `
      <html>
        <body>
          <div id="tab-am">
            <table>
              <tbody>
                <tr>
                  <td>23/10/2024</td>
                  <td>65000</td>
                  <td>64500</td>
                  <td>59500</td>
                  <td>48750</td>
                  <td>38025</td>
                  <td>85000</td>
                </tr>
                <tr>
                  <td>22/10/2024</td>
                  <td></td>
                  <td></td>
                  <td></td>
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

    await historyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        am: expect.arrayContaining([
          expect.objectContaining({
            date: "23/10/2024",
            gold_999: "65000",
          }),
        ]),
        pm: [],
      })
    );
  });

  it("should return 500 when axios request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    await historyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch historical rates",
    });
  });
});
