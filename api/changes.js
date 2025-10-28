const axios = require("axios");
const cheerio = require("cheerio");
const { generalLimiter, applyRateLimit } = require("./_rateLimiter");
const {
  storeRate,
  getRateFromPeriod,
  getTodayRates,
  getRateChanges,
  getDailyHighLow,
} = require("./_rateStorage");

// Fetch current gold rates and store them
const fetchAndStoreCurrentRates = async () => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    const GOLD_IDS = [
      "lblGold999_AM",
      "lblGold995_AM",
      "lblGold916_AM",
      "lblGold750_AM",
      "lblGold585_AM",
      "lblGold585_PM",
      "lblGold750_PM",
      "lblGold916_PM",
      "lblGold995_PM",
      "lblGold999_PM",
    ];

    const result = {};
    GOLD_IDS.forEach((id) => {
      const text = $(`#${id}`).text().trim();
      result[id] = text || null;
    });

    // Store the current rates
    const storedEntry = storeRate(result, "gold");
    return storedEntry;
  } catch (error) {
    console.error("Error fetching current rates:", error.message);
    return null;
  }
};

// Get rate changes since yesterday
const handleDailyChanges = async (req, res) => {
  try {
    // Fetch and store current rates
    const currentEntry = await fetchAndStoreCurrentRates();
    if (!currentEntry) {
      return res.status(500).json({ error: "Failed to fetch current rates" });
    }

    // Get rates from 24 hours ago
    const yesterdayEntry = getRateFromPeriod(24, "gold");

    if (!yesterdayEntry) {
      return res.status(200).json({
        message: "Daily changes tracking started",
        current: currentEntry,
        changes: null,
        note: "No historical data available yet. Changes will be available after 24 hours of tracking.",
      });
    }

    const changes = getRateChanges(currentEntry.rates, yesterdayEntry.rates);

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate"); // 30 minutes
    res.status(200).json({
      current: currentEntry,
      previous: yesterdayEntry,
      changes: changes,
      summary: generateChangeSummary(changes),
    });
  } catch (error) {
    console.error("Error calculating daily changes:", error.message);
    res.status(500).json({ error: "Failed to calculate rate changes" });
  }
};

// Get hourly rate tracking for today
const handleHourlyTracking = async (req, res) => {
  try {
    // Fetch and store current rates
    await fetchAndStoreCurrentRates();

    const todayRates = getTodayRates("gold");

    if (todayRates.length === 0) {
      return res.status(200).json({
        message: "Hourly tracking started",
        data: [],
        note: "No hourly data available yet. Data will accumulate throughout the day.",
      });
    }

    // Group by hour
    const hourlyData = groupRatesByHour(todayRates);

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate"); // 15 minutes
    res.status(200).json({
      date: new Date().toISOString().split("T")[0],
      hourlyData: hourlyData,
      totalEntries: todayRates.length,
      summary: generateHourlySummary(hourlyData),
    });
  } catch (error) {
    console.error("Error getting hourly tracking:", error.message);
    res.status(500).json({ error: "Failed to get hourly data" });
  }
};

// Get weekly trends
const handleWeeklyTrends = async (req, res) => {
  try {
    // Fetch and store current rates
    const currentEntry = await fetchAndStoreCurrentRates();
    if (!currentEntry) {
      return res.status(500).json({ error: "Failed to fetch current rates" });
    }

    // Get rates from 7 days ago
    const weekAgoEntry = getRateFromPeriod(24 * 7, "gold");

    if (!weekAgoEntry) {
      return res.status(200).json({
        message: "Weekly trends tracking started",
        current: currentEntry,
        trends: null,
        note: "No weekly historical data available yet. Trends will be available after 7 days of tracking.",
      });
    }

    const weeklyChanges = getRateChanges(
      currentEntry.rates,
      weekAgoEntry.rates
    );

    // Get daily highs and lows for the week
    const weeklyHighLow = getWeeklyHighLow();

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // 1 hour
    res.status(200).json({
      current: currentEntry,
      weekAgo: weekAgoEntry,
      weeklyChanges: weeklyChanges,
      weeklyHighLow: weeklyHighLow,
      summary: generateWeeklySummary(weeklyChanges, weeklyHighLow),
    });
  } catch (error) {
    console.error("Error calculating weekly trends:", error.message);
    res.status(500).json({ error: "Failed to calculate weekly trends" });
  }
};

// Get daily high/low rates
const handleDailyHighLow = async (req, res) => {
  try {
    // Fetch and store current rates
    await fetchAndStoreCurrentRates();

    const date = req.query.date || new Date().toISOString().split("T")[0];
    const highLow = getDailyHighLow(date, "gold");

    if (!highLow) {
      return res.status(404).json({
        error: "No rate data found for the specified date",
        date: date,
      });
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate"); // 30 minutes
    res.status(200).json({
      date: date,
      highLow: highLow,
      summary: generateHighLowSummary(highLow),
    });
  } catch (error) {
    console.error("Error getting daily high/low:", error.message);
    res.status(500).json({ error: "Failed to get daily high/low data" });
  }
};

// Helper function to generate change summary
const generateChangeSummary = (changes) => {
  if (!changes) return null;

  const summary = {
    totalChanges: Object.keys(changes).length,
    upTrends: 0,
    downTrends: 0,
    stable: 0,
    biggestGainer: null,
    biggestLoser: null,
  };

  let maxGain = -Infinity;
  let maxLoss = Infinity;

  Object.keys(changes).forEach((key) => {
    const change = changes[key];
    if (change.trend === "up") summary.upTrends++;
    else if (change.trend === "down") summary.downTrends++;
    else summary.stable++;

    if (change.changePercent > maxGain) {
      maxGain = change.changePercent;
      summary.biggestGainer = { rate: key, change: change.changePercent };
    }

    if (change.changePercent < maxLoss) {
      maxLoss = change.changePercent;
      summary.biggestLoser = { rate: key, change: change.changePercent };
    }
  });

  return summary;
};

// Helper function to group rates by hour
const groupRatesByHour = (rates) => {
  const hourlyGroups = {};

  rates.forEach((rate) => {
    const hour = new Date(rate.timestamp).getHours();
    const hourKey = `${hour.toString().padStart(2, "0")}:00`;

    if (!hourlyGroups[hourKey]) {
      hourlyGroups[hourKey] = [];
    }
    hourlyGroups[hourKey].push(rate);
  });

  return hourlyGroups;
};

// Helper function to generate hourly summary
const generateHourlySummary = (hourlyData) => {
  const hours = Object.keys(hourlyData);
  return {
    activeHours: hours.length,
    peakActivityHour: hours.reduce(
      (max, hour) =>
        hourlyData[hour].length > (hourlyData[max]?.length || 0) ? hour : max,
      hours[0]
    ),
    totalDataPoints: Object.values(hourlyData).reduce(
      (sum, data) => sum + data.length,
      0
    ),
  };
};

// Helper function to get weekly high/low
const getWeeklyHighLow = () => {
  const weeklyData = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const dayHighLow = getDailyHighLow(dateStr, "gold");

    if (dayHighLow) {
      weeklyData[dateStr] = dayHighLow;
    }
  }

  return weeklyData;
};

// Helper function to generate weekly summary
const generateWeeklySummary = (changes, highLowData) => {
  const daysWithData = Object.keys(highLowData).length;

  return {
    daysTracked: daysWithData,
    overallTrend: changes
      ? Object.values(changes).filter((c) => c.trend === "up").length >
        Object.values(changes).filter((c) => c.trend === "down").length
        ? "bullish"
        : "bearish"
      : "neutral",
    dataAvailability: daysWithData >= 7 ? "complete" : "partial",
  };
};

// Helper function to generate high/low summary
const generateHighLowSummary = (highLow) => {
  const summaries = {};

  Object.keys(highLow).forEach((key) => {
    const data = highLow[key];
    summaries[key] = {
      volatility: ((data.range / data.low) * 100).toFixed(2) + "%",
      midpoint: ((data.high + data.low) / 2).toFixed(2),
    };
  });

  return summaries;
};

// Main export - router and middleware application
module.exports = async (req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/" || urlPath === "" || urlPath === "/changes") {
    // Root route for changes - get daily changes
    applyRateLimit(generalLimiter)(req, res, () =>
      handleDailyChanges(req, res)
    );
    return;
  }

  if (urlPath.includes("/hourly")) {
    applyRateLimit(generalLimiter)(req, res, () =>
      handleHourlyTracking(req, res)
    );
    return;
  }

  if (urlPath.includes("/weekly")) {
    applyRateLimit(generalLimiter)(req, res, () =>
      handleWeeklyTrends(req, res)
    );
    return;
  }

  if (urlPath.includes("/daily-highs") || urlPath.includes("/highs")) {
    applyRateLimit(generalLimiter)(req, res, () =>
      handleDailyHighLow(req, res)
    );
    return;
  }

  // Fallback
  res.status(404).json({ error: "Endpoint not found" });
};
