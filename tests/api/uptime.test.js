const uptimeHandler = require("../../api/uptime");

describe("Uptime API Handler", () => {
  let req, res;
  let originalProcessUptime;

  beforeEach(() => {
    req = {
      url: "/uptime",
      headers: { host: "localhost:3000" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    // Mock process.uptime
    originalProcessUptime = process.uptime;
    process.uptime = jest.fn().mockReturnValue(3661); // 1 hour, 1 minute, 1 second
  });

  afterEach(() => {
    process.uptime = originalProcessUptime;
  });

  it("should return uptime information", async () => {
    await uptimeHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "s-maxage=60, stale-while-revalidate"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "ok",
      timestamp: expect.any(String),
      uptime: 3661,
      message: "IBJA API is running",
    });
  });

  it("should include timestamp in ISO format", async () => {
    await uptimeHandler(req, res);

    const call = res.json.mock.calls[0][0];
    expect(call.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it("should return current uptime", async () => {
    process.uptime.mockReturnValue(12345);

    await uptimeHandler(req, res);

    const call = res.json.mock.calls[0][0];
    expect(call.uptime).toBe(12345);
  });
});
