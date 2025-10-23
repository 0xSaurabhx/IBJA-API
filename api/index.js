const axios = require('axios');
const cheerio = require('cheerio');
const { generalLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

const GOLD_IDS = [
  'lblGold999_AM',
  'lblGold995_AM',
  'lblGold916_AM',
  'lblGold750_AM',
  'lblGold585_AM',
  'lblGold585_PM',
  'lblGold750_PM',
  'lblGold916_PM',
  'lblGold995_PM',
  'lblGold999_PM'
];

// Core logic for fetching latest gold rates
const handleLatestGoldRequest = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const result = {};
    GOLD_IDS.forEach(id => {
      const text = $(`#${id}`).text().trim();
      result[id] = text || null; // Ensure null if empty
    });

    // Check if any rates were found - crucial for robustness
    const foundRates = Object.values(result).some(rate => rate !== null);
    if (!foundRates) {
        // Fallback or error if no rates are found on the page
        console.warn('No gold rates found on the page.');
        // Consider fetching historical data as fallback if needed
        return res.status(404).json({ error: 'Live gold rates not available currently.' });
    }


    const now = new Date();

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate'); // 2 hours
    res.status(200).json({
      date: now.toISOString().split('T')[0],
      ...result
    });

  } catch (error) {
    console.error('Error scraping gold rates:', error.message);
    res.status(500).json({ error: 'Failed to fetch gold rates' });
  }
};

// Main export - acts as a router and applies middleware
module.exports = async (req, res) => {
  const urlPath = req.url.split('?')[0]; // Ignore query params for routing

  if (urlPath === '/' || urlPath === '') {
    // Root route - no rate limiting needed here
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      message: 'Welcome to the IBJA Gold API',
      endpoint1: '/latest',
      endpoint2: '/history',
      endpoint3: '/silver',
      endpoint4: '/uptime',
      endpoint5: '/convert',
      endpoint6: '/platinum',
      endpoint7: '/pdf',
      endpoint8: '/chart',
      description: 'Fetches IBJA gold rates in India'
    });
    return;
  }

  if (urlPath === '/latest') {
    // Apply the general rate limiter middleware
    applyRateLimit(generalLimiter)(req, res, () => handleLatestGoldRequest(req, res));
    return;
  }

  // Fallback for unknown routes directed to this file by vercel.json
  res.status(404).json({ error: 'Endpoint not found' });
};