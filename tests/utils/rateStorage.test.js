const {
  storeRate,
  getLatestRate,
  getRateFromPeriod,
  getTodayRates,
  getRatesFromDate,
  getRateChanges,
  getDailyHighLow,
  calculatePercentageChange,
  clearOldData,
  getRateHistory,
  setRateHistory,
} = require("../../api/_rateStorage");

describe("Rate Storage Utility", () => {
  beforeEach(() => {
    // Clear history before each test
    setRateHistory([]);
  });

  describe("storeRate", () => {
    it("should store rate data with timestamp", () => {
      const rateData = { lblGold999_AM: "65000", lblGold916_AM: "59500" };

      const entry = storeRate(rateData, "gold");

      expect(entry).toHaveProperty("timestamp");
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("time");
      expect(entry).toHaveProperty("metalType", "gold");
      expect(entry).toHaveProperty("rates", rateData);
      expect(entry).toHaveProperty("session");
      expect(entry.session).toMatch(/^(AM|PM)$/);
    });

    it("should default to gold metal type", () => {
      const rateData = { lblGold999_AM: "65000" };

      const entry = storeRate(rateData);

      expect(entry.metalType).toBe("gold");
    });

    it("should add entry to rate history", () => {
      const rateData = { lblGold999_AM: "65000" };

      storeRate(rateData);

      const history = getRateHistory();
      expect(history).toHaveLength(1);
      expect(history[0].rates).toEqual(rateData);
    });

    it("should limit history size to prevent memory issues", () => {
      // Store more than MAX_HISTORY_SIZE entries
      for (let i = 0; i < 1100; i++) {
        storeRate({ lblGold999_AM: (65000 + i).toString() });
      }

      const history = getRateHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("getLatestRate", () => {
    it("should return latest rate for specified metal type", () => {
      const goldData = { lblGold999_AM: "65000" };
      const silverData = { lblSilver999: "80000" };

      storeRate(goldData, "gold");
      storeRate(silverData, "silver");

      const latestGold = getLatestRate("gold");
      const latestSilver = getLatestRate("silver");

      expect(latestGold.rates).toEqual(goldData);
      expect(latestSilver.rates).toEqual(silverData);
    });

    it("should return null when no data exists", () => {
      const latest = getLatestRate("gold");
      expect(latest).toBeNull();
    });

    it("should default to gold metal type", () => {
      const goldData = { lblGold999_AM: "65000" };
      storeRate(goldData, "gold");

      const latest = getLatestRate();
      expect(latest.rates).toEqual(goldData);
    });
  });

  describe("getRateFromPeriod", () => {
    it("should return rate from specific hours ago", () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

      // Mock the current time for consistent testing
      const originalDate = Date;
      global.Date = jest.fn(() => now);
      global.Date.now = jest.fn(() => now.getTime());

      // Manually create entries with specific timestamps
      const history = [
        {
          timestamp: fourHoursAgo.toISOString(),
          metalType: "gold",
          rates: { lblGold999_AM: "64000" },
        },
        {
          timestamp: twoHoursAgo.toISOString(),
          metalType: "gold",
          rates: { lblGold999_AM: "64500" },
        },
      ];

      setRateHistory(history);

      const rate = getRateFromPeriod(3, "gold");
      expect(rate.rates.lblGold999_AM).toBe("64500"); // Should get the 2-hour entry as it's within 3 hours

      // Restore original Date
      global.Date = originalDate;
    });

    it("should return null when no data in time period", () => {
      const rate = getRateFromPeriod(24, "gold");
      expect(rate).toBeNull();
    });
  });

  describe("getTodayRates", () => {
    it("should return only today's rates", () => {
      // Use the actual storeRate function to ensure proper date handling
      const goldDataToday = { lblGold999_AM: "65000" };
      const goldDataYesterday = { lblGold999_AM: "64000" };

      // Create today's entry using storeRate
      const todayEntry = storeRate(goldDataToday, "gold");

      // Manually add yesterday's entry
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayEntry = {
        timestamp: yesterday.toISOString(),
        date: yesterday.toISOString().split("T")[0],
        metalType: "gold",
        rates: goldDataYesterday,
      };

      const currentHistory = getRateHistory();
      setRateHistory([...currentHistory, yesterdayEntry]);

      const todayRates = getTodayRates("gold");
      expect(todayRates).toHaveLength(1);
      expect(todayRates[0].rates.lblGold999_AM).toBe("65000");
    });
  });

  describe("getRatesFromDate", () => {
    it("should return rates from specific date", () => {
      const targetDate = "2025-10-27";
      const otherDate = "2025-10-26";

      const history = [
        {
          timestamp: "2025-10-27T10:00:00.000Z",
          date: targetDate,
          metalType: "gold",
          rates: { lblGold999_AM: "65000" },
        },
        {
          timestamp: "2025-10-26T10:00:00.000Z",
          date: otherDate,
          metalType: "gold",
          rates: { lblGold999_AM: "64000" },
        },
      ];

      setRateHistory(history);

      const rates = getRatesFromDate(targetDate, "gold");
      expect(rates).toHaveLength(1);
      expect(rates[0].date).toBe(targetDate);
    });
  });

  describe("calculatePercentageChange", () => {
    it("should calculate percentage change correctly", () => {
      expect(calculatePercentageChange(100, 110)).toBeCloseTo(10);
      expect(calculatePercentageChange(100, 90)).toBeCloseTo(-10);
      expect(calculatePercentageChange(100, 100)).toBe(0);
    });

    it("should handle edge cases", () => {
      expect(calculatePercentageChange(0, 100)).toBe(0);
      expect(calculatePercentageChange(null, 100)).toBe(0);
      expect(calculatePercentageChange(100, null)).toBe(0);
    });
  });

  describe("getRateChanges", () => {
    it("should calculate rate changes between two periods", () => {
      const currentRates = {
        lblGold999_AM: "65000",
        lblGold916_AM: "59500",
        date: "2025-10-27",
      };

      const previousRates = {
        lblGold999_AM: "64000",
        lblGold916_AM: "59000",
        date: "2025-10-26",
      };

      const changes = getRateChanges(currentRates, previousRates);

      expect(changes).toHaveProperty("lblGold999_AM");
      expect(changes).toHaveProperty("lblGold916_AM");
      expect(changes).not.toHaveProperty("date");

      expect(changes.lblGold999_AM).toEqual({
        current: 65000,
        previous: 64000,
        change: 1000,
        changePercent: expect.any(Number),
        trend: "up",
      });
    });

    it("should handle null inputs", () => {
      expect(getRateChanges(null, {})).toBeNull();
      expect(getRateChanges({}, null)).toBeNull();
    });

    it("should skip non-numeric values", () => {
      const currentRates = {
        lblGold999_AM: "invalid",
        lblGold916_AM: "59500",
      };

      const previousRates = {
        lblGold999_AM: "64000",
        lblGold916_AM: "59000",
      };

      const changes = getRateChanges(currentRates, previousRates);

      expect(changes).not.toHaveProperty("lblGold999_AM");
      expect(changes).toHaveProperty("lblGold916_AM");
    });
  });

  describe("getDailyHighLow", () => {
    it("should calculate daily high and low rates", () => {
      const date = "2025-10-27";
      const history = [
        {
          timestamp: "2025-10-27T09:00:00.000Z",
          date: date,
          metalType: "gold",
          rates: { lblGold999_AM: "64800" },
        },
        {
          timestamp: "2025-10-27T12:00:00.000Z",
          date: date,
          metalType: "gold",
          rates: { lblGold999_AM: "65200" },
        },
        {
          timestamp: "2025-10-27T15:00:00.000Z",
          date: date,
          metalType: "gold",
          rates: { lblGold999_AM: "65000" },
        },
      ];

      setRateHistory(history);

      const highLow = getDailyHighLow(date, "gold");

      expect(highLow).toHaveProperty("lblGold999_AM");
      expect(highLow.lblGold999_AM).toEqual({
        high: 65200,
        low: 64800,
        range: 400,
      });
    });

    it("should return null when no data for date", () => {
      const highLow = getDailyHighLow("2025-10-27", "gold");
      expect(highLow).toBeNull();
    });
  });

  describe("clearOldData", () => {
    it("should remove data older than specified days", () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // Create entries with explicit timestamps
      const oldEntry = {
        timestamp: oldDate.toISOString(),
        metalType: "gold",
        rates: { lblGold999_AM: "64000" },
      };

      const recentEntry = {
        timestamp: recentDate.toISOString(),
        metalType: "gold",
        rates: { lblGold999_AM: "65000" },
      };

      setRateHistory([oldEntry, recentEntry]);

      // Verify we have 2 entries before clearing
      expect(getRateHistory()).toHaveLength(2);

      clearOldData(30); // Keep last 30 days

      const remainingHistory = getRateHistory();
      expect(remainingHistory).toHaveLength(1);
      expect(remainingHistory[0].rates.lblGold999_AM).toBe("65000");
    });
  });
});
