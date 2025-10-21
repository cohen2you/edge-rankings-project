// Combined Stock Data Fetcher - Uses Polygon for market data and Benzinga for Edge Rankings

import { fetchPolygonStockData, PolygonStockData } from './polygon';
import { BenzingaEdgeData } from './benzinga';

export interface CombinedStockData {
  symbol: string;
  companyName?: string;
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
    macd: string;
    movingAverages: {
      sma20: number;
      sma50: number;
      sma100: number;
      sma200: number;
    };
    support: number;
    resistance: number;
  };
  newsSentiment: {
    bullish: number;
    bearish: number;
    neutral: number;
    totalArticles: number;
  };
  analystRatings: {
    buy: number;
    hold: number;
    sell: number;
    averageTarget: number;
    highTarget: number;
    lowTarget: number;
  };
}

// Fetch Edge Data from Benzinga
async function fetchBenzingaEdgeData(symbol: string, apiKey: string): Promise<BenzingaEdgeData> {
  console.log(`🟢 [BENZINGA EDGE] Starting fetch for ${symbol}`);
  
  try {
    const url = `https://data-api-next.benzinga.com/rest/v3/tickerDetail?apikey=${apiKey}&symbols=${symbol}`;
    console.log(`🟢 [BENZINGA EDGE] Calling URL for ${symbol}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`❌ [BENZINGA EDGE] Failed for ${symbol}: ${response.status}`);
      throw new Error(`Failed to fetch edge data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🟢 [BENZINGA EDGE] Raw data for ${symbol}:`, JSON.stringify(data, null, 2));
    
    const result = data.result?.[0];
    if (!result) {
      throw new Error('No edge data available');
    }
    
    const rankings = result.rankings || {};
    
    // Calculate overall edge score (average of the four components)
    const scores = [
      rankings.momentum || 0,
      rankings.value || 0,
      rankings.growth || 0,
      rankings.quality || 0
    ].filter(s => s > 0);
    
    const edgeScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;
    
    return {
      symbol,
      edgeScore,
      momentumScore: rankings.momentum || 0,
      valueScore: rankings.value || 0,
      growthScore: rankings.growth || 0,
      qualityScore: rankings.quality || 0,
      percentileRankings: {
        momentum: 0,
        value: 0,
        growth: 0,
        quality: 0,
        overall: edgeScore,
      },
      peerComparison: {
        industryAverage: 0,
        sectorAverage: 0,
        marketAverage: 0,
        rankInIndustry: 0,
        rankInSector: 0,
      },
      riskMetrics: {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        correlationToSPY: 0,
      },
    };
  } catch (error) {
    console.error(`❌ [BENZINGA EDGE] Error for ${symbol}:`, error);
    throw error;
  }
}

// Fetch Analyst Ratings from Benzinga
async function fetchBenzingaAnalystRatings(symbol: string, apiKey: string): Promise<{
  buy: number;
  hold: number;
  sell: number;
  averageTarget: number;
  highTarget: number;
  lowTarget: number;
}> {
  console.log(`🟢 [BENZINGA RATINGS] Starting fetch for ${symbol}`);
  
  try {
    const url = `https://api.benzinga.com/api/v2.1/calendar/ratings?token=${apiKey}&parameters[tickers]=${symbol}&parameters[range]=6m`;
    console.log(`🟢 [BENZINGA RATINGS] Calling URL for ${symbol}`);
    
    const response = await fetch(url, { 
      headers: { accept: 'application/json' } 
    });
    
    if (!response.ok) {
      console.log(`❌ [BENZINGA RATINGS] Failed for ${symbol}: ${response.status}`);
      return { buy: 0, hold: 0, sell: 0, averageTarget: 0, highTarget: 0, lowTarget: 0 };
    }
    
    const data = await response.json();
    console.log(`🟢 [BENZINGA RATINGS] Raw data for ${symbol}:`, JSON.stringify(data, null, 2));
    
    const ratingsArray = Array.isArray(data) ? data : (data.ratings ?? []);
    
    if (ratingsArray.length === 0) {
      console.log(`🟢 [BENZINGA RATINGS] No ratings found for ${symbol}`);
      return { buy: 0, hold: 0, sell: 0, averageTarget: 0, highTarget: 0, lowTarget: 0 };
    }
    
    // Get most recent rating
    const mostRecent = ratingsArray
      .sort((a: any, b: any) => Date.parse(b.date) - Date.parse(a.date))[0];
    
    const rating = mostRecent.rating_current || mostRecent.action || 'Hold';
    const target = parseFloat(mostRecent.pt_current || mostRecent.price_target || '0');
    
    return {
      buy: rating === 'Buy' || rating === 'Outperform' || rating === 'Strong Buy' ? 1 : 0,
      hold: rating === 'Hold' || rating === 'Neutral' || rating === 'Market Perform' ? 1 : 0,
      sell: rating === 'Sell' || rating === 'Underperform' || rating === 'Strong Sell' ? 1 : 0,
      averageTarget: target,
      highTarget: target > 0 ? target * 1.1 : 0,
      lowTarget: target > 0 ? target * 0.9 : 0,
    };
  } catch (error) {
    console.error(`❌ [BENZINGA RATINGS] Error for ${symbol}:`, error);
    return { buy: 0, hold: 0, sell: 0, averageTarget: 0, highTarget: 0, lowTarget: 0 };
  }
}

// Combined function that fetches from both Polygon and Benzinga
export async function fetchCombinedStockData(
  symbols: string[],
  polygonApiKey: string,
  benzingaApiKey: string,
  benzingaEdgeApiKey: string
): Promise<{ [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } }> {
  
  console.log(`🚀 [COMBINED] Starting combined fetch for ${symbols.length} symbols`);
  
  const results: { [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } } = {};
  
  // Fetch all data in parallel
  const promises = symbols.map(async (symbol) => {
    try {
      console.log(`🔄 [COMBINED] Processing ${symbol}`);
      
      // Fetch from both APIs in parallel
      const [polygonData, edgeData, analystRatings] = await Promise.all([
        fetchPolygonStockData(symbol, polygonApiKey),
        fetchBenzingaEdgeData(symbol, benzingaEdgeApiKey),
        fetchBenzingaAnalystRatings(symbol, benzingaApiKey),
      ]);
      
      // Combine the data
      const combinedStockData: CombinedStockData = {
        symbol: polygonData.symbol,
        companyName: undefined, // Polygon doesn't provide this easily
        price: polygonData.price,
        change: polygonData.change,
        changePercent: polygonData.changePercent,
        volume: polygonData.volume,
        marketCap: polygonData.marketCap,
        open: polygonData.open,
        high: polygonData.high,
        low: polygonData.low,
        previousClose: polygonData.previousClose,
        technicalIndicators: {
          rsi: polygonData.technicalIndicators.rsi,
          macd: polygonData.technicalIndicators.macd,
          movingAverages: polygonData.technicalIndicators.movingAverages,
          support: 0, // Not calculated
          resistance: 0, // Not calculated
        },
        newsSentiment: {
          bullish: 0,
          bearish: 0,
          neutral: 0,
          totalArticles: 0,
        },
        analystRatings,
      };
      
      results[symbol] = {
        stockData: combinedStockData,
        edgeData,
      };
      
      console.log(`✅ [COMBINED] Successfully processed ${symbol}`);
    } catch (error) {
      console.error(`❌ [COMBINED] Failed to process ${symbol}:`, error);
    }
  });
  
  await Promise.all(promises);
  
  console.log(`🏁 [COMBINED] Completed: ${Object.keys(results).length}/${symbols.length} symbols`);
  
  return results;
}

