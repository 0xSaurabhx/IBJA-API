const axios = require('axios');
const cheerio = require('cheerio');
const { utilityLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

// Core logic for fetching PDF link
const handlePdfRequest = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    // Find the "Previous 30 Days" PDF link more reliably
    let pdfLink = null;
    let pdfTitle = null;

    // Search specifically within known sections if possible, otherwise broaden search
    // Example: Searching within a specific div ID if known: $('#someDivId a[href*=".pdf"]')
    $('a[href$=".pdf"]').each((i, elem) => { // Use href$=".pdf" for ends with PDF
      const href = $(elem).attr('href');
      const text = $(elem).text().trim().toLowerCase(); // Normalize text

      // Look for keywords
      if (text.includes('previous 30 days') || text.includes('last 30 days') || text.includes('30 day')) {
        // Basic validation on href
        if (href && href.length > 4) {
             pdfLink = href;
             pdfTitle = $(elem).text().trim(); // Use original case for title
             return false; // Stop iteration once found
        }
      }
    });

    if (!pdfLink) {
      console.warn('Could not find the last 30 days PDF link on the page.');
      return res.status(404).json({
        error: 'PDF link not found',
        message: 'Could not find the last 30 days PDF link on the IBJA website. The structure might have changed.'
      });
    }

    // Convert relative URL to absolute URL robustly
    const baseUrl = 'https://www.ibjarates.com';
    let absoluteUrl;
    try {
        // Use URL constructor for safer joining
        absoluteUrl = new URL(pdfLink, baseUrl).href;
    } catch (urlError) {
        console.error(`Error constructing absolute URL from base '${baseUrl}' and link '${pdfLink}':`, urlError.message);
        // Fallback or simple concatenation if URL constructor fails
        absoluteUrl = pdfLink.startsWith('http') ? pdfLink : `${baseUrl}/${pdfLink.replace(/^\.\.\//, '').replace(/^\//, '')}`;
    }


    const now = new Date();

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour cache
    res.status(200).json({
      title: pdfTitle || 'Previous 30 Days Historical Data', // Provide default title
      description: 'Daily Opening and Closing Market Rate PDF (Gold & Silver)',
      downloadUrl: absoluteUrl,
      directLink: absoluteUrl,
      fileType: 'PDF',
      period: 'Last 30 Days', // Approximate
      lastChecked: now.toISOString(), // More accurate field name
      source: baseUrl
    });

  } catch (error) {
    console.error('Error fetching PDF link:', error.message);
    res.status(500).json({ error: 'Failed to fetch PDF download link' });
  }
};

// Main export - router and middleware application
module.exports = async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/' || urlPath === '' || urlPath === '/pdf') {
    // Root route for pdf - no rate limit
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({
      message: 'IBJA PDF Downloads API',
      endpoint: '/last30',
      description: 'Returns PDF download links for historical data'
    });
    return;
  }

  if (urlPath.includes('/last30')) {
     applyRateLimit(utilityLimiter)(req, res, () => handlePdfRequest(req, res));
     return;
  }

  // Fallback
  res.status(404).json({ error: 'Endpoint not found' });
};