import { EdgeRankingData, ArticleData, StockArticle } from '@/types';

export async function generateArticle(stocks: EdgeRankingData[]): Promise<ArticleData> {
  try {
    const response = await fetch('/api/generate-article', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stocks }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate article');
    }

    const data = await response.json();
    return data.article;
  } catch (error) {
    console.error('AI generation failed, falling back to template:', error);
    return generateTemplateArticle(stocks);
  }
}

function generateTemplateArticle(stocks: EdgeRankingData[]): ArticleData {
  // Sort stocks by momentum change
  const sortedStocks = stocks
    .filter(stock => stock.previousMomentumScore !== undefined)
    .map(stock => ({
      ...stock,
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0)
    }))
    .sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0));

  const topStocks = sortedStocks.slice(0, 3);
  
  // Generate market context based on sector
  const sector = determineSector(topStocks);
  const marketContext = generateMarketContext(sector, topStocks);

  const stockArticles: StockArticle[] = topStocks.map(stock => ({
    symbol: stock.symbol,
    companyName: stock.companyName,
    momentumChange: stock.momentumChange || 0,
    currentMomentum: stock.momentumScore,
    previousMomentum: stock.previousMomentumScore || 0,
    priceChange: stock.priceChange || 0,
    priceChangePercent: stock.priceChangePercent || 0,
    technicalAnalysis: generateTechnicalAnalysis(stock),
    fundamentalAnalysis: generateFundamentalAnalysis(stock),
    analystInsights: generateAnalystInsights(stock)
  }));

  return {
    title: `Momentum Stocks To Add To Your Watchlist`,
    introduction: marketContext,
    stocks: stockArticles
  };
}

function determineSector(stocks: EdgeRankingData[]): string {
  // Simple sector detection based on company names
  const companyNames = stocks.map(s => s.companyName.toLowerCase());
  
  if (companyNames.some(name => name.includes('solar') || name.includes('energy') || name.includes('tech'))) {
    return 'solar';
  }
  if (companyNames.some(name => name.includes('tech') || name.includes('software'))) {
    return 'technology';
  }
  if (companyNames.some(name => name.includes('bank') || name.includes('financial'))) {
    return 'financial';
  }
  
  return 'general';
}

function generateMarketContext(sector: string, stocks: EdgeRankingData[]): string {
  const totalMomentumChange = stocks.reduce((sum, stock) => sum + (stock.momentumChange || 0), 0);
  const avgMomentumChange = totalMomentumChange / stocks.length;
  
  let context = "Broader market momentum is fading, but a group of ";
  
  switch (sector) {
    case 'solar':
      context += "solar names are bucking the trend and could be charging up for another leg higher.";
      break;
    case 'technology':
      context += "tech stocks are showing resilience and could be poised for continued growth.";
      break;
    case 'financial':
      context += "financial stocks are gaining momentum and could be worth watching.";
      break;
    default:
      context += "stocks are bucking the trend and could be worth adding to your watchlist.";
  }
  
  return context;
}

function generateTechnicalAnalysis(stock: EdgeRankingData): string {
  const analysis = [];
  
  if (stock.fiftyDayMA && stock.price) {
    const aboveMA = stock.price > stock.fiftyDayMA;
    analysis.push(`The stock is ${aboveMA ? 'above' : 'below'} its 50-day moving average of $${stock.fiftyDayMA.toFixed(2)}, indicating a ${aboveMA ? 'bullish' : 'bearish'} trend`);
  }
  
  if (stock.hundredDayMA && stock.twoHundredDayMA) {
    analysis.push(`while the 100-day and 200-day moving averages are at $${stock.hundredDayMA.toFixed(2)} and $${stock.twoHundredDayMA.toFixed(2)}, respectively`);
  }
  
  if (stock.rsi) {
    let rsiAnalysis = "";
    if (stock.rsi > 70) {
      rsiAnalysis = "indicating overbought conditions";
    } else if (stock.rsi < 30) {
      rsiAnalysis = "indicating oversold conditions";
    } else {
      rsiAnalysis = "indicating neutral conditions";
    }
    analysis.push(`The RSI is calculated at ${stock.rsi.toFixed(2)}, ${rsiAnalysis}`);
  }
  
  if (analysis.length === 0) {
    analysis.push("Technical indicators show mixed signals for this stock.");
  }
  
  return analysis.join(". ") + ".";
}

function generateFundamentalAnalysis(stock: EdgeRankingData): string {
  const analysis = [];
  
  // Basic data
  if (stock.marketCap) {
    const marketCapB = stock.marketCap / 1000000000;
    analysis.push(`With a market cap of $${marketCapB.toFixed(2)} billion`);
  }
  
  if (stock.peRatio) {
    analysis.push(`and a P/E ratio of ${stock.peRatio.toFixed(2)}`);
  }
  
  if (stock.forwardPeRatio) {
    analysis.push(`The forward P/E of ${stock.forwardPeRatio.toFixed(2)} indicates a more favorable outlook for future earnings`);
  }
  
  // Enhanced Benzinga data
  if (stock.benzingaData?.keyStatistics) {
    const stats = stock.benzingaData.keyStatistics;
    
    if (stats.revenueGrowth) {
      analysis.push(`revenue growth of ${(stats.revenueGrowth * 100).toFixed(1)}% year-over-year`);
    }
    
    if (stats.ebitdaMargin) {
      analysis.push(`EBITDA margin of ${(stats.ebitdaMargin * 100).toFixed(1)}%`);
    }
    
    if (stats.cashAndCashEquivalents) {
      analysis.push(`strong cash position of $${(stats.cashAndCashEquivalents / 1000000000).toFixed(1)}B`);
    }
    
    if (stats.forwardDividendYield) {
      analysis.push(`dividend yield of ${(stats.forwardDividendYield * 100).toFixed(2)}%`);
    }
  }
  
  // Percentile rankings
  if (stock.benzingaData?.percentiles) {
    const percentiles = stock.benzingaData.percentiles;
    
    const ebitdaPercentile = percentiles.find(p => p.dataId === 'ebitda_margin')?.percentile;
    if (ebitdaPercentile && ebitdaPercentile >= 80) {
      analysis.push(`EBITDA margin ranks in the ${ebitdaPercentile}th percentile vs industry peers`);
    }
    
    const pePercentile = percentiles.find(p => p.dataId === 'pe_ratio')?.percentile;
    if (pePercentile && pePercentile <= 30) {
      analysis.push(`P/E ratio ranks in the ${pePercentile}th percentile, indicating potential value`);
    }
    
    const marketCapPercentile = percentiles.find(p => p.dataId === 'market_cap')?.percentile;
    if (marketCapPercentile && marketCapPercentile >= 90) {
      analysis.push(`market cap ranks in the ${marketCapPercentile}th percentile of the industry`);
    }
  }
  
  if (analysis.length === 0) {
    analysis.push("Fundamental analysis shows mixed indicators for this stock.");
  }
  
  return analysis.join(", ") + ".";
}

function generateAnalystInsights(stock: EdgeRankingData): string {
  if (stock.analystRatings && stock.analystRatings.length > 0) {
    const ratings = stock.analystRatings.map(rating => 
      `${rating.analyst} maintaining a ${rating.rating} rating${rating.priceTarget ? ` with a $${rating.priceTarget} price target` : ''}`
    );
    return `Analyst sentiment remains positive, with ${ratings.join(' and ')}.`;
  }
  
  return "Analyst coverage for this stock shows mixed sentiment.";
}

export function formatArticleForDisplay(article: ArticleData): string {
  let formatted = `${article.title}\n\n`;
  formatted += `${article.introduction}\n\n`;
  
  formatted += `Momentum Stocks To Add To Your Watchlist\n`;
  formatted += `Benzinga's Edge Stock Rankings system assigns scores based on momentum, growth, value and quality. The momentum score is a valuable metric for short-term trading strategies that aim to capture continuation of price trends.\n\n`;
  
  formatted += `Identifying significant changes in momentum can help traders get ahead of potential changes in general stock direction. Benzinga's rankings system flagged ${article.stocks.length} stocks that saw significant swings in bullish momentum over the past week.\n\n`;
  
  article.stocks.forEach((stock, index) => {
    formatted += `${stock.companyName} Inc\n`;
    formatted += `(${stock.symbol})\n`;
    
    // Use proper ranking language based on position
    let rankingText;
    if (index === 0) {
      rankingText = `experienced the largest week-over-week increase in momentum score`;
    } else if (index === 1) {
      rankingText = `saw the second-largest week-over-week increase in momentum score`;
    } else if (index === 2) {
      rankingText = `recorded the third-largest week-over-week increase in momentum score`;
    } else {
      rankingText = `showed a significant week-over-week increase in momentum score`;
    }
    
    formatted += `${rankingText}, moving from a score of ${stock.previousMomentum.toFixed(2)} to a current score of ${stock.currentMomentum.toFixed(2)}. ${stock.companyName} shares are up about ${Math.abs(stock.priceChangePercent).toFixed(0)}% over the past week, according to Benzinga Pro.\n\n`;
    
    // Use the actual AI-generated content instead of overriding it
    if (stock.technicalAnalysis && stock.technicalAnalysis !== 'Technical analysis shows mixed signals for this stock.') {
      formatted += `${stock.technicalAnalysis}\n\n`;
    }
    
    if (stock.fundamentalAnalysis && stock.fundamentalAnalysis !== 'Fundamental analysis shows mixed indicators for this stock.') {
      formatted += `${stock.fundamentalAnalysis}\n\n`;
    }
    
    if (stock.analystInsights && stock.analystInsights !== 'Analyst coverage for this stock shows mixed sentiment.') {
      formatted += `${stock.analystInsights}\n\n`;
    }
    
    if (index < article.stocks.length - 1) {
      formatted += `\n\n`;
    }
  });
  
  return formatted;
}
