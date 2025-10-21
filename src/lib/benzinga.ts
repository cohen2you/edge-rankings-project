import { EdgeRankingData } from '@/types';

// Benzinga API endpoints - following the working pattern
const BENZINGA_BASE_URL = 'https://api.benzinga.com/api/v2';
const BENZINGA_EDGE_BASE_URL = 'https://api.benzinga.com/api/v2';

export interface BenzingaStockData {
  symbol: string;
  companyName?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  dividendYield?: number;
  beta?: number;
  technicalIndicators: {
    rsi: number;
    macd: string;
    movingAverages: {
      sma20: number;
      sma50: number;
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

export interface BenzingaEdgeData {
  symbol: string;
  edgeScore: number;
  momentumScore: number;
  valueScore: number;
  growthScore: number;
  qualityScore: number;
  percentileRankings: {
    momentum: number;
    value: number;
    growth: number;
    quality: number;
    overall: number;
  };
  peerComparison: {
    industryAverage: number;
    sectorAverage: number;
    marketAverage: number;
    rankInIndustry: number;
    rankInSector: number;
  };
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    correlationToSPY: number;
  };
}

export async function fetchEnhancedStockData(
  symbols: string[], 
  benzingaApiKey: string,
  benzingaEdgeApiKey: string
): Promise<{ [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } }> {
  
  console.log(`🚀 [MAIN] Starting enhanced stock data fetch for symbols:`, symbols);
  console.log(`🚀 [MAIN] Benzinga API Key present: ${benzingaApiKey ? 'YES' : 'NO'}`);
  console.log(`🚀 [MAIN] Benzinga Edge API Key present: ${benzingaEdgeApiKey ? 'YES' : 'NO'}`);
  
  const results: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } } = {};
  
  // Fetch data for each symbol in parallel
  const promises = symbols.map(async (symbol) => {
    try {
      console.log(`🚀 [MAIN] Processing symbol: ${symbol}`);
      const [stockData, edgeData] = await Promise.all([
        fetchStockData(symbol, benzingaApiKey),
        fetchEdgeData(symbol, benzingaEdgeApiKey)
      ]);
      
      results[symbol] = { stockData, edgeData };
      console.log(`✅ [MAIN] Successfully processed ${symbol}`);
    } catch (error) {
      console.error(`❌ [MAIN] Error fetching data for ${symbol}:`, error);
      // Return placeholder data if API calls fail
      results[symbol] = {
        stockData: createPlaceholderStockData(symbol),
        edgeData: createPlaceholderEdgeData(symbol)
      };
      console.log(`⚠️ [MAIN] Using placeholder data for ${symbol}`);
    }
  });
  
  await Promise.all(promises);
  console.log(`🏁 [MAIN] Completed fetching data for all symbols`);
  console.log(`🏁 [MAIN] Final results:`, JSON.stringify(results, null, 2));
  return results;
}

async function fetchCompanyName(symbol: string, apiKey: string): Promise<string | null> {
  try {
    console.log(`🔍 [COMPANY NAME] Fetching company name for ${symbol}`);
    
    // Try Benzinga's company info endpoint
    const companyUrl = `https://api.benzinga.com/api/v2/company?token=${apiKey}&tickers=${encodeURIComponent(symbol)}`;
    console.log(`🔍 [COMPANY NAME] Calling URL: ${companyUrl.replace(apiKey, '***HIDDEN***')}`);
    
    const companyRes = await fetch(companyUrl);
    console.log(`🔍 [COMPANY NAME] Response status: ${companyRes.status} for ${symbol}`);
    
    if (companyRes.ok) {
      const companyData = await companyRes.json();
      console.log(`🔍 [COMPANY NAME] Raw company data for ${symbol}:`, JSON.stringify(companyData, null, 2));
      
      if (companyData && Array.isArray(companyData) && companyData.length > 0) {
        const company = companyData[0];
        const companyName = company.name || company.company_name || company.long_name;
        console.log(`🔍 [COMPANY NAME] Found company name for ${symbol}: ${companyName}`);
        return companyName;
      }
    } else {
      console.log(`❌ [COMPANY NAME] Failed to fetch company data for ${symbol}: ${companyRes.status}`);
    }
    
    return null;
  } catch (error) {
    console.error(`❌ [COMPANY NAME] Error fetching company name for ${symbol}:`, error);
    return null;
  }
}

async function fetchStockData(symbol: string, apiKey: string): Promise<BenzingaStockData> {
  try {
    console.log(`🔍 [STOCK DATA] Starting fetch for ${symbol}`);
    console.log(`🔍 [STOCK DATA] API Key present: ${apiKey ? 'YES' : 'NO'}`);
    
    // Fetch company name in parallel with other data
    const companyNamePromise = fetchCompanyName(symbol, apiKey);
    
    // Following the exact working pattern from the technical analysis file
    const priceActionUrl = `https://api.benzinga.com/api/v2/quoteDelayed?token=${apiKey}&symbols=${encodeURIComponent(symbol)}`;
    console.log(`🔍 [STOCK DATA] Calling URL: ${priceActionUrl.replace(apiKey, '***HIDDEN***')}`);
    
    const priceActionRes = await fetch(priceActionUrl);
    console.log(`🔍 [STOCK DATA] Response status: ${priceActionRes.status} for ${symbol}`);
    
    let quote: any = {};
    if (priceActionRes.ok) {
      const priceData = await priceActionRes.json();
      console.log(`🔍 [STOCK DATA] Raw price data for ${symbol}:`, JSON.stringify(priceData, null, 2));
      
      if (priceData && typeof priceData === 'object') {
        quote = priceData[symbol.toUpperCase()] || {};
        console.log(`🔍 [STOCK DATA] Extracted quote for ${symbol}:`, JSON.stringify(quote, null, 2));
      }
    } else {
      console.log(`❌ [STOCK DATA] Failed to fetch price data for ${symbol}: ${priceActionRes.status}`);
    }

    // Analyst ratings call - following the exact working pattern from the analyst-ratings route
    let ratingsData: any = {};
    try {
      const ratingsUrl = `https://api.benzinga.com/api/v2.1/calendar/ratings?token=${apiKey}&parameters[tickers]=${encodeURIComponent(symbol)}&parameters[range]=6m`;
      console.log(`🔍 [RATINGS] Calling URL: ${ratingsUrl.replace(apiKey, '***HIDDEN***')}`);
      
      const ratingsResponse = await fetch(ratingsUrl, { 
        headers: { accept: 'application/json' } 
      });
      console.log(`🔍 [RATINGS] Response status: ${ratingsResponse.status} for ${symbol}`);

      if (ratingsResponse.ok) {
        const ratingsResponseData = await ratingsResponse.json();
        console.log(`🔍 [RATINGS] Raw ratings data for ${symbol}:`, JSON.stringify(ratingsResponseData, null, 2));
        
        // Parse the response like the working route does
        const ratingsArray = Array.isArray(ratingsResponseData) 
          ? ratingsResponseData 
          : (ratingsResponseData.ratings ?? []);
        
        // Get the most recent rating
        const mostRecentRating = ratingsArray
          .sort((a: any, b: any) => Date.parse(b.date) - Date.parse(a.date))[0] || {};
        
        ratingsData = mostRecentRating;
        console.log(`🔍 [RATINGS] Extracted most recent rating for ${symbol}:`, JSON.stringify(ratingsData, null, 2));
      } else {
        console.log(`❌ [RATINGS] Failed to fetch ratings for ${symbol}: ${ratingsResponse.status}`);
      }
    } catch (ratingsError) {
      console.log(`❌ [RATINGS] Error fetching ratings for ${symbol}:`, ratingsError);
    }

    // Wait for company name to be fetched
    const companyName = await companyNamePromise;
    
    const result = {
      symbol,
      companyName: companyName || undefined,
      price: quote.lastTradePrice || quote.last || 0,
      change: quote.change || 0,
      changePercent: quote.changePercent || 0,
      volume: quote.volume || 0,
      marketCap: quote.marketCap || quote.market_cap || 0,
      peRatio: quote.peRatio || quote.pe_ratio,
      dividendYield: quote.dividendYield || quote.dividend_yield,
      beta: quote.beta,
      technicalIndicators: {
        rsi: 0, // Not available from Benzinga API
        macd: 'Neutral', // Not available from Benzinga API
        movingAverages: {
          sma20: 0, // Not provided by Benzinga
          sma50: quote.fiftyDayAveragePrice || 0, // Real data from Benzinga
          sma100: quote.hundredDayAveragePrice || 0, // Real data from Benzinga
          sma200: quote.twoHundredDayAveragePrice || 0, // Real data from Benzinga
        },
        support: 0, // Not available from Benzinga API
        resistance: 0, // Not available from Benzinga API
      },
      newsSentiment: {
        bullish: 0, // Not available from Benzinga API
        bearish: 0, // Not available from Benzinga API
        neutral: 0, // Not available from Benzinga API
        totalArticles: 0, // Not available from Benzinga API
      },
             analystRatings: {
         buy: ratingsData.rating_current === 'Buy' ? 1 : 0,
         hold: ratingsData.rating_current === 'Hold' || ratingsData.rating_current === 'Neutral' || ratingsData.rating_current === 'Market Perform' ? 1 : 0,
         sell: ratingsData.rating_current === 'Sell' || ratingsData.rating_current === 'Underperform' ? 1 : 0,
         averageTarget: ratingsData.pt_current ? parseFloat(ratingsData.pt_current) : 0,
         highTarget: ratingsData.pt_current ? parseFloat(ratingsData.pt_current) * 1.1 : 0,
         lowTarget: ratingsData.pt_current ? parseFloat(ratingsData.pt_current) * 0.9 : 0,
       },
    };
    
    console.log(`🔍 [STOCK DATA] Final result for ${symbol}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ [STOCK DATA] Error fetching stock data for ${symbol}:`, error);
    throw error; // Let the calling function handle the error
  }
}

async function fetchEdgeData(symbol: string, apiKey: string): Promise<BenzingaEdgeData> {
  try {
    console.log(`🔍 [EDGE DATA] Starting fetch for ${symbol}`);
    console.log(`🔍 [EDGE DATA] API Key present: ${apiKey ? 'YES' : 'NO'}`);
    
    // Following the exact working pattern from the edge-rankings route
    const edgeUrl = `https://data-api-next.benzinga.com/rest/v3/tickerDetail?apikey=${apiKey}&symbols=${symbol.toUpperCase()}`;
    console.log(`🔍 [EDGE DATA] Calling URL: ${edgeUrl.replace(apiKey, '***HIDDEN***')}`);
    
    const response = await fetch(edgeUrl);
    console.log(`🔍 [EDGE DATA] Response status: ${response.status} for ${symbol}`);

    if (!response.ok) {
      console.log(`❌ [EDGE DATA] Failed to fetch Edge data for ${symbol}: ${response.status}`);
      throw new Error(`Failed to fetch Edge data for ${symbol}: ${response.status}`);
    }

    const data = await response.json();
    console.log(`🔍 [EDGE DATA] Raw edge data for ${symbol}:`, JSON.stringify(data, null, 2));
    
    // Extract rankings from the nested structure like the working route
    const apiResult = data.result && data.result[0];
    const edgeData = apiResult && apiResult.rankings;
    
    if (!edgeData || !edgeData.exists) {
      console.log(`❌ [EDGE DATA] No edge data found for ${symbol}`);
      throw new Error(`No edge rankings data found for ${symbol}`);
    }
    
    console.log(`🔍 [EDGE DATA] Extracted edge data for ${symbol}:`, JSON.stringify(edgeData, null, 2));

    const result = {
      symbol,
      edgeScore: (edgeData.momentum + edgeData.growth + edgeData.quality + edgeData.value) / 4 || 0,
      momentumScore: edgeData.momentum || 0,
      valueScore: edgeData.value || 0,
      growthScore: edgeData.growth || 0,
      qualityScore: edgeData.quality || 0,
      percentileRankings: {
        momentum: edgeData.momentum_percentile || 0,
        value: edgeData.value_percentile || 0,
        growth: edgeData.growth_percentile || 0,
        quality: edgeData.quality_percentile || 0,
        overall: ((edgeData.momentum + edgeData.growth + edgeData.quality + edgeData.value) / 4) || 0,
      },
      peerComparison: {
        industryAverage: edgeData.industry_average || 0,
        sectorAverage: edgeData.sector_average || 0,
        marketAverage: edgeData.market_average || 0,
        rankInIndustry: edgeData.industry_rank || 0,
        rankInSector: edgeData.sector_rank || 0,
      },
      riskMetrics: {
        volatility: edgeData.volatility || 0,
        sharpeRatio: edgeData.sharpe_ratio || 0,
        maxDrawdown: edgeData.max_drawdown || 0,
        correlationToSPY: edgeData.correlation_to_spy || 0,
      },
    };
    
    console.log(`🔍 [EDGE DATA] Final result for ${symbol}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ [EDGE DATA] Error fetching Edge data for ${symbol}:`, error);
    throw error; // Let the calling function handle the error
  }
}

function createPlaceholderStockData(symbol: string): BenzingaStockData {
  return {
    symbol,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    technicalIndicators: {
      rsi: 0,
      macd: 'Neutral',
      movingAverages: { sma20: 0, sma50: 0, sma200: 0 },
      support: 0,
      resistance: 0,
    },
    newsSentiment: { bullish: 0, bearish: 0, neutral: 0, totalArticles: 0 },
    analystRatings: { buy: 0, hold: 0, sell: 0, averageTarget: 0, highTarget: 0, lowTarget: 0 },
  };
}

function createPlaceholderEdgeData(symbol: string): BenzingaEdgeData {
  return {
    symbol,
    edgeScore: 0,
    momentumScore: 0,
    valueScore: 0,
    growthScore: 0,
    qualityScore: 0,
    percentileRankings: { momentum: 0, value: 0, growth: 0, quality: 0, overall: 0 },
    peerComparison: { industryAverage: 0, sectorAverage: 0, marketAverage: 0, rankInIndustry: 0, rankInSector: 0 },
    riskMetrics: { volatility: 0, sharpeRatio: 0, maxDrawdown: 0, correlationToSPY: 0 },
  };
}

export function generateTechnicalAnalysis(stockData: BenzingaStockData): string {
  const { technicalIndicators, price, volume } = stockData;
  
  let analysis = '';
  
  // RSI Analysis with specific levels - only if we have real RSI data
  if (technicalIndicators.rsi > 0) {
    if (technicalIndicators.rsi > 70) {
      analysis += `RSI at ${technicalIndicators.rsi.toFixed(1)} indicates overbought conditions, suggesting potential for a pullback. `;
    } else if (technicalIndicators.rsi < 30) {
      analysis += `RSI at ${technicalIndicators.rsi.toFixed(1)} shows oversold conditions, indicating potential for a bounce. `;
    } else {
      analysis += `RSI at ${technicalIndicators.rsi.toFixed(1)} is in neutral territory, showing balanced buying and selling pressure. `;
    }
  }
  
  // Moving Average Analysis with specific levels - only if we have real price and MA data
  const { sma20, sma50, sma200 } = technicalIndicators.movingAverages;
  if (price > 0 && sma20 > 0 && sma50 > 0 && sma200 > 0) {
    if (price > sma20 && sma20 > sma50 && sma50 > sma200) {
      analysis += `Price at $${price.toFixed(2)} is above all major moving averages (20-day: $${sma20.toFixed(2)}, 50-day: $${sma50.toFixed(2)}, 200-day: $${sma200.toFixed(2)}), indicating strong bullish momentum. `;
    } else if (price < sma20 && sma20 < sma50 && sma50 < sma200) {
      analysis += `Price at $${price.toFixed(2)} is below all major moving averages (20-day: $${sma20.toFixed(2)}, 50-day: $${sma50.toFixed(2)}, 200-day: $${sma200.toFixed(2)}), suggesting bearish pressure. `;
    } else {
      analysis += `Mixed signals from moving averages with price at $${price.toFixed(2)} vs 20-day: $${sma20.toFixed(2)}, 50-day: $${sma50.toFixed(2)}, 200-day: $${sma200.toFixed(2)}, indicating potential consolidation. `;
    }
  }
  
  // Support and Resistance Analysis - only if we have real data
  if (technicalIndicators.support > 0 && technicalIndicators.resistance > 0 && price > 0) {
    const supportDistance = ((price - technicalIndicators.support) / price) * 100;
    const resistanceDistance = ((technicalIndicators.resistance - price) / price) * 100;
    
    if (supportDistance < 5) {
      analysis += `Price is near support at $${technicalIndicators.support.toFixed(2)} (${supportDistance.toFixed(1)}% away), which could provide a floor. `;
    } else if (resistanceDistance < 5) {
      analysis += `Price is near resistance at $${technicalIndicators.resistance.toFixed(2)} (${resistanceDistance.toFixed(1)}% away), which could cap upside. `;
    }
  }
  
  // Volume Analysis - only if we have real volume data
  if (volume > 0) {
    analysis += `Volume of ${volume.toLocaleString()} shares indicates ${volume > 1000000 ? 'strong' : 'moderate'} trading activity. `;
  }
  
  // MACD Analysis - only if we have real MACD data (not mock data)
  if (technicalIndicators.macd && technicalIndicators.macd !== 'Neutral') {
    if (technicalIndicators.macd === 'Bullish') {
      analysis += 'MACD signals bullish momentum with positive divergence. ';
    } else if (technicalIndicators.macd === 'Bearish') {
      analysis += 'MACD indicates bearish momentum with negative divergence. ';
    }
  }
  
  return analysis;
}

export function generateFundamentalAnalysis(stockData: BenzingaStockData, edgeData: BenzingaEdgeData): string {
  let analysis = '';
  
  // P/E Analysis with specific values - only if we have real P/E data
  if (stockData.peRatio && stockData.peRatio > 0) {
    if (stockData.peRatio < 15) {
      analysis += `Trading at an attractive P/E ratio of ${stockData.peRatio.toFixed(1)}, suggesting potential value opportunity. `;
    } else if (stockData.peRatio > 25) {
      analysis += `High P/E ratio of ${stockData.peRatio.toFixed(1)} indicates premium valuation, requiring strong growth to justify. `;
    } else {
      analysis += `P/E ratio of ${stockData.peRatio.toFixed(1)} is in line with market averages. `;
    }
  }
  
  // Dividend Yield Analysis - only if we have real dividend data
  if (stockData.dividendYield && stockData.dividendYield > 0) {
    analysis += `Dividend yield of ${stockData.dividendYield.toFixed(2)}% provides income potential. `;
  }
  
  // Market Cap Analysis - only if we have real market cap data
  if (stockData.marketCap > 0) {
    const marketCapB = stockData.marketCap / 1000000000;
    if (marketCapB > 100) {
      analysis += `Large-cap stock with market cap of $${marketCapB.toFixed(1)}B. `;
    } else if (marketCapB > 10) {
      analysis += `Mid-cap stock with market cap of $${marketCapB.toFixed(1)}B. `;
    } else {
      analysis += `Small-cap stock with market cap of $${marketCapB.toFixed(1)}B. `;
    }
  }
  
  // Edge Score Analysis with detailed breakdown - only if we have real Edge data
  if (edgeData.edgeScore > 0) {
    if (edgeData.edgeScore > 80) {
      analysis += `Excellent overall Edge score of ${edgeData.edgeScore.toFixed(2)} indicates strong fundamentals across all metrics. `;
    } else if (edgeData.edgeScore > 60) {
      analysis += `Good Edge score of ${edgeData.edgeScore.toFixed(2)} shows solid fundamental strength. `;
    } else {
      analysis += `Below-average Edge score of ${edgeData.edgeScore.toFixed(2)} suggests fundamental challenges. `;
    }
    
    // Detailed Edge Score Breakdown - only include scores that are actually calculated (> 0)
    const scoreBreakdown: string[] = [];
    if (edgeData.momentumScore > 0) scoreBreakdown.push(`Momentum ${edgeData.momentumScore.toFixed(2)}`);
    if (edgeData.valueScore > 0) scoreBreakdown.push(`Value ${edgeData.valueScore.toFixed(2)}`);
    if (edgeData.growthScore > 0) scoreBreakdown.push(`Growth ${edgeData.growthScore.toFixed(2)}`);
    if (edgeData.qualityScore > 0) scoreBreakdown.push(`Quality ${edgeData.qualityScore.toFixed(2)}`);
    
    if (scoreBreakdown.length > 0) {
      analysis += `Edge breakdown: ${scoreBreakdown.join(', ')}. `;
    }
    
    // Percentile Rankings - only if we have real percentile data
    if (edgeData.percentileRankings.overall > 0) {
      if (edgeData.percentileRankings.overall > 80) {
        analysis += `Ranks in the top ${(100 - edgeData.percentileRankings.overall).toFixed(0)}% of all stocks. `;
      } else if (edgeData.percentileRankings.overall < 20) {
        analysis += `Ranks in the bottom ${edgeData.percentileRankings.overall.toFixed(0)}% of all stocks. `;
      }
    }
    
    // Peer Comparison - only if we have real ranking data
    if (edgeData.peerComparison.rankInIndustry > 0) {
      analysis += `Ranks ${edgeData.peerComparison.rankInIndustry} in its industry. `;
    }
  }
  
  // Analyst Sentiment with specific numbers - only if we have real analyst data
  const totalRatings = stockData.analystRatings.buy + stockData.analystRatings.hold + stockData.analystRatings.sell;
  if (totalRatings > 0) {
    const buyPercentage = (stockData.analystRatings.buy / totalRatings) * 100;
    analysis += `Analyst coverage: ${stockData.analystRatings.buy} buy, ${stockData.analystRatings.hold} hold, ${stockData.analystRatings.sell} sell ratings (${buyPercentage.toFixed(0)}% buy). `;
    
    if (stockData.analystRatings.averageTarget > 0) {
      const upside = ((stockData.analystRatings.averageTarget - stockData.price) / stockData.price) * 100;
      analysis += `Average price target of $${stockData.analystRatings.averageTarget.toFixed(2)} represents ${upside > 0 ? '+' : ''}${upside.toFixed(1)}% upside potential. `;
    }
  }
  
  // News Sentiment - only if we have real news data (not mock data)
  if (stockData.newsSentiment.totalArticles > 0 && stockData.newsSentiment.totalArticles < 100) { // Mock data typically has high numbers
    const bullishPercentage = (stockData.newsSentiment.bullish / stockData.newsSentiment.totalArticles) * 100;
    const bearishPercentage = (stockData.newsSentiment.bearish / stockData.newsSentiment.totalArticles) * 100;
    
    if (bullishPercentage > 60) {
      analysis += `News sentiment is bullish with ${bullishPercentage.toFixed(0)}% positive coverage. `;
    } else if (bearishPercentage > 60) {
      analysis += `News sentiment is bearish with ${bearishPercentage.toFixed(0)}% negative coverage. `;
    } else {
      analysis += `News sentiment is neutral with balanced coverage. `;
    }
  }
  
  return analysis;
}

export function generateRiskAssessment(stockData: BenzingaStockData, edgeData: BenzingaEdgeData): string {
  let assessment = '';
  
  // Volatility Analysis - only if we have real volatility data
  if (edgeData.riskMetrics.volatility > 0) {
    if (edgeData.riskMetrics.volatility > 30) {
      assessment += 'High volatility indicates significant price swings and increased risk. ';
    } else if (edgeData.riskMetrics.volatility < 15) {
      assessment += 'Low volatility suggests stable price action and reduced risk. ';
    }
  }
  
  // Beta Analysis - only if we have real beta data
  if (stockData.beta && stockData.beta > 0) {
    if (stockData.beta > 1.2) {
      assessment += 'High beta indicates above-market sensitivity to market movements. ';
    } else if (stockData.beta < 0.8) {
      assessment += 'Low beta suggests defensive characteristics with below-market sensitivity. ';
    }
  }
  
  // Correlation Analysis - only if we have real correlation data
  if (edgeData.riskMetrics.correlationToSPY !== 0) {
    if (Math.abs(edgeData.riskMetrics.correlationToSPY) > 0.7) {
      assessment += 'High correlation to market suggests limited diversification benefits. ';
    } else {
      assessment += 'Low correlation to market provides potential diversification benefits. ';
    }
  }
  
  return assessment;
}
