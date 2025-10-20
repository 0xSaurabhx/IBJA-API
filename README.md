# IBJA Gold API

A simple API to fetch gold rates from the Indian Bullion & Jewellers Association (IBJA) website. This API scrapes the IBJA website and provides current and historical gold rates in JSON format.

## Features

- 🏆 Get latest gold rates for different purities
- 🥈 Get latest silver rates (999 purity) - uses most recent historical data when live rates unavailable
- 📊 Fetch historical gold rate data (AM & PM sessions)
- 💱 Multi-currency support with live exchange rates
- ⏱️ Check API uptime and status
- ⚡ Fast response with caching (2 hours)
- 🚀 Deployed on Vercel for high availability

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
  "endpoint2": "/history",
  "endpoint3": "/silver",
  "endpoint4": "/uptime",
  "endpoint5": "/convert",
  "description": "Fetches IBJA gold rates in India"
}
```

### 2. Latest Gold Rates
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

### 3. Latest Silver Rates
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

### 4. Historical Rates
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

### 5. Currency Converter
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

### 6. Uptime Status
```
GET /uptime
```
Returns the API uptime status and current timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T10:30:00.000Z",
  "uptime": 123.45,
  "message": "IBJA API is running"
}
```

## Gold Purity Types

- **999**: 24 Karat (99.9% pure gold)
- **995**: 24 Karat (99.5% pure gold)
- **916**: 22 Karat (91.6% pure gold)
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

3. For local development, you can use Vercel CLI:
```bash
npm install -g vercel
vercel dev
```

4. The API will be available at `http://localhost:3000`

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
const goldResponse = await fetch('/latest');
const goldData = await goldResponse.json();

// Convert 10 grams of 999 gold to USD
const goldRateINR = parseFloat(goldData.lblGold999_AM);
const totalValueINR = goldRateINR * 10; // 10 grams

const usdResponse = await fetch(`/convert?from=INR&to=USD&amount=${totalValueINR}`);
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
