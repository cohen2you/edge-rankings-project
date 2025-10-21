// Polygon.io API Integration for Technical Indicators and Market Data

export interface PolygonStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  technicalIndicators: {
    rsi: number;
    macd: string; // 'Bullish', 'Bearish', or 'Neutral'
    movingAverages: {
      sma20: number;
      sma50: number;
      sma100: number;
      sma200: number;
    };
  };
}

export async function fetchPolygonStockData(symbol: string, apiKey: string): Promise<PolygonStockData> {
  console.log(`🔵 [POLYGON] Starting fetch for ${symbol}`);
  
  try {
    // Fetch current quote data
    const quoteUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;
    console.log(`🔵 [POLYGON] Calling quote URL for ${symbol}`);
    
    const quoteRes = await fetch(quoteUrl);
    
    if (!quoteRes.ok) {
      console.log(`❌ [POLYGON] Failed to fetch quote for ${symbol}: ${quoteRes.status}`);
      throw new Error(`Failed to fetch quote data: ${quoteRes.status}`);
    }
    
    const quoteData = await quoteRes.json();
    console.log(`🔵 [POLYGON] Quote data for ${symbol}:`, JSON.stringify(quoteData, null, 2));
    
    const bar = quoteData.results?.[0];
    if (!bar) {
      throw new Error('No price data available');
    }
    
    // Fetch ticker details for market cap
    const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;
    console.log(`🔵 [POLYGON] Calling details URL for ${symbol}`);
    
    const detailsRes = await fetch(detailsUrl);
    let marketCap = 0;
    
    if (detailsRes.ok) {
      const detailsData = await detailsRes.json();
      marketCap = detailsData.results?.market_cap || 0;
      console.log(`🔵 [POLYGON] Market cap for ${symbol}: ${marketCap}`);
    }
    
    // Fetch SMA data (Simple Moving Averages)
    const today = new Date();
    const toDate = today.toISOString().split('T')[0];
    const fromDate = new Date(today.getTime() - 250 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // ~250 trading days
    
    const smaUrl = `https://api.polygon.io/v1/indicators/sma/${symbol}?timespan=day&adjusted=true&window=50&series_type=close&order=desc&limit=1&timestamp.gte=${fromDate}&timestamp.lte=${toDate}&apiKey=${apiKey}`;
    console.log(`🔵 [POLYGON] Calling SMA URL for ${symbol}`);
    
    let sma50 = 0, sma200 = 0;
    
    // Fetch 50-day SMA
    const sma50Res = await fetch(smaUrl);
    if (sma50Res.ok) {
      const sma50Data = await sma50Res.json();
      sma50 = sma50Data.results?.values?.[0]?.value || 0;
      console.log(`🔵 [POLYGON] 50-day SMA for ${symbol}: ${sma50}`);
    }
    
    // Fetch 200-day SMA
    const sma200Url = smaUrl.replace('window=50', 'window=200');
    const sma200Res = await fetch(sma200Url);
    if (sma200Res.ok) {
      const sma200Data = await sma200Res.json();
      sma200 = sma200Data.results?.values?.[0]?.value || 0;
      console.log(`🔵 [POLYGON] 200-day SMA for ${symbol}: ${sma200}`);
    }
    
    // Fetch RSI
    const rsiUrl = `https://api.polygon.io/v1/indicators/rsi/${symbol}?timespan=day&adjusted=true&window=14&series_type=close&order=desc&limit=1&timestamp.gte=${fromDate}&timestamp.lte=${toDate}&apiKey=${apiKey}`;
    console.log(`🔵 [POLYGON] Calling RSI URL for ${symbol}`);
    
    let rsi = 0;
    const rsiRes = await fetch(rsiUrl);
    if (rsiRes.ok) {
      const rsiData = await rsiRes.json();
      rsi = rsiData.results?.values?.[0]?.value || 0;
      console.log(`🔵 [POLYGON] RSI for ${symbol}: ${rsi}`);
    }
    
    // Fetch MACD
    const macdUrl = `https://api.polygon.io/v1/indicators/macd/${symbol}?timespan=day&adjusted=true&short_window=12&long_window=26&signal_window=9&series_type=close&order=desc&limit=1&timestamp.gte=${fromDate}&timestamp.lte=${toDate}&apiKey=${apiKey}`;
    console.log(`🔵 [POLYGON] Calling MACD URL for ${symbol}`);
    
    let macdSignal = 'Neutral';
    const macdRes = await fetch(macdUrl);
    if (macdRes.ok) {
      const macdData = await macdRes.json();
      const macdValue = macdData.results?.values?.[0]?.value || 0;
      const signalValue = macdData.results?.values?.[0]?.signal || 0;
      
      // MACD is bullish when MACD line is above signal line
      if (macdValue > signalValue) {
        macdSignal = 'Bullish';
      } else if (macdValue < signalValue) {
        macdSignal = 'Bearish';
      }
      console.log(`🔵 [POLYGON] MACD for ${symbol}: ${macdSignal} (value: ${macdValue}, signal: ${signalValue})`);
    }
    
    // Calculate price change
    const change = bar.c - bar.o;
    const changePercent = ((change) / bar.o) * 100;
    
    return {
      symbol,
      price: bar.c, // close price
      change,
      changePercent,
      volume: bar.v,
      marketCap,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      previousClose: bar.o, // Using open as proxy for previous close
      technicalIndicators: {
        rsi,
        macd: macdSignal,
        movingAverages: {
          sma20: 0, // Polygon requires paid plan for 20-day
          sma50,
          sma100: 0, // Will fetch if needed
          sma200,
        },
      },
    };
  } catch (error) {
    console.error(`❌ [POLYGON] Error fetching data for ${symbol}:`, error);
    throw error;
  }
}

export async function fetchPolygonDataForMultipleSymbols(
  symbols: string[],
  apiKey: string
): Promise<{ [symbol: string]: PolygonStockData }> {
  console.log(`🔵 [POLYGON] Fetching data for ${symbols.length} symbols:`, symbols);
  
  const results: { [symbol: string]: PolygonStockData } = {};
  
  // Fetch in parallel for better performance
  const promises = symbols.map(symbol => 
    fetchPolygonStockData(symbol, apiKey)
      .then(data => {
        results[symbol] = data;
        console.log(`✅ [POLYGON] Successfully processed ${symbol}`);
      })
      .catch(error => {
        console.error(`❌ [POLYGON] Failed to process ${symbol}:`, error);
        // Don't throw, just skip failed symbols
      })
  );
  
  await Promise.all(promises);
  
  console.log(`🏁 [POLYGON] Completed fetching data for ${Object.keys(results).length}/${symbols.length} symbols`);
  
  return results;
}

