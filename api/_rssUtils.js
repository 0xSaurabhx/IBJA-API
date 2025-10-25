const generateRSSFeed = (title, description, items, baseUrl, endpoint) => {
  const now = new Date();
  
  const rssItems = items.map(item => {
    const pubDate = new Date(item.date || now).toUTCString();
    const guid = `${baseUrl}${endpoint}#${item.date || now.toISOString()}`;
    
    return `
    <item>
      <title>${item.title}</title>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${guid}</guid>
      <link>${baseUrl}${endpoint}</link>
    </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}${endpoint}/rss" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <pubDate>${now.toUTCString()}</pubDate>
    <ttl>120</ttl>
    <generator>IBJA API RSS Generator</generator>
    ${rssItems}
  </channel>
</rss>`;
};

// Format rates for RSS display
const formatRatesForRSS = (rates, type) => {
  const rateEntries = Object.entries(rates)
    .filter(([key, value]) => key !== 'date' && value !== null)
    .map(([key, value]) => {
      const cleanKey = key.replace(/^lbl/, '').replace(/_/g, ' ');
      return `${cleanKey}: ₹${value}`;
    });
  
  return rateEntries.join(', ');
};

// Get month filter from query parameters
const getMonthFilter = (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const monthParam = url.searchParams.get('m');
  
  if (!monthParam) return null;
  
  // Parse month parameter (format: YYYY-MM)
  const monthMatch = monthParam.match(/^(\d{4})-(\d{1,2})$/);
  if (!monthMatch) return null;
  
  const year = parseInt(monthMatch[1]);
  const month = parseInt(monthMatch[2]);
  
  if (month < 1 || month > 12) return null;
  
  return { year, month, monthString: monthParam };
};

// Filter items by month
const filterItemsByMonth = (items, monthFilter) => {
  if (!monthFilter) return items;
  
  return items.filter(item => {
    if (!item.date) return false;
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === monthFilter.year && 
           itemDate.getMonth() + 1 === monthFilter.month;
  });
};

module.exports = {
  generateRSSFeed,
  formatRatesForRSS,
  getMonthFilter,
  filterItemsByMonth
};