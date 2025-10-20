const axios = require('axios');

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/INR';

// Cache exchange rates for 1 hour
let exchangeRates = null;
let ratesLastUpdated = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getExchangeRates() {
  const now = Date.now();

  if (!exchangeRates || !ratesLastUpdated || (now - ratesLastUpdated) > CACHE_DURATION) {
    try {
      const response = await axios.get(EXCHANGE_RATE_API);
      exchangeRates = response.data.rates;
      ratesLastUpdated = now;
      console.log('Exchange rates updated:', new Date().toISOString());
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      // Return cached rates if available, otherwise throw error
      if (!exchangeRates) {
        throw new Error('Unable to fetch exchange rates');
      }
    }
  }

  return exchangeRates;
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const from = url.searchParams.get('from') || 'INR';
    const to = url.searchParams.get('to');
    const amount = parseFloat(url.searchParams.get('amount')) || 1;

    if (!to) {
      return res.status(400).json({
        error: 'Missing required parameter: to',
        usage: '/convert?from=INR&to=USD&amount=1000'
      });
    }

    const rates = await getExchangeRates();

    if (!rates[from] || !rates[to]) {
      return res.status(400).json({
        error: 'Unsupported currency',
        supported: Object.keys(rates).slice(0, 20) // Show first 20 currencies
      });
    }

    // Convert amount from 'from' currency to 'to' currency
    const convertedAmount = (amount / rates[from]) * rates[to];

    // ✅ Cache for 1 hour since exchange rates don't change that frequently
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({
      from,
      to,
      amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      rate: rates[to] / rates[from],
      lastUpdated: ratesLastUpdated ? new Date(ratesLastUpdated).toISOString() : null
    });

  } catch (error) {
    console.error('Currency conversion error:', error.message);
    res.status(500).json({ error: 'Currency conversion failed' });
  }
};