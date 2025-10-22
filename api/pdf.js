const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  if (req.url === '/' || req.url === '') {
    // ✅ Root route response with cache header
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour cache for PDF links
    res.status(200).json({
      message: 'IBJA PDF Downloads API',
      endpoint: '/last30',
      description: 'Returns PDF download links for historical data'
    });
    return;
  }

  if (req.url.includes('last30') || req.url === '/last30') {
    try {
      const { data } = await axios.get('https://www.ibjarates.com');
      const $ = cheerio.load(data);

      // Find the "Previous 30 Days" PDF link
      let pdfLink = null;
      let pdfTitle = null;

      $('a[href*=".pdf"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        if (text.includes('Previous 30 Days') || text.includes('30 Days')) {
          pdfLink = href;
          pdfTitle = text;
        }
      });

      if (!pdfLink) {
        return res.status(404).json({
          error: 'PDF link not found',
          message: 'Could not find the last 30 days PDF on the website'
        });
      }

      // Convert relative URL to absolute URL
      const baseUrl = 'https://www.ibjarates.com';
      const absoluteUrl = pdfLink.startsWith('http') ? pdfLink : baseUrl + '/' + pdfLink.replace('../', '');

      const now = new Date();

      // ✅ Cache for 1 hour since PDF links don't change frequently
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      res.status(200).json({
        title: pdfTitle || 'Previous 30 Days',
        description: 'Daily Opening and Closing Market Rate PDF',
        downloadUrl: absoluteUrl,
        directLink: absoluteUrl,
        fileType: 'PDF',
        period: 'Last 30 Days',
        lastUpdated: now.toISOString(),
        source: 'IBJA Rates'
      });

    } catch (error) {
      console.error('Error fetching PDF link:', error.message);
      res.status(500).json({ error: 'Failed to fetch PDF download link' });
    }
    return;
  }

  // Fallback
  res.status(404).json({ error: 'Endpoint not found' });
};