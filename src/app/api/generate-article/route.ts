import { NextRequest, NextResponse } from 'next/server';
import { EdgeRankingData, ArticleData } from '@/types';
import { 
  fetchEnhancedStockData, 
  generateTechnicalAnalysis, 
  generateFundamentalAnalysis, 
  generateRiskAssessment,
  BenzingaStockData,
  BenzingaEdgeData
} from '@/lib/benzinga';

export async function POST(request: NextRequest) {
  try {
    console.log('=== API ROUTE CALLED ===');
    const { stocks } = await request.json();
    
    console.log('Stocks received:', stocks?.length || 0);

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      console.log('Invalid stocks data');
      return NextResponse.json(
        { error: 'Invalid stocks data' },
        { status: 400 }
      );
    }

    // Get server-side API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
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

         // Fetch enhanced data from Benzinga APIs
     const benzingaApiKey = process.env.BENZINGA_API_KEY;
     const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
     
     console.log('Benzinga API keys available:', {
       benzinga: !!benzingaApiKey,
       benzingaEdge: !!benzingaEdgeApiKey
     });
     
     let enhancedData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } } = {};
     let sectorComparisonData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } } = {};
     
     if (benzingaApiKey && benzingaEdgeApiKey) {
       try {
         console.log('Fetching enhanced Benzinga data...');
         enhancedData = await fetchEnhancedStockData(
           selectedStocks.map(s => s.symbol),
           benzingaApiKey,
           benzingaEdgeApiKey
         );
         console.log('Enhanced data fetched for symbols:', Object.keys(enhancedData));
         
         // Get sector comparison stocks (big tickers in the same sector)
         const primarySector = selectedStocks[0]?.sector || 'Technology';
         const sectorComparisonStocks = getSectorComparisonStocks(primarySector);
         
         if (sectorComparisonStocks.length > 0) {
           console.log('Fetching sector comparison data for:', sectorComparisonStocks);
           sectorComparisonData = await fetchEnhancedStockData(
             sectorComparisonStocks,
             benzingaApiKey,
             benzingaEdgeApiKey
           );
           console.log('Sector comparison data fetched for symbols:', Object.keys(sectorComparisonData));
         }
       } catch (error) {
         console.warn('Failed to fetch Benzinga data, using fallback:', error);
       }
     } else {
       console.log('Benzinga API keys not available, using mock data');
     }

         // Generate enhanced article
     console.log('Generating enhanced article with OpenAI...');
     const article = await generateEnhancedArticle(selectedStocks, enhancedData, sectorComparisonData, apiKey);
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
 
 function getSectorComparisonStocks(sector: string): string[] {
   // Define major stocks by sector for comparison
   const sectorStocks: { [key: string]: string[] } = {
     'Technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX'],
     'Healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'DHR', 'LLY', 'ABT'],
     'Financial Services': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'AXP'],
     'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TJX'],
     'Communication Services': ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'CHTR'],
     'Industrials': ['BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT'],
     'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'KMI', 'PSX', 'VLO'],
     'Consumer Defensive': ['PG', 'KO', 'WMT', 'COST', 'PEP', 'CL', 'PM', 'MO'],
     'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'SPG', 'DLR'],
     'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'XEL', 'SRE', 'WEC'],
     'Basic Materials': ['LIN', 'APD', 'FCX', 'NEM', 'DOW', 'DD', 'NUE', 'BLL']
   };
   
   return sectorStocks[sector] || sectorStocks['Technology']; // Default to Technology if sector not found
 }
 
 async function generateEnhancedArticle(
   stocks: EdgeRankingData[], 
   enhancedData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } },
   sectorComparisonData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } },
   apiKey: string
 ): Promise<ArticleData> {

     const prompt = createEnhancedArticlePrompt(stocks, enhancedData, sectorComparisonData);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a senior financial analyst and writer specializing in stock market analysis. Write comprehensive, professional articles in the style of Benzinga Pro with detailed technical and fundamental analysis. Focus on actionable insights for traders and investors. Use the provided data to create detailed analysis for each stock including technical indicators, fundamental metrics, risk assessment, and trading recommendations.`
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

         // Parse the generated text into structured article data
     return parseEnhancedArticle(generatedText, stocks, enhancedData, sectorComparisonData);
     } catch (error) {
     console.error('AI generation failed:', error);
     // Fallback to basic article generation
     return generateFallbackArticle(stocks, enhancedData, sectorComparisonData);
   }
}

 function createEnhancedArticlePrompt(
   stocks: EdgeRankingData[], 
   enhancedData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } },
   sectorComparisonData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } }
 ): string {
  
  // Determine sector/industry from stock data
  const sectors = stocks.map(stock => stock.sector || 'Technology').filter(Boolean);
  const primarySector = sectors.length > 0 ? sectors[0] : 'Technology';
  const stockCount = stocks.length;
  
  const stockAnalysisData = stocks.map(stock => {
    const stockEnhanced = enhancedData[stock.symbol];
    const momentumChange = stock.momentumScore - (stock.previousMomentumScore || 0);
    
         const exchange = stock.exchange || 'NASDAQ'; // Default to NASDAQ if not specified
     let analysis = `
 STOCK: ${stock.companyName} (${exchange}: ${stock.symbol})
 
 MOMENTUM ANALYSIS:
 - Current Momentum Score: ${stock.momentumScore.toFixed(2)}
 - Previous Momentum Score: ${stock.previousMomentumScore?.toFixed(2) || 'N/A'}
 - Momentum Change: ${momentumChange.toFixed(2)}
 - Price Change: ${stock.priceChangePercent?.toFixed(2)}%
 - Market Cap: ${stock.marketCap ? `$${(stock.marketCap / 1000000000).toFixed(2)}B` : 'N/A'}`;

    if (stockEnhanced) {
      const { stockData, edgeData } = stockEnhanced;
      
      analysis += `

ENHANCED TECHNICAL DATA:
- Current Price: $${stockData.price.toFixed(2)}
- Volume: ${stockData.volume.toLocaleString()}
- RSI: ${stockData.technicalIndicators.rsi.toFixed(2)}
- MACD: ${stockData.technicalIndicators.macd}
- 20-day SMA: $${stockData.technicalIndicators.movingAverages.sma20.toFixed(2)}
- 50-day SMA: $${stockData.technicalIndicators.movingAverages.sma50.toFixed(2)}
- 200-day SMA: $${stockData.technicalIndicators.movingAverages.sma200.toFixed(2)}
- Support Level: $${stockData.technicalIndicators.support.toFixed(2)}
- Resistance Level: $${stockData.technicalIndicators.resistance.toFixed(2)}

FUNDAMENTAL METRICS:
- P/E Ratio: ${stockData.peRatio?.toFixed(2) || 'N/A'}
- Dividend Yield: ${stockData.dividendYield?.toFixed(2)}%
- Beta: ${stockData.beta?.toFixed(2) || 'N/A'}

BENZINGA EDGE SCORES:
- Overall Edge Score: ${edgeData.edgeScore.toFixed(2)}/100
- Momentum Score: ${edgeData.momentumScore.toFixed(2)}/100
- Value Score: ${edgeData.valueScore.toFixed(2)}/100
- Growth Score: ${edgeData.growthScore.toFixed(2)}/100
- Quality Score: ${edgeData.qualityScore.toFixed(2)}/100

PERCENTILE RANKINGS:
- Momentum Percentile: ${edgeData.percentileRankings.momentum.toFixed(1)}%
- Value Percentile: ${edgeData.percentileRankings.value.toFixed(1)}%
- Growth Percentile: ${edgeData.percentileRankings.growth.toFixed(1)}%
- Quality Percentile: ${edgeData.percentileRankings.quality.toFixed(1)}%
- Overall Percentile: ${edgeData.percentileRankings.overall.toFixed(1)}%

RISK METRICS:
- Volatility: ${edgeData.riskMetrics.volatility.toFixed(2)}%
- Sharpe Ratio: ${edgeData.riskMetrics.sharpeRatio.toFixed(2)}
- Max Drawdown: ${edgeData.riskMetrics.maxDrawdown.toFixed(2)}%
- Correlation to SPY: ${edgeData.riskMetrics.correlationToSPY.toFixed(2)}

ANALYST SENTIMENT:
- Buy Ratings: ${stockData.analystRatings.buy}
- Hold Ratings: ${stockData.analystRatings.hold}
- Sell Ratings: ${stockData.analystRatings.sell}
- Average Price Target: $${stockData.analystRatings.averageTarget.toFixed(2)}
- High Target: $${stockData.analystRatings.highTarget.toFixed(2)}
- Low Target: $${stockData.analystRatings.lowTarget.toFixed(2)}

NEWS SENTIMENT:
- Bullish Articles: ${stockData.newsSentiment.bullish}
- Bearish Articles: ${stockData.newsSentiment.bearish}
- Neutral Articles: ${stockData.newsSentiment.neutral}
- Total Articles: ${stockData.newsSentiment.totalArticles}`;
    }

    analysis += `

BASIC TECHNICAL INDICATORS:
- 50-day MA: ${stock.fiftyDayMA ? `$${stock.fiftyDayMA.toFixed(2)}` : 'N/A'}
- 100-day MA: ${stock.hundredDayMA ? `$${stock.hundredDayMA.toFixed(2)}` : 'N/A'}
- 200-day MA: ${stock.twoHundredDayMA ? `$${stock.twoHundredDayMA.toFixed(2)}` : 'N/A'}
- RSI: ${stock.rsi ? stock.rsi.toFixed(2) : 'N/A'}`;

         return analysis;
   }).join('\n\n');
 
   // Add sector comparison data
   let sectorComparisonSection = '';
   if (Object.keys(sectorComparisonData).length > 0) {
     const comparisonStocks = Object.entries(sectorComparisonData).map(([symbol, data]) => {
       const { stockData, edgeData } = data;
       return `
 SECTOR COMPARISON STOCK: ${symbol}
 
 BENZINGA EDGE SCORES:
 - Overall Edge Score: ${edgeData.edgeScore.toFixed(2)}/100
 - Momentum Score: ${edgeData.momentumScore.toFixed(2)}/100
 - Value Score: ${edgeData.valueScore.toFixed(2)}/100
 - Growth Score: ${edgeData.growthScore.toFixed(2)}/100
 - Quality Score: ${edgeData.qualityScore.toFixed(2)}/100
 
 PERCENTILE RANKINGS:
 - Momentum Percentile: ${edgeData.percentileRankings.momentum.toFixed(1)}%
 - Value Percentile: ${edgeData.percentileRankings.value.toFixed(1)}%
 - Growth Percentile: ${edgeData.percentileRankings.growth.toFixed(1)}%
 - Quality Percentile: ${edgeData.percentileRankings.quality.toFixed(1)}%
 - Overall Percentile: ${edgeData.percentileRankings.overall.toFixed(1)}%
 
 CURRENT PRICE: $${stockData.price.toFixed(2)}
 MARKET CAP: $${(stockData.marketCap / 1000000000).toFixed(2)}B`;
     }).join('\n\n');
     
     sectorComparisonSection = `
 
 SECTOR COMPARISON STOCKS (Major ${primarySector} Companies):
 ${comparisonStocks}`;
   }
 
   return `Generate a comprehensive financial article about these momentum stocks based on Benzinga Edge Rankings data and enhanced technical/fundamental analysis.
 
 ${stockAnalysisData}${sectorComparisonSection}

Write a detailed article that includes:

1. HEADLINE: Create a dynamic headline in this format: "${stockCount} ${primarySector} Stocks On Fire Right Now — Momentum Rankings Show These Names Could Light Up Your Portfolio"

2. EXECUTIVE SUMMARY: Market context about momentum trends and why these stocks stand out (2-3 sentences, max 2 sentences per paragraph)

 3. DETAILED STOCK ANALYSIS: For each stock, provide a concise analysis including:
    - Technical Analysis: RSI interpretation, moving average analysis, MACD signals
    - Fundamental Analysis: P/E ratio analysis, Edge score interpretation, analyst sentiment
    - Risk Assessment: Volatility analysis, beta interpretation
    - Trading Recommendations: Brief entry/exit points and target prices

 4. SECTOR COMPARISON: Include a brief comparison of how the momentum stocks stack up against major sector players (use the provided sector comparison data)
    - Compare Edge scores and percentile rankings
    - Highlight relative strength or weakness
    - Provide context for the momentum stocks' performance

 5. CONCLUSION: Summary of key findings and actionable insights (2-3 sentences)

IMPORTANT FORMATTING RULES:
- Write in professional financial journalism style similar to Benzinga Pro
- Keep each paragraph concise - NO MORE THAN 2 SENTENCES PER PARAGRAPH
- Avoid repetition of the same information
- Use specific data points rather than generic statements
- Each stock should appear only once in the analysis
- Focus on actionable insights for traders and investors
- IMPORTANT: Identify each stock by their ranking position (largest, second-largest, third-largest, etc.) based on momentum change
- For the first stock: "experienced the largest week-over-week increase in momentum score"
- For the second stock: "saw the second-largest week-over-week increase in momentum score"  
- For the third stock: "recorded the third-largest week-over-week increase in momentum score"
- For additional stocks: "showed a significant week-over-week increase in momentum score"
- Format the article with clear section breaks and concise paragraphs
- Include the standard "Momentum Stocks To Add To Your Watchlist" section with Benzinga Edge explanation
- Make the article flow naturally from market context to individual stock analysis
- STOCK NAME FORMATTING: Include stock names inline with the sentence in bold format like "**Metropolitan Bank Holding Inc (NYSE: MCB)** experienced the largest week-over-week increase..."
- Always include the exchange with the ticker symbol (NYSE:, NASDAQ:, etc.)
- Do not put stock names on separate lines - keep them flowing naturally within the sentence`;
}

 function parseEnhancedArticle(
   text: string, 
   stocks: EdgeRankingData[], 
   enhancedData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } },
   sectorComparisonData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } }
 ): ArticleData {
  const lines = text.split('\n');
  
  // Determine sector/industry from stock data for dynamic headline
  const sectors = stocks.map(stock => stock.sector || 'Technology').filter(Boolean);
  const primarySector = sectors.length > 0 ? sectors[0] : 'Technology';
  const stockCount = stocks.length;
  
  let title = `${stockCount} ${primarySector} Stocks On Fire Right Now — Momentum Rankings Show These Names Could Light Up Your Portfolio`;
  let introduction = '';
  const processedStocks = new Set<string>();
  const stockArticles = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('Market context') || line.includes('momentum trends') || line.includes('Executive Summary')) {
      introduction = line;
    }
    
    // Look for stock sections - only process each stock once
    for (const stock of stocks) {
      if (!processedStocks.has(stock.symbol) && (line.includes(stock.symbol) || line.includes(stock.companyName))) {
        const stockEnhanced = enhancedData[stock.symbol];
        
                 const stockArticle = {
           symbol: stock.symbol,
           companyName: stock.companyName,
           exchange: stock.exchange || 'NASDAQ',
           momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
           currentMomentum: stock.momentumScore,
           previousMomentum: stock.previousMomentumScore || 0,
           priceChange: stock.priceChange || 0,
           priceChangePercent: stock.priceChangePercent || 0,
           technicalAnalysis: stockEnhanced ? generateTechnicalAnalysis(stockEnhanced.stockData) : 'Technical analysis shows mixed signals for this stock.',
           fundamentalAnalysis: stockEnhanced ? generateFundamentalAnalysis(stockEnhanced.stockData, stockEnhanced.edgeData) : 'Fundamental analysis shows mixed indicators for this stock.',
           analystInsights: stockEnhanced ? `Analyst coverage shows ${stockEnhanced.stockData.analystRatings.buy} buy, ${stockEnhanced.stockData.analystRatings.hold} hold, and ${stockEnhanced.stockData.analystRatings.sell} sell ratings with an average price target of $${stockEnhanced.stockData.analystRatings.averageTarget.toFixed(2)}.` : 'Analyst coverage for this stock shows mixed sentiment.'
         };
        stockArticles.push(stockArticle);
        processedStocks.add(stock.symbol);
        break;
      }
    }
  }

     // Ensure stocks are properly ranked by momentum change for display
   stockArticles.sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0));
 
   // Process sector comparison data
   const sectorComparisonArticles = Object.entries(sectorComparisonData).map(([symbol, data]) => {
     const { stockData, edgeData } = data;
     return {
       symbol,
       companyName: symbol, // We'll use symbol as company name for comparison stocks
       exchange: 'NASDAQ', // Default exchange
       edgeScore: edgeData.edgeScore,
       momentumScore: edgeData.momentumScore,
       valueScore: edgeData.valueScore,
       growthScore: edgeData.growthScore,
       qualityScore: edgeData.qualityScore,
       momentumPercentile: edgeData.percentileRankings.momentum,
       valuePercentile: edgeData.percentileRankings.value,
       growthPercentile: edgeData.percentileRankings.growth,
       qualityPercentile: edgeData.percentileRankings.quality,
       overallPercentile: edgeData.percentileRankings.overall,
       currentPrice: stockData.price,
       marketCap: stockData.marketCap
     };
   });
 
   return {
     title,
     introduction: introduction || 'Market momentum analysis reveals several stocks showing significant strength and potential for continued upside.',
     stocks: stockArticles.length > 0 ? stockArticles : stocks.map(stock => ({
       symbol: stock.symbol,
       companyName: stock.companyName,
       momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
       currentMomentum: stock.momentumScore,
       previousMomentum: stock.previousMomentumScore || 0,
       priceChange: stock.priceChange || 0,
       priceChangePercent: stock.priceChangePercent || 0,
       technicalAnalysis: 'Technical analysis shows mixed signals for this stock.',
       fundamentalAnalysis: 'Fundamental analysis shows mixed indicators for this stock.',
       analystInsights: 'Analyst coverage for this stock shows mixed sentiment.'
     })),
     sectorComparison: sectorComparisonArticles.length > 0 ? sectorComparisonArticles : undefined
   };
}

 function generateFallbackArticle(
   stocks: EdgeRankingData[], 
   enhancedData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } },
   sectorComparisonData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } }
 ): ArticleData {
  // Determine sector/industry from stock data for dynamic headline
  const sectors = stocks.map(stock => stock.sector || 'Technology').filter(Boolean);
  const primarySector = sectors.length > 0 ? sectors[0] : 'Technology';
  const stockCount = stocks.length;
  
  const stockArticles = stocks.map(stock => {
    const stockEnhanced = enhancedData[stock.symbol];
    
         return {
       symbol: stock.symbol,
       companyName: stock.companyName,
       exchange: stock.exchange || 'NASDAQ',
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
 
   // Process sector comparison data for fallback
   const sectorComparisonArticles = Object.entries(sectorComparisonData).map(([symbol, data]) => {
     const { stockData, edgeData } = data;
     return {
       symbol,
       companyName: symbol,
       exchange: 'NASDAQ',
       edgeScore: edgeData.edgeScore,
       momentumScore: edgeData.momentumScore,
       valueScore: edgeData.valueScore,
       growthScore: edgeData.growthScore,
       qualityScore: edgeData.qualityScore,
       momentumPercentile: edgeData.percentileRankings.momentum,
       valuePercentile: edgeData.percentileRankings.value,
       growthPercentile: edgeData.percentileRankings.growth,
       qualityPercentile: edgeData.percentileRankings.quality,
       overallPercentile: edgeData.percentileRankings.overall,
       currentPrice: stockData.price,
       marketCap: stockData.marketCap
     };
   });
 
   return {
     title: `${stockCount} ${primarySector} Stocks On Fire Right Now — Momentum Rankings Show These Names Could Light Up Your Portfolio`,
     introduction: 'Market momentum analysis reveals several stocks showing significant strength and potential for continued upside.',
     stocks: stockArticles,
     sectorComparison: sectorComparisonArticles.length > 0 ? sectorComparisonArticles : undefined
   };
}
