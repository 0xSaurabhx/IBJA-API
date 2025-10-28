# IBJA Gold API

A simple API to fetch gold rates from the Indian Bullion & Jewellers Association (IBJA) website. This API scrapes the IBJA website and provides current and historical gold rates in JSON format.

## Features

- ✅ **Gold Rates**: Real-time gold rates for multiple purities (999, 995, 916, 750, 585)
- ✅ **Silver Rates**: Live silver rates with historical data fallback
- ✅ **Platinum Rates**: Current platinum rates for 999 purity
- ✅ **RSS Feeds**: XML RSS feeds for all precious metals with monthly filtering support
- ✅ **Historical Data**: AM/PM trading session data with comprehensive rate history
- ✅ **Chart Data**: Historical comparison between 999 and 916 gold purity rates for visualization
- ✅ **Multi-Currency Support**: Convert rates to USD, EUR, GBP, and other currencies using live exchange rates
- ✅ **PDF Downloads**: Direct download links for last 30 days historical data
- ✅ **Uptime Monitoring**: API health check endpoint
- ✅ **API Documentation**: Interactive Swagger/OpenAPI documentation
- ✅ **Serverless Deployment**: Hosted on Vercel for high availability
- ✅ **Caching**: Optimized response times with intelligent caching (2 hours for rates, 1 hour for exchange rates)
- ✅ **Error Handling**: Robust error handling with meaningful error messages

## Documentation

🔍 **Interactive API Documentation**: Visit `/api-docs` for comprehensive Swagger documentation with live testing capabilities.

- **Local Development**: http://localhost:3000/api-docs
- **Production**: https://ibja-api.vercel.app/api-docs

## API Endpoints

### 1. Root Endpoint

```
GET /
```

Returns API information and available endpoints.

**Response:**

```json
{
  "message": "Welcome to the IBJA Gold API",
  "endpoint1": "/latest",
  "endpoint2": "/latest/rss (RSS Feed with optional ?m=YYYY-MM filter)",
  "endpoint3": "/history",
  "endpoint4": "/silver",
  "endpoint5": "/silver/latest",
  "endpoint6": "/silver/latest/rss",
  "endpoint7": "/uptime",
  "endpoint8": "/convert",
  "endpoint9": "/platinum",
  "endpoint10": "/platinum/latest",
  "endpoint11": "/platinum/latest/rss",
  "endpoint12": "/pdf",
  "endpoint13": "/chart",
  "description": "Fetches IBJA gold rates in India"
}
```

### 2. Gold RSS Feed

```
GET /latest/rss
GET /latest/rss?m=YYYY-MM
```

Returns an XML RSS feed with current gold rates. Supports optional monthly filtering.

**Parameters:**

- `m` (optional): Month filter in YYYY-MM format (e.g., `?m=2025-10`)

**Response Headers:**

- `Content-Type: application/rss+xml; charset=UTF-8`

**Example RSS Output:**

```xml
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>IBJA Gold Rates RSS Feed</title>
    <description>Current gold rates from India Bullion and Jewellers Association (IBJA)</description>
    <link>https://yourdomain.com</link>
    <atom:link href="https://yourdomain.com/latest/rss" rel="self" type="application/rss+xml"/>
    <lastBuildDate>Wed, 25 Oct 2025 12:00:00 GMT</lastBuildDate>
    <generator>IBJA API RSS Generator</generator>
    <item>
      <title>Gold Rates - 2025-10-25</title>
      <description>Current IBJA Gold Rates: Gold999 AM: ₹7850.00, Gold916 AM: ₹7190.00</description>
      <pubDate>Wed, 25 Oct 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

### 3. Latest Gold Rates

```
GET /latest
```

Fetches the current gold rates for different purities in both AM and PM sessions.

**Response:**

```json
{
  "date": "2025-08-07",
  "lblGold999_AM": "7850.00",
  "lblGold995_AM": "7810.00",
  "lblGold916_AM": "7190.00",
  "lblGold750_AM": "5890.00",
  "lblGold585_AM": "4595.00",
  "lblGold585_PM": "4595.00",
  "lblGold750_PM": "5890.00",
  "lblGold916_PM": "7190.00",
  "lblGold995_PM": "7810.00",
  "lblGold999_PM": "7850.00"
}
```

### 4. Silver RSS Feed

```
GET /silver/latest/rss
GET /silver/latest/rss?m=YYYY-MM
```

Returns an XML RSS feed with current silver rates. Supports optional monthly filtering.

**Parameters:**

- `m` (optional): Month filter in YYYY-MM format (e.g., `?m=2025-10`)

**Response Headers:**

- `Content-Type: application/rss+xml; charset=UTF-8`

**Example RSS Output:**

```xml
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>IBJA Silver Rates RSS Feed</title>
    <description>Current silver rates from India Bullion and Jewellers Association (IBJA)</description>
    <link>https://yourdomain.com</link>
    <atom:link href="https://yourdomain.com/silver/latest/rss" rel="self" type="application/rss+xml"/>
    <lastBuildDate>Wed, 25 Oct 2025 12:00:00 GMT</lastBuildDate>
    <generator>IBJA API RSS Generator</generator>
    <item>
      <title>Silver Rates - 2025-10-25</title>
      <description>Current IBJA Silver Rates: Silver999 AM: ₹95.50, Silver999 PM: ₹94.20</description>
      <pubDate>Wed, 25 Oct 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

### 5. Latest Silver Rates

```
GET /silver
GET /silver/latest
```

Fetches the current silver rates for 999 purity in both AM and PM sessions. Returns the most recent historical rates when live rates are not yet available.

**Response:**

```json
{
  "date": "2025-08-07",
  "lblSilver999_AM": "171275",
  "lblSilver999_PM": "169230"
}
```

### 6. Platinum RSS Feed

```
GET /platinum/latest/rss
GET /platinum/latest/rss?m=YYYY-MM
```

Returns an XML RSS feed with current platinum rates. Supports optional monthly filtering.

**Parameters:**

- `m` (optional): Month filter in YYYY-MM format (e.g., `?m=2025-10`)

**Response Headers:**

- `Content-Type: application/rss+xml; charset=UTF-8`

**Example RSS Output:**

```xml
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>IBJA Platinum Rates RSS Feed</title>
    <description>Current platinum rates from India Bullion and Jewellers Association (IBJA)</description>
    <link>https://yourdomain.com</link>
    <atom:link href="https://yourdomain.com/platinum/latest/rss" rel="self" type="application/rss+xml"/>
    <lastBuildDate>Wed, 25 Oct 2025 12:00:00 GMT</lastBuildDate>
    <generator>IBJA API RSS Generator</generator>
    <item>
      <title>Platinum Rates - 2025-10-25</title>
      <description>Current IBJA Platinum Rates: Platinum999 AM: ₹3200.00, Platinum999 PM: ₹3180.00</description>
      <pubDate>Wed, 25 Oct 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

### 7. Latest Platinum Rates

```
GET /platinum
GET /platinum/latest
```

Fetches the current platinum rates for 999 purity in both AM and PM sessions.

**Response:**

```json
{
  "date": "2025-08-07",
  "lblPlatinum999_AM": "3200.00",
  "lblPlatinum999_PM": "3180.00"
}
```

### 8. Historical Rates

```
GET /history
```

Fetches historical gold rates data for both AM and PM trading sessions.

**Response:**

```json
{
  "updated": "2025-08-07T12:30:00.000Z",
  "am": [
    {
      "date": "07/08/2025",
      "gold_999": "7850.00",
      "gold_995": "7810.00",
      "gold_916": "7190.00",
      "gold_750": "5890.00",
      "gold_585": "4595.00",
      "silver_999": "95.50"
    }
  ],
  "pm": [
    {
      "date": "07/08/2025",
      "gold_999": "7850.00",
      "gold_995": "7810.00",
      "gold_916": "7190.00",
      "gold_750": "5890.00",
      "gold_585": "4595.00",
      "silver_999": "95.50"
    }
  ]
}
```

### 9. Currency Converter

```
GET /convert?from=INR&to=USD&amount=1000
```

Converts currency amounts using live exchange rates.

**Parameters:**

- `from` (optional): Source currency (default: INR)
- `to` (required): Target currency (e.g., USD, EUR, GBP)
- `amount` (optional): Amount to convert (default: 1)

**Response:**

```json
{
  "from": "INR",
  "to": "USD",
  "amount": 1000,
  "convertedAmount": 11.85,
  "rate": 0.01185,
  "lastUpdated": "2025-10-20T10:30:00.000Z"
}
```

### 10. Chart Data Comparison

```
GET /chart
GET /chart/comparison
```

Returns historical chart data comparing 999 and 916 gold purity rates for visualization.

**Response:**

```json
{
  "title": "Gold Purity Comparison (999 vs 916)",
  "description": "Historical comparison between 999 and 916 gold purity rates",
  "lastUpdated": "2025-10-22T11:00:00.000Z",
  "statistics": {
    "average_999": 7850.00,
    "average_916": 7190.00,
    "average_difference": 660.00,
    "total_records": 20,
    "valid_records": 20
  },
  "data": [
    {
      "date": "22/10/2025",
      "session": "AM",
      "gold_999": 7850.00,
      "gold_916": 7190.00,
      "difference": 660.00,
      "purity_ratio": "1.0918"
    }
  ],
  "am": [...],
  "pm": [...]
}
```

### 11. Uptime Status

```
GET /uptime
```

Returns the API uptime status and current timestamp.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-10-22T11:00:00.000Z",
  "uptime": 123.45,
  "message": "IBJA API is running"
}
```

### 12. Rate Changes & Tracking

#### 12.1 Daily Rate Changes

```
GET /changes
```

Returns rate changes since yesterday with trend analysis.

**Response:**

```json
{
  "current": {
    "timestamp": "2025-10-27T10:00:00.000Z",
    "rates": { "lblGold999_AM": "65000", "lblGold916_AM": "59500" }
  },
  "previous": {
    "timestamp": "2025-10-26T10:00:00.000Z",
    "rates": { "lblGold999_AM": "64500", "lblGold916_AM": "59000" }
  },
  "changes": {
    "lblGold999_AM": {
      "current": 65000,
      "previous": 64500,
      "change": 500,
      "changePercent": 0.775,
      "trend": "up"
    }
  },
  "summary": {
    "totalChanges": 10,
    "upTrends": 6,
    "downTrends": 2,
    "stable": 2,
    "biggestGainer": { "rate": "lblGold999_AM", "change": 0.775 },
    "biggestLoser": { "rate": "lblGold750_PM", "change": -0.2 }
  }
}
```

#### 12.2 Hourly Rate Tracking

```
GET /changes/hourly
```

Returns hourly rate tracking data for the current day.

**Response:**

```json
{
  "date": "2025-10-27",
  "hourlyData": {
    "09:00": [{ "timestamp": "2025-10-27T09:15:00.000Z", "rates": {...} }],
    "10:00": [{ "timestamp": "2025-10-27T10:30:00.000Z", "rates": {...} }]
  },
  "totalEntries": 15,
  "summary": {
    "activeHours": 6,
    "peakActivityHour": "10:00",
    "totalDataPoints": 15
  }
}
```

#### 12.3 Weekly Trends

```
GET /changes/weekly
```

Returns weekly rate trends and analysis.

**Response:**

```json
{
  "current": { "timestamp": "2025-10-27T10:00:00.000Z", "rates": {...} },
  "weekAgo": { "timestamp": "2025-10-20T10:00:00.000Z", "rates": {...} },
  "weeklyChanges": {
    "lblGold999_AM": {
      "current": 65000,
      "previous": 64000,
      "change": 1000,
      "changePercent": 1.5625,
      "trend": "up"
    }
  },
  "weeklyHighLow": {
    "2025-10-27": { "lblGold999_AM": { "high": 65200, "low": 64800, "range": 400 } },
    "2025-10-26": { "lblGold999_AM": { "high": 64600, "low": 64200, "range": 400 } }
  },
  "summary": {
    "daysTracked": 7,
    "overallTrend": "bullish",
    "dataAvailability": "complete"
  }
}
```

#### 12.4 Daily High/Low Rates

```
GET /changes/highs
GET /changes/highs?date=2025-10-27
```

Returns daily high and low rates for a specific date (defaults to today).

**Parameters:**

- `date` (optional): Date in YYYY-MM-DD format

**Response:**

```json
{
  "date": "2025-10-27",
  "highLow": {
    "lblGold999_AM": {
      "high": 65200,
      "low": 64800,
      "range": 400
    },
    "lblGold916_AM": {
      "high": 59800,
      "low": 59200,
      "range": 600
    }
  },
  "summary": {
    "lblGold999_AM": {
      "volatility": "0.62%",
      "midpoint": "65000.00"
    }
  }
}
```

## RSS Feed Features

The API provides RSS feeds for all precious metals, allowing you to subscribe to rate updates in your favorite RSS reader.

### 📡 RSS Endpoint Summary

| Metal        | RSS Endpoint           | Description                           |
| ------------ | ---------------------- | ------------------------------------- |
| **Gold**     | `/latest/rss`          | Current gold rates for all purities   |
| **Silver**   | `/silver/latest/rss`   | Current silver rates for 999 purity   |
| **Platinum** | `/platinum/latest/rss` | Current platinum rates for 999 purity |

### 🔧 RSS Features

- **XML Format**: Standard RSS 2.0 format with Atom namespace support
- **Monthly Filtering**: Use `?m=YYYY-MM` parameter to filter by specific month
- **Current Data Only**: RSS feeds contain only current rates (no historical data)
- **Proper Headers**: Correct `Content-Type: application/rss+xml` headers
- **Caching**: RSS feeds are cached for 1 hour for optimal performance
- **Error Handling**: Graceful error responses for invalid month filters

### 📅 Monthly Filtering Examples

```bash
# Get current month's rates
GET /latest/rss

# Get rates for October 2025
GET /latest/rss?m=2025-10

# Get silver rates for specific month
GET /silver/latest/rss?m=2025-10

# Get platinum rates for specific month
GET /platinum/latest/rss?m=2025-10
```

### 🚨 RSS Limitations

- Only current month data is available
- Historical month requests will return an error
- Feeds contain single current rate entry (not historical timeline)
- Month filter validation: returns error if requested month doesn't match current month

## Precious Metals Supported

This API provides rates for three major precious metals:

### 🏆 Gold (Au)

- **Purities**: 999, 995, 916, 750, 585
- **Trading Sessions**: AM (Morning) & PM (Evening)
- **Rate Format**: Per 10 grams
- **JSON Endpoint**: `/latest`
- **RSS Feed**: `/latest/rss`

### 🥈 Silver (Ag)

- **Purity**: 999 (99.9% pure)
- **Trading Sessions**: AM (Morning) & PM (Evening)
- **Rate Format**: Per 1 kg
- **JSON Endpoint**: `/silver/latest`
- **RSS Feed**: `/silver/latest/rss`

### 🥉 Platinum (Pt)

- **Purity**: 999 (99.9% pure)
- **Trading Sessions**: Single daily rate
- **Rate Format**: Per gram
- **JSON Endpoint**: `/platinum/latest`
- **RSS Feed**: `/platinum/latest/rss`

## Gold Purity Types

- **999**: 24 Karat (99.9% pure gold)
- **995**: 24 Karat (99.5% pure gold)
- **916**: 22 Karat (91.6% pure gold) - Most common in jewelry
- **750**: 18 Karat (75.0% pure gold)
- **585**: 14 Karat (58.5% pure gold)

## Technology Stack

- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Web Scraping**: Axios + Cheerio
- **Deployment**: Vercel
- **Cache**: 2-hour server-side caching

## Installation & Local Development

1. Clone the repository:

```bash
git clone <repository-url>
cd IBJA-API
```

2. Install dependencies:

```bash
npm install
```

3. For local development with Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

4. Alternatively, for local development with nodemon (auto-reload on file changes):

```bash
# Install nodemon globally (if not already installed)
npm install -g nodemon

# Start the development server with auto-reload
nodemon server.js
or
npm run dev
```

5. The API will be available at `http://localhost:3000`

## Deployment

This project is configured for Vercel deployment using the `vercel.json` configuration file.

To deploy:

```bash
vercel --prod
```

## Currency Converter

The API includes a powerful currency converter that uses live exchange rates to convert between different currencies. This is particularly useful for international users who want to understand gold and silver rates in their local currency.

### Supported Currencies

The converter supports 160+ currencies including:

- **Major currencies**: USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY
- **Regional currencies**: INR (Indian Rupee), AED, SAR, SGD, HKD, etc.
- **Cryptocurrencies**: BTC, ETH (limited support)

### Usage Examples

```bash
# Convert 1000 INR to USD
GET /convert?from=INR&to=USD&amount=1000

# Convert 1 USD to EUR (default amount is 1)
GET /convert?to=EUR

# Convert 5000 INR to GBP
GET /convert?from=INR&to=GBP&amount=5000
```

### Integration with Gold Rates

You can combine the currency converter with gold rates:

```javascript
// Get gold rate in INR
const goldResponse = await fetch("/latest");
const goldData = await goldResponse.json();

// Convert 10 grams of 999 gold to USD
const goldRateINR = parseFloat(goldData.lblGold999_AM);
const totalValueINR = goldRateINR * 10; // 10 grams

const usdResponse = await fetch(
  `/convert?from=INR&to=USD&amount=${totalValueINR}`
);
const usdData = await usdResponse.json();

console.log(`10g of 999 gold costs: $${usdData.convertedAmount}`);
```

### Exchange Rate Updates

- Exchange rates are cached for 1 hour to ensure fast responses
- Rates are sourced from reliable forex APIs
- Automatic fallback to cached rates if the API is temporarily unavailable

## Error Handling

The API includes proper error handling:

- 404 for unknown endpoints
- 500 for scraping failures
- Graceful fallbacks for missing data

## Data Source

This API scrapes data from [IBJA Rates](https://www.ibjarates.com). Please ensure you comply with their terms of service when using this API.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License

## Disclaimer

This API is for informational purposes only. Gold rates are subject to market fluctuations. Always verify rates from official sources before making financial decisions.

---

**Note**: This is an unofficial API and is not affiliated with IBJA. Use at your own risk.
