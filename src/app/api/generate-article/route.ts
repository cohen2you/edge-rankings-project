import { NextRequest, NextResponse } from 'next/server';
import { EdgeRankingData, ArticleData } from '@/types';
import { 
  generateTechnicalAnalysis, 
  generateFundamentalAnalysis, 
  generateRiskAssessment,
  BenzingaEdgeData
} from '@/lib/benzinga';
import { fetchCombinedStockData, CombinedStockData } from '@/lib/stockData';

export async function POST(request: NextRequest) {
  try {
    console.log('=== API ROUTE CALLED ===');
    const { stocks, rankingCategory = 'Momentum' } = await request.json();
    
    console.log('Stocks received:', stocks?.length || 0);

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      console.log('Invalid stocks data');
      return NextResponse.json(
        { error: 'Invalid stocks data' },
        { status: 400 }
      );
    }

    // Get server-side API key for OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.log('No OpenAI API key configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment.' },
        { status: 500 }
      );
    }

    // Use only the selected stocks (no automatic top 3 selection)
    const selectedStocks = stocks
      .filter(stock => stock.previousMomentumScore !== undefined)
      .map(stock => ({
        ...stock,
        momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0)
      }))
      .sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0)); // Keep sorted for article generation

    // Fetch enhanced data from Polygon and Benzinga APIs
    const polygonApiKey = process.env.POLYGON_API_KEY;
    const benzingaApiKey = process.env.BENZINGA_API_KEY;
    const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
    
    console.log('API keys available:', {
      polygon: !!polygonApiKey,
      benzinga: !!benzingaApiKey,
      benzingaEdge: !!benzingaEdgeApiKey
    });
    
    let enhancedData: { [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } } = {};
    
    if (polygonApiKey && benzingaApiKey && benzingaEdgeApiKey) {
      try {
        console.log('Fetching combined data from Polygon and Benzinga...');
        enhancedData = await fetchCombinedStockData(
          selectedStocks.map(s => s.symbol),
          polygonApiKey,
          benzingaApiKey,
          benzingaEdgeApiKey
        );
        console.log('Combined data fetched for symbols:', Object.keys(enhancedData));

        // Peer data will be fetched separately via the "Fetch Sector Tickers" button
      } catch (error) {
        console.warn('Failed to fetch Benzinga data, using fallback:', error);
      }
    } else {
      console.log('Benzinga API keys not available, using mock data');
    }

    // Generate enhanced article
    console.log('Generating enhanced article with OpenAI...');
    const article = await generateEnhancedArticle(selectedStocks, enhancedData, openaiApiKey, rankingCategory);
    console.log('Article generated successfully');

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article' },
      { status: 500 }
    );
  }
}

async function generateEnhancedArticle(
  stocks: EdgeRankingData[], 
  enhancedData: { [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } },
  openaiApiKey: string,
  rankingCategory: string = 'Momentum'
): Promise<ArticleData> {

      const prompt = createEnhancedArticlePrompt(stocks, enhancedData, rankingCategory);

  console.log('=== PROMPT SENT TO AI ===');
  console.log(prompt);
  console.log('=== END PROMPT ===');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a senior financial journalist. Write engaging, narrative-driven articles that tell compelling stories. Integrate stock information naturally into flowing sentences. Write like a storyteller, not a data analyst. Keep paragraphs to 2 sentences maximum. DO NOT create separate sections or template-style content. Write ONLY the narrative article. Format company names in **bold** and include exchange with tickers: (OTC: SYMBOL) or (SYMBOL:NYSE).`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No content generated');
    }

    console.log('=== AI GENERATED TEXT ===');
    console.log(generatedText);
    console.log('=== END AI GENERATED TEXT ===');

    // Parse the generated text into structured article data
    return parseEnhancedArticle(generatedText, stocks, enhancedData, rankingCategory);
  } catch (error) {
    console.error('AI generation failed:', error);
    // Fallback to basic article generation
            return generateFallbackArticle(stocks, enhancedData);
  }
}

function determineSector(stocks: EdgeRankingData[]): { sector: string; isMultiSector: boolean } {
  // Use the actual sector data from the spreadsheet
  console.log('Determining sector from stocks:', stocks.map(s => ({ symbol: s.symbol, sector: s.sector, companyName: s.companyName })));
  
  const sectors = stocks
    .map(s => s.sector)
    .filter(sector => sector && sector.trim() !== '')
    .map(sector => sector!.toLowerCase());
  
  console.log('Available sectors from spreadsheet:', sectors);
  
  if (sectors.length === 0) {
    console.log('No sector data found in spreadsheet, using general');
    return { sector: 'general', isMultiSector: false };
  }
  
  // Check if multiple different sectors are present
  const uniqueSectors = Array.from(new Set(sectors));
  const isMultiSector = uniqueSectors.length > 1;
  
  console.log('Unique sectors:', uniqueSectors);
  console.log('Is multi-sector:', isMultiSector);
  
  // If multi-sector, return 'general' to avoid sector-specific headlines
  if (isMultiSector) {
    console.log('Multiple sectors detected, using general headline');
    return { sector: 'general', isMultiSector: true };
  }
  
  // Single sector - return it
  const singleSector = uniqueSectors[0] || 'general';
  console.log('Single sector selected:', singleSector);
  
  return { sector: singleSector, isMultiSector: false };
}

function getMajorSectorStocksForArticle(sector: string): string[] {
  // Normalize sector name for comparison
  const normalizedSector = sector.toLowerCase();
  
  switch (normalizedSector) {
    case 'solar':
    case 'renewable energy':
    case 'clean energy':
      return ['FSLR', 'ENPH', 'SEDG', 'RUN', 'SPWR', 'NOVA', 'ARRY', 'SHLS'];
    case 'technology':
    case 'tech':
    case 'software':
    case 'semiconductors':
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
    case 'financial':
    case 'banking':
    case 'finance':
    case 'financial services':
    case 'insurance':
    case 'utilities':
    case 'electric utilities':
    case 'gas utilities':
      return ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'DUK', 'SO', 'NEE', 'D', 'AEP'];
    case 'healthcare':
    case 'biotechnology':
    case 'pharmaceuticals':
      return ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR'];
    case 'consumer discretionary':
    case 'retail':
      return ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'COST'];
    case 'industrial':
    case 'industrials':
    case 'manufacturing':
      return ['CAT', 'BA', 'GE', 'MMM', 'HON', 'UPS', 'FDX', 'DE'];
    case 'energy':
    case 'oil & gas':
      return ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'KMI', 'VLO'];
    case 'basic materials':
    case 'materials':
      return ['LIN', 'APD', 'FCX', 'NEM', 'AA', 'BLL', 'SHW', 'ECL'];
    case 'real estate':
    case 'reits':
      return ['PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'O', 'SPG'];
    case 'communication services':
    case 'telecommunications':
      return ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS'];
    default:
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ'];
  }
}



function createEnhancedArticlePrompt(
  stocks: EdgeRankingData[], 
  enhancedData: { [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } },
  rankingCategory: string = 'Momentum'
): string {
  
  // Determine sector for headline and context
  const { sector, isMultiSector } = determineSector(stocks);
  const sectorStocks = stocks.length;
  
  // Generate engaging, sector-specific headline based on actual stock performance
  // Calculate combined/averaged percentage change for multiple stocks
  const stockChanges = stocks.map(stock => {
    const change = stock.momentumScore - (stock.previousMomentumScore || 0);
    const changePercent = ((change) / (stock.previousMomentumScore || 1)) * 100;
    return { stock, change, changePercent };
  });
  
  // For multiple stocks, use a range format to show individual performance
  const maxChangePercent = Math.max(...stockChanges.map(s => s.changePercent));
  const minChangePercent = Math.min(...stockChanges.map(s => s.changePercent));
  
  // Use range format for multiple stocks, single number for one stock
  const headlineChangePercent = stocks.length > 1 ? 
    (maxChangePercent === minChangePercent ? maxChangePercent : `${Math.round(minChangePercent)}%-${Math.round(maxChangePercent)}%`) :
    maxChangePercent;
  
  const topStock = stocks[0];
  
  // Format sector name for headlines
  const formatSectorName = (sector: string, isMultiSector: boolean) => {
    // If multiple sectors, don't use sector name in headline
    if (isMultiSector) {
      return '';
    }
    
    const sectorMap: { [key: string]: string } = {
      'solar': 'Solar',
      'technology': 'Tech',
      'financial': 'Financial',
      'healthcare': 'Healthcare',
      'consumer cyclical': 'Consumer Cyclical',
      'consumer defensive': 'Consumer Defensive',
      'industrial': 'Industrial',
      'energy': 'Energy',
      'basic materials': 'Basic Materials',
      'real estate': 'Real Estate',
      'communication services': 'Communication Services',
      'utilities': 'Utilities',
      'general': 'Market'
    };
    return sectorMap[sector.toLowerCase()] || sector.charAt(0).toUpperCase() + sector.slice(1);
  };
  
  const sectorName = formatSectorName(sector, isMultiSector);
  const stockCount = stocks.length;
  const stockText = stockCount === 1 ? 'Stock' : stockCount === 2 ? 'Stocks' : `${stockCount} Stocks`;
  
  // Create sector-based headlines in the new format
  // For multiple stocks, use clean format highlighting the top performer
  const headlineTemplates = [];
  
  if (stocks.length === 1) {
    // Single stock headlines
    headlineTemplates.push(
      `${stocks[0].companyName} ${rankingCategory} Score Surges ${Math.round(maxChangePercent)}% — Here's What's Driving It`,
      `Why ${stocks[0].companyName}'s ${rankingCategory} Score Just Jumped ${Math.round(maxChangePercent)}%`,
      `${stocks[0].companyName} Sees ${rankingCategory} Score Surge ${Math.round(maxChangePercent)}% — Investors Take Notice`
    );
  } else {
    // Multiple stocks - use cleaner format
    // Add space after sector name only if it exists
    const sectorPrefix = sectorName ? `${sectorName} ` : '';
    const sectorContext = sectorName || 'Market';
    
    headlineTemplates.push(
      `${stockCount} ${sectorPrefix}${stockText} See ${rankingCategory} Scores Surge — One Jumps ${Math.round(maxChangePercent)}%`,
      `${stockCount} ${sectorPrefix}Value Plays Emerge — Scores Surge Up to ${Math.round(maxChangePercent)}%`,
      `Why Are These ${stockCount} ${sectorPrefix}${rankingCategory} Scores Surging? One Jumps ${Math.round(maxChangePercent)}%`,
      `${stockCount} ${sectorPrefix}${stockText} Post ${rankingCategory} Score Gains — Top Performer Up ${Math.round(maxChangePercent)}%`,
      `Hidden Value in ${sectorContext}: ${stockCount} ${stockText} See Rankings Surge Up to ${Math.round(maxChangePercent)}%`,
      `${stockCount} ${sectorPrefix}${stockText} Heat Up — ${rankingCategory} Scores Jump Up to ${Math.round(maxChangePercent)}%`
    );
  }
  
  // Select headline - use the first one for consistency (best performing format)
  // Sector is already included in the headline template via sectorName variable
  const headline = headlineTemplates[0];
  
  // Calculate actual rankings based on score increases
  const stocksWithChanges = stocks.map(stock => ({
    ...stock,
    scoreChange: stock.momentumScore - (stock.previousMomentumScore || 0),
    scoreChangePercent: ((stock.momentumScore - (stock.previousMomentumScore || 0)) / (stock.previousMomentumScore || 1)) * 100
  })).sort((a, b) => b.scoreChangePercent - a.scoreChangePercent);
  
  // Create a map of stock symbols to their actual ranking
  const stockRankings = new Map();
  stocksWithChanges.forEach((stock, index) => {
    stockRankings.set(stock.symbol, index + 1);
  });
  
  // Create detailed stock data for the AI to incorporate into the narrative
  const stockDetails = stocks.map((stock, index) => {
    const stockEnhanced = enhancedData[stock.symbol];
    const momentumChange = stock.momentumScore - (stock.previousMomentumScore || 0);
    const scoreChangePercent = ((momentumChange) / (stock.previousMomentumScore || 1)) * 100;
    const actualRank = stockRankings.get(stock.symbol);
    
    let rankingText;
    if (actualRank === 1) {
      rankingText = `posted a standout week-over-week increase in ${rankingCategory.toLowerCase()} score, surging ${scoreChangePercent.toFixed(0)}% from ${stock.previousMomentumScore?.toFixed(2) || '0'} to ${stock.momentumScore.toFixed(2)}`;
    } else if (actualRank === 2 && stocks.length > 2) {
      // Only say "second" if there are 3+ stocks (makes it meaningful)
      rankingText = `delivered the second-strongest week-over-week increase in ${rankingCategory.toLowerCase()} score, rising ${scoreChangePercent.toFixed(0)}% from ${stock.previousMomentumScore?.toFixed(2) || '0'} to ${stock.momentumScore.toFixed(2)}`;
    } else if (actualRank === 2 && stocks.length === 2) {
      // For only 2 stocks, don't say "second" - just emphasize the strong gain
      rankingText = `also posted a notable week-over-week increase in ${rankingCategory.toLowerCase()} score, rising ${scoreChangePercent.toFixed(0)}% from ${stock.previousMomentumScore?.toFixed(2) || '0'} to ${stock.momentumScore.toFixed(2)}`;
    } else {
      rankingText = `demonstrated a strong week-over-week increase in ${rankingCategory.toLowerCase()} score, gaining ${scoreChangePercent.toFixed(0)}% from ${stock.previousMomentumScore?.toFixed(2) || '0'} to ${stock.momentumScore.toFixed(2)}`;
    }

    let technicalDetails = '';
    let fundamentalDetails = '';
    let analystDetails = '';

    if (stockEnhanced) {
      const { stockData, edgeData } = stockEnhanced;
      
      // Technical analysis details - use REAL data from Polygon and Benzinga
      const priceDirection = stockData.changePercent >= 0 ? 'up' : 'down';
      // Get current day of week
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      const priceChangeText = `The stock is ${priceDirection} ${Math.abs(stockData.changePercent).toFixed(1)}% on ${today}.`;
      
      // Build technical analysis using ONLY real data
      let techAnalysis = `Currently trading at $${stockData.price.toFixed(2)}, ${priceChangeText}`;
      
      // RSI from Polygon
      if (stockData.technicalIndicators.rsi > 0) {
        const rsiCondition = stockData.technicalIndicators.rsi > 70 ? 'overbought' : 
                             stockData.technicalIndicators.rsi < 30 ? 'oversold' : 'neutral';
        techAnalysis += ` RSI at ${stockData.technicalIndicators.rsi.toFixed(1)} indicates ${rsiCondition} conditions.`;
      }
      
      // Moving averages comparison
      if (stockData.technicalIndicators.movingAverages.sma50 > 0) {
        const vs50MA = stockData.price > stockData.technicalIndicators.movingAverages.sma50 ? 'above' : 'below';
        techAnalysis += ` The stock is ${vs50MA} its 50-day moving average of $${stockData.technicalIndicators.movingAverages.sma50.toFixed(2)}.`;
      }
      
      if (stockData.technicalIndicators.movingAverages.sma200 > 0) {
        const vs200MA = stockData.price > stockData.technicalIndicators.movingAverages.sma200 ? 'above' : 'below';
        techAnalysis += ` Price is ${vs200MA} the 200-day moving average of $${stockData.technicalIndicators.movingAverages.sma200.toFixed(2)}.`;
      }
      
      // MACD from Polygon
      if (stockData.technicalIndicators.macd && stockData.technicalIndicators.macd !== 'Neutral') {
        techAnalysis += ` MACD signals ${stockData.technicalIndicators.macd.toLowerCase()} momentum.`;
      }
      
      technicalDetails = techAnalysis;
      
      // Fundamental analysis details - only include scores that are calculated (> 0)
      const edgeScores: string[] = [];
      if (edgeData.momentumScore > 0) edgeScores.push(`momentum at ${edgeData.momentumScore.toFixed(2)}`);
      if (edgeData.valueScore > 0) edgeScores.push(`value at ${edgeData.valueScore.toFixed(2)}`);
      if (edgeData.growthScore > 0) edgeScores.push(`growth at ${edgeData.growthScore.toFixed(2)}`);
      if (edgeData.qualityScore > 0) edgeScores.push(`quality at ${edgeData.qualityScore.toFixed(2)}`);
      
      const edgeScoreText = edgeScores.length > 0 ? `, with ${edgeScores.join(', ')}` : '';
      fundamentalDetails = `The company's Edge score of ${edgeData.edgeScore.toFixed(2)} indicates ${edgeData.edgeScore > 80 ? 'excellent' : edgeData.edgeScore > 60 ? 'good' : 'mixed'} fundamentals${edgeScoreText}.`;
      
      // Skip analyst details to avoid showing empty/zero data
      analystDetails = '';
    }

    // Format company name with Inc suffix if not already present
    const formattedCompanyName = stock.companyName.includes('Inc') || stock.companyName.includes('Corp') || stock.companyName.includes('Ltd') 
      ? stock.companyName 
      : `${stock.companyName} Inc`;
    
    // Determine exchange based on symbol patterns (common exchanges)
    let exchange = 'NASDAQ'; // Default
    if (stock.symbol.length <= 3) {
      exchange = 'NYSE'; // Most 3-letter symbols are NYSE
    } else if (stock.symbol.includes('.') || stock.symbol.length > 4) {
      exchange = 'OTC'; // OTC stocks often have dots or longer symbols
    }
    
    // Add detailed company information if available from Polygon
    let companyInfo = '';
    if (stockEnhanced) {
      const { stockData } = stockEnhanced;
      let companyDetails = [];
      
      // Company description (1-2 sentences)
      if (stockData.description) {
        const sentences = stockData.description.split(/[.!?]+/).filter(s => s.trim());
        const shortDesc = sentences.slice(0, 2).join('.') + '.';
        companyDetails.push(shortDesc);
      }
      
      // Industry information
      if (stockData.industry) {
        companyDetails.push(`The company operates in the ${stockData.industry} industry.`);
      }
      
      // Market cap information
      if (stockData.marketCap > 0) {
        const marketCapFormatted = stockData.marketCap >= 1000000000 
          ? `$${(stockData.marketCap / 1000000000).toFixed(1)} billion`
          : `$${(stockData.marketCap / 1000000).toFixed(1)} million`;
        companyDetails.push(`With a market capitalization of ${marketCapFormatted},`);
      }
      
      // Homepage/website if available
      if (stockData.homepageUrl) {
        companyDetails.push(`The company's website is ${stockData.homepageUrl}.`);
      }
      
      if (companyDetails.length > 0) {
        companyInfo = `Company background: ${companyDetails.join(' ')} `;
      }
    }
    
    return `${formattedCompanyName} (${exchange}: ${stock.symbol}): ${rankingText}. ${companyInfo}${technicalDetails} ${fundamentalDetails} ${analystDetails}`;
  }).join('\n\n');

  // Peer comparison will be added separately via the "Add Tickers To Article" button

  const finalPrompt = `Write a professional financial article about these ${rankingCategory.toLowerCase()} stocks.

REQUIRED HEADLINE: ${headline}

STOCKS TO WRITE ABOUT: ${stocks.map(stock => `${stock.companyName} (${stock.symbol})`).join(', ')}

DETAILED STOCK DATA TO INCORPORATE INTO THE NARRATIVE:
${stockDetails}

Write a clear, professional financial article that incorporates all the technical and fundamental data provided above. Use a straightforward, journalistic tone - avoid dramatic language, metaphors, or flowery descriptions. Focus on facts and data. Format company names in **bold** only on FIRST reference with ticker and exchange: **Company Name Inc.** (EXCHANGE: SYMBOL). For example: **Home Bancorp Inc.** (NASDAQ: HBCP) or **Monarch Casino & Resort Inc.** (NASDAQ: MCRI). On subsequent references, use ONLY the shortened company name without Inc/Corp/Ltd/LLC, without ticker, and without bold - just "Home Bancorp" or "Monarch Casino". 

STRUCTURE FOR EACH STOCK:
1. Lead with the ${rankingCategory} score change (e.g., "surged 101% from 49.73 to 99.86")
2. Include detailed company information (description, industry, market cap, website if provided in company background)
3. IMMEDIATELY follow with price context: "Currently trading at $X.XX, [up/down] X.X% on [Day], the stock sits [above/below] its moving averages"
   - CRITICAL: Keep price change and MA position SEPARATE. Say "down 1.6% on Tuesday" AND "sits below its 50-day moving average" as two distinct facts
   - DO NOT say "sliding 1.6% below its moving average" (confusing!)
   - Use specific day name (Monday, Tuesday, etc.) instead of "recently"
4. Then discuss other technical indicators (RSI, MACD if available)
5. Then fundamental analysis (Edge scores)

IMPORTANT: 
1. When first mentioning the ranking scores, use the format "Benzinga Edge Ranking [Category] score" with the category capitalized (e.g., "Benzinga Edge Ranking Value score", "Benzinga Edge Ranking Quality score"). On subsequent references, use lowercase (e.g., "value scores", "quality scores"). 
2. CRITICAL: Always mention the percentage increase for each stock's ${rankingCategory} SCORE change. The stock data above includes percentage gains for the SCORES (e.g., "surging 101% from 49.73 to 99.86") - you MUST include these percentages in your narrative. Don't just say "score went from X to Y" - say "score surged 101% from X to Y" or similar.
3. For stock PRICE movements, use the real-time data provided in the technical details (e.g., "The stock is down 1.3% on Tuesday"). Integrate price action EARLY when introducing each stock, right after mentioning the score change. Use specific day names instead of "recently".
4. Keep paragraphs to 2 sentences maximum.

CRITICAL: Use the exact headline provided above. Do not create your own headline. Start the article directly with the content. Integrate the technical analysis and fundamental metrics naturally into the article. Do not create separate sections or bullet points. Make the data part of the article, not an addendum. Write in a professional, journalistic style without dramatic language.`;

  console.log('=== FINAL PROMPT ===');
  
  return finalPrompt;
}

function parseEnhancedArticle(
  text: string, 
  stocks: EdgeRankingData[], 
  enhancedData: { [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } },
  rankingCategory: string = 'Momentum'
): ArticleData {
  const lines = text.split('\n');
  
  // Generate the headline based on the actual stock data
  const { sector, isMultiSector } = determineSector(stocks);
  const topStock = stocks[0];
  const momentumChange = topStock.momentumScore - (topStock.previousMomentumScore || 0);
  const momentumChangePercent = ((momentumChange) / (topStock.previousMomentumScore || 1)) * 100;
  
  // Create clean, engaging headlines without company names in multi-stock articles
  // Don't use sector name if multiple sectors are selected
  const sectorName = (sector === 'general' || isMultiSector) ? '' : sector.charAt(0).toUpperCase() + sector.slice(1);
  const stockCount = stocks.length;
  const stockText = stockCount === 1 ? 'Stock' : stockCount === 2 ? 'Stocks' : `${stockCount} Stocks`;
  
  const titleTemplates = [];
  
  if (stocks.length === 1) {
    // Single stock headlines
    titleTemplates.push(
      `${topStock.companyName} ${rankingCategory} Score Surges ${Math.round(momentumChangePercent)}% — Here's What's Driving It`,
      `Why ${topStock.companyName}'s ${rankingCategory} Score Just Jumped ${Math.round(momentumChangePercent)}%`,
      `${topStock.companyName} Sees ${rankingCategory} Score Surge ${Math.round(momentumChangePercent)}% — Investors Take Notice`
    );
  } else {
    // Multiple stocks - use cleaner format without company names
    titleTemplates.push(
      `${stockCount} ${sectorName} ${stockText} See ${rankingCategory} Scores Surge — One Jumps ${Math.round(momentumChangePercent)}%`,
      `${stockCount} ${sectorName} Value Plays Emerge — Scores Surge Up to ${Math.round(momentumChangePercent)}%`,
      `Why Are These ${stockCount} ${sectorName} ${rankingCategory} Scores Surging? One Jumps ${Math.round(momentumChangePercent)}%`,
      `${stockCount} ${sectorName} ${stockText} Post ${rankingCategory} Score Gains — Top Performer Up ${Math.round(momentumChangePercent)}%`,
      `Hidden Value in ${sectorName}: ${stockCount} ${stockText} See Rankings Surge Up to ${Math.round(momentumChangePercent)}%`,
      `${stockCount} ${sectorName} ${stockText} Heat Up — ${rankingCategory} Scores Jump Up to ${Math.round(momentumChangePercent)}%`
    );
  }
  
  // Select title - use the first one for consistency
  // Sector is already included in the headline template via sectorName variable
  const title = titleTemplates[0];

  // For narrative-style articles, we want to return the entire text as the introduction
  // and let the frontend handle the display
  let fullText = text.trim();
  
  // Remove any template-style content that might appear after the narrative
  // Look for patterns like stock names followed by template data
  const templatePatterns = [
    /\n\s*[A-Z][a-zA-Z\s&.,]+(?:Inc|Corp|Ltd|LLC|Group|Holding|Bank)?\s*\n\s*\([A-Z]+\)\s*\n/,
    /\n\s*[A-Z][a-zA-Z\s&.,]+(?:Inc|Corp|Ltd|LLC|Group|Holding|Bank)?\s*\n\s*\([A-Z]+\)\s*\n\s*experienced the largest week-over-week increase/,
    /\n\s*[A-Z][a-zA-Z\s&.,]+(?:Inc|Corp|Ltd|LLC|Group|Holding|Bank)?\s*\n\s*\([A-Z]+\)\s*\n\s*experienced.*momentum score.*moving from/,
    /\n\s*Analyst coverage shows.*ratings with an average price target/,
    /\n\s*experienced the largest week-over-week increase/,
    /\n\s*saw the second-largest week-over-week increase/,
    /\n\s*RSI at.*indicates/,
    /\n\s*Dividend yield of.*provides/,
    /\n\s*Small-cap stock with market cap/,
    /\n\s*Below-average Edge score/,
    /\n\s*Mixed signals from moving averages/,
    /\n\s*Price is near resistance/,
    /\n\s*MACD signals/,
    /\n\s*Edge breakdown:/,
    /\n\s*News sentiment is/,
    /\n\s*Large-cap stock with market cap/,
    /\n\s*Volume of.*shares indicates/,
    /\n\s*Average price target of.*represents/,
    /\n\s*Analyst coverage:.*ratings/,
    /\n\s*Mid-cap stock with market cap/,
    /\n\s*Price is near support/,
    /\n\s*Analyst coverage shows.*buy.*hold.*sell/
  ];
  
  let templateMatch = -1;
  for (const pattern of templatePatterns) {
    const match = fullText.search(pattern);
    if (match !== -1) {
      templateMatch = match;
      break;
    }
  }
  
  if (templateMatch !== -1) {
    fullText = fullText.substring(0, templateMatch).trim();
  }
  
  // Since we're integrating all data into the narrative, create minimal stock objects
  // that just contain basic info for the frontend display
  const stockArticles = stocks.map(stock => ({
    symbol: stock.symbol,
    companyName: stock.companyName,
    sector: stock.sector, // Preserve sector information
    industry: stock.industry, // Preserve industry information
    momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
    currentMomentum: stock.momentumScore,
    previousMomentum: stock.previousMomentumScore || 0,
    priceChange: stock.priceChange || 0,
    priceChangePercent: stock.priceChangePercent || 0,
    // Don't include separate technical/fundamental/analyst sections since they're now in the narrative
    technicalAnalysis: '',
    fundamentalAnalysis: '',
    analystInsights: ''
  }));

  // Ensure stocks are properly ranked by momentum change for display
  stockArticles.sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0));

  return {
    title,
    introduction: fullText, // Use the entire AI-generated text as the introduction
    stocks: stockArticles,
    rankingCategory
  };
}

function generateFallbackArticle(
  stocks: EdgeRankingData[], 
  enhancedData: { [symbol: string]: { stockData: CombinedStockData; edgeData: BenzingaEdgeData } }
): ArticleData {
  const stockArticles = stocks.map(stock => {
    const stockEnhanced = enhancedData[stock.symbol];
    
    return {
      symbol: stock.symbol,
      companyName: stock.companyName,
      sector: stock.sector, // Preserve sector information
      industry: stock.industry, // Preserve industry information
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
      currentMomentum: stock.momentumScore,
      previousMomentum: stock.previousMomentumScore || 0,
      priceChange: stock.priceChange || 0,
      priceChangePercent: stock.priceChangePercent || 0,
      technicalAnalysis: stockEnhanced ? generateTechnicalAnalysis(stockEnhanced.stockData) : 'Technical analysis shows mixed signals for this stock.',
      fundamentalAnalysis: stockEnhanced ? generateFundamentalAnalysis(stockEnhanced.stockData, stockEnhanced.edgeData) : 'Fundamental analysis shows mixed indicators for this stock.',
      analystInsights: stockEnhanced ? `Analyst coverage shows ${stockEnhanced.stockData.analystRatings.buy} buy, ${stockEnhanced.stockData.analystRatings.hold} hold, and ${stockEnhanced.stockData.analystRatings.sell} sell ratings.` : 'Analyst coverage for this stock shows mixed sentiment.'
    };
  });

  // Ensure stocks are properly ranked by momentum change for display
  stockArticles.sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0));

  return {
    title: `${stocks.length} Stocks Surging Right Now — Momentum Rankings Show These Names Could Supercharge Your Portfolio`,
    introduction: 'Market momentum analysis reveals several stocks showing significant strength and potential for continued upside.',
    stocks: stockArticles,
    rankingCategory: 'Momentum'
  };
}
