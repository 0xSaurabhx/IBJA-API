// In-memory storage for rate tracking
// In production, this could be replaced with a database

let rateHistory = [];
const MAX_HISTORY_SIZE = 1000; // Keep last 1000 rate entries

// Store rate data with timestamp
const storeRate = (rateData, metalType = "gold") => {
  const timestamp = new Date();
  const entry = {
    timestamp: timestamp.toISOString(),
    date: timestamp.toISOString().split("T")[0],
    time: timestamp.toTimeString().split(" ")[0],
    metalType,
    rates: { ...rateData },
    session: timestamp.getHours() < 12 ? "AM" : "PM",
  };

  rateHistory.push(entry);

  // Keep only recent entries to prevent memory issues
  if (rateHistory.length > MAX_HISTORY_SIZE) {
    rateHistory = rateHistory.slice(-MAX_HISTORY_SIZE);
  }

  return entry;
};

// Get latest rate for comparison
const getLatestRate = (metalType = "gold") => {
  const filtered = rateHistory.filter((entry) => entry.metalType === metalType);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
};

// Get rate from specific time period ago
const getRateFromPeriod = (hoursAgo, metalType = "gold") => {
  const targetTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const filtered = rateHistory.filter(
    (entry) =>
      entry.metalType === metalType && new Date(entry.timestamp) <= targetTime
  );
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
};

// Get all rates from today
const getTodayRates = (metalType = "gold") => {
  const today = new Date().toISOString().split("T")[0];
  return rateHistory.filter(
    (entry) => entry.metalType === metalType && entry.date === today
  );
};

// Get rates from specific date
const getRatesFromDate = (date, metalType = "gold") => {
  return rateHistory.filter(
    (entry) => entry.metalType === metalType && entry.date === date
  );
};

// Calculate percentage change
const calculatePercentageChange = (oldValue, newValue) => {
  if (!oldValue || !newValue || oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

// Get rate changes between two periods
const getRateChanges = (currentRates, previousRates) => {
  if (!currentRates || !previousRates) return null;

  const changes = {};

  // Compare all available rate fields
  Object.keys(currentRates).forEach((key) => {
    if (key !== "date" && currentRates[key] && previousRates[key]) {
      const current = parseFloat(
        currentRates[key].toString().replace(/,/g, "")
      );
      const previous = parseFloat(
        previousRates[key].toString().replace(/,/g, "")
      );

      if (!isNaN(current) && !isNaN(previous)) {
        changes[key] = {
          current: current,
          previous: previous,
          change: current - previous,
          changePercent: calculatePercentageChange(previous, current),
          trend:
            current > previous ? "up" : current < previous ? "down" : "stable",
        };
      }
    }
  });

  return changes;
};

// Get daily high/low rates
const getDailyHighLow = (date, metalType = "gold") => {
  const dayRates = getRatesFromDate(date, metalType);
  if (dayRates.length === 0) return null;

  const highLow = {};

  // Get all rate keys from first entry
  const sampleRates = dayRates[0].rates;
  Object.keys(sampleRates).forEach((key) => {
    if (key !== "date") {
      const values = dayRates
        .map((entry) =>
          parseFloat(entry.rates[key]?.toString().replace(/,/g, "") || 0)
        )
        .filter((val) => val > 0);

      if (values.length > 0) {
        highLow[key] = {
          high: Math.max(...values),
          low: Math.min(...values),
          range: Math.max(...values) - Math.min(...values),
        };
      }
    }
  });

  return highLow;
};

// Clear old data (for maintenance)
const clearOldData = (daysToKeep = 30) => {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  rateHistory = rateHistory.filter(
    (entry) => new Date(entry.timestamp) >= cutoffDate
  );
};

module.exports = {
  storeRate,
  getLatestRate,
  getRateFromPeriod,
  getTodayRates,
  getRatesFromDate,
  getRateChanges,
  getDailyHighLow,
  calculatePercentageChange,
  clearOldData,
  // Export for testing
  getRateHistory: () => rateHistory,
  setRateHistory: (history) => {
    rateHistory = history;
  },
};
