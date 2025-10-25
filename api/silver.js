const axios = require('axios');
const cheerio = require('cheerio');
const { generalLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter
const { generateRSSFeed, formatRatesForRSS, getMonthFilter, filterItemsByMonth } = require('./_rssUtils');

// Core logic for fetching silver rates
const handleSilverRequest = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    // Try finding specific silver labels first
    let silverAM = $(`#lblSilver999_AM`).text().trim() || null;
    let silverPM = $(`#lblSilver999_PM`).text().trim() || null;

    // Fallback: If labels aren't present/updated, parse from history table
    if (!silverAM && !silverPM) {
        console.log("Silver labels not found, parsing from history table...");
        const parseTable = (tabId) => {
          const rows = $(`${tabId} table tbody tr`);
          // Find the first row with a valid silver rate
          for (let i = 0; i < rows.length; i++) {
            const cells = $(rows[i]).find('td');
            if (cells.length === 7) {
              const silverRate = $(cells[6]).text().trim();
              if (silverRate) return silverRate;
            }
          }
          return null; // Return null if no valid rate found
        };

        silverAM = parseTable('#tab-am');
        silverPM = parseTable('#tab-pm');
    }

    if (!silverAM && !silverPM) {
        console.warn('No silver rates found via labels or history table.');
        return res.status(404).json({ error: 'Silver rates not available currently.' });
    }

    const now = new Date();

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate'); // 2 hours
    res.status(200).json({
      date: now.toISOString().split('T')[0],
      lblSilver999_AM: silverAM,
      lblSilver999_PM: silverPM || silverAM // Fallback PM to AM if PM is missing
    });

  } catch (error) {
    console.error('Error scraping silver rates:', error.message);
    res.status(500).json({ error: 'Failed to fetch silver rates' });
  }
};

// RSS feed handler for silver rates
const handleSilverRSSFeed = async (req, res) => {
  try {
    const monthFilter = getMonthFilter(req);
    
    // Only provide current rates - no fake historical data
    const currentRates = await getCurrentSilverRates();
    
    if (!currentRates) {
      return res.status(404).json({ error: 'Silver rates not available for RSS feed' });
    }

    // Only current rates in RSS
    const rssItems = [{
      title: `Silver Rates - ${currentRates.date}`,
      description: `Current IBJA Silver Rates: ${formatRatesForRSS(currentRates, 'silver')}`,
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
      'IBJA Silver Rates RSS Feed',
      'Current silver rates from India Bullion and Jewellers Association (IBJA)',
      rssItems,
      baseUrl,
      '/silver/latest'
    );

    res.setHeader('Content-Type', 'application/rss+xml; charset=UTF-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(rssContent);

  } catch (error) {
    console.error('Error generating silver RSS feed:', error.message);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
};

// Helper function to get current silver rates
const getCurrentSilverRates = async () => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    let silverAM = $(`#lblSilver999_AM`).text().trim() || null;
    let silverPM = $(`#lblSilver999_PM`).text().trim() || null;

    // Fallback parsing if needed
    if (!silverAM && !silverPM) {
      const parseTable = (tabId) => {
        const rows = $(`${tabId} table tbody tr`);
        for (let i = 0; i < rows.length; i++) {
          const cells = $(rows[i]).find('td');
          if (cells.length === 7) {
            const silverRate = $(cells[6]).text().trim();
            if (silverRate) return silverRate;
          }
        }
        return null;
      };

      silverAM = parseTable('#tab-am');
      silverPM = parseTable('#tab-pm');
    }

    if (!silverAM && !silverPM) return null;

    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      lblSilver999_AM: silverAM,
      lblSilver999_PM: silverPM || silverAM
    };
  } catch (error) {
    console.error('Error fetching current silver rates:', error.message);
    return null;
  }
};

// Main export - router and middleware application
module.exports = async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/' || urlPath === '' || urlPath === '/silver') {
    // Root route for silver - no rate limit
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      message: 'Welcome to the IBJA Silver API',
      endpoint1: '/latest',
      endpoint2: '/latest/rss (RSS Feed with optional ?m=YYYY-MM filter)',
      description: 'Fetches IBJA silver rates in India'
    });
    return;
  }

  if (urlPath.endsWith('/rss') && urlPath.includes('/latest')) {
    // RSS feed endpoint
    applyRateLimit(generalLimiter)(req, res, () => handleSilverRSSFeed(req, res));
    return;
  }

  // Assume any other path under /silver is /latest
  if (urlPath.includes('/latest') || urlPath === '/silver/latest') {
     applyRateLimit(generalLimiter)(req, res, () => handleSilverRequest(req, res));
     return;
  }

  // Fallback
  res.status(404).json({ error: 'Endpoint not found' });
};