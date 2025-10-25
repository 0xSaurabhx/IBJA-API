const axios = require('axios');
const cheerio = require('cheerio');
const { generalLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter
const { generateRSSFeed, formatRatesForRSS, getMonthFilter, filterItemsByMonth } = require('./_rssUtils');

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

// RSS feed handler for gold rates
const handleGoldRSSFeed = async (req, res) => {
  try {
    const monthFilter = getMonthFilter(req);
    
    // Only provide current rates - no fake historical data
    const currentRates = await getCurrentGoldRates();
    
    if (!currentRates) {
      return res.status(404).json({ error: 'Gold rates not available for RSS feed' });
    }

    // Only current rates in RSS
    const rssItems = [{
      title: `Gold Rates - ${currentRates.date}`,
      description: `Current IBJA Gold Rates: ${formatRatesForRSS(currentRates, 'gold')}`,
      date: currentRates.date
    }];

    // If month filter is provided and doesn't match current month, return error
    if (monthFilter) {
      const currentDate = new Date();
      const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
      const requestedMonth = monthFilter.year + '-' + String(monthFilter.month).padStart(2, '0');
      
      if (currentMonth !== requestedMonth) {
        return res.status(404).json({ 
          error: `Historical data not available. Only current month (${currentMonth}) data is available.`,
          availableMonth: currentMonth,
          requestedMonth: requestedMonth
        });
      }
    }

    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const rssContent = generateRSSFeed(
      'IBJA Gold Rates RSS Feed',
      'Current gold rates from India Bullion and Jewellers Association (IBJA)',
      rssItems,
      baseUrl,
      '/latest'
    );

    res.setHeader('Content-Type', 'application/rss+xml; charset=UTF-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour cache for RSS
    res.status(200).send(rssContent);

  } catch (error) {
    console.error('Error generating gold RSS feed:', error.message);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
};

// Helper function to get current gold rates
const getCurrentGoldRates = async () => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const result = {};
    GOLD_IDS.forEach(id => {
      const text = $(`#${id}`).text().trim();
      result[id] = text || null;
    });

    const foundRates = Object.values(result).some(rate => rate !== null);
    if (!foundRates) return null;

    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      ...result
    };
  } catch (error) {
    console.error('Error fetching current gold rates:', error.message);
    return null;
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
      endpoint2: '/latest/rss (RSS Feed with optional ?m=YYYY-MM filter)',
      endpoint3: '/history',
      endpoint4: '/silver',
      endpoint5: '/silver/latest',
      endpoint6: '/silver/latest/rss',
      endpoint7: '/uptime',
      endpoint8: '/convert',
      endpoint9: '/platinum',
      endpoint10: '/platinum/latest',
      endpoint11: '/platinum/latest/rss',
      endpoint12: '/pdf',
      endpoint13: '/chart',
      description: 'Fetches IBJA gold rates in India'
    });
    return;
  }

  if (urlPath === '/latest/rss') {
    // Apply rate limiter for RSS feed
    applyRateLimit(generalLimiter)(req, res, () => handleGoldRSSFeed(req, res));
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