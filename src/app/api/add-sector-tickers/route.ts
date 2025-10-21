import { NextRequest, NextResponse } from 'next/server';
import { fetchEnhancedStockData } from '@/lib/benzinga';

function determineSector(stocks: any[]): string {
  // Use the actual sector data from the stocks
  console.log('Determining sector from stocks:', stocks.map(s => ({ symbol: s.symbol, sector: s.sector, industry: s.industry })));
  
  const sectors = stocks
    .map(s => s.sector)
    .filter(sector => sector && sector.trim() !== '')
    .map(sector => sector!.toLowerCase());
  
  console.log('Available sectors from stocks:', sectors);
  
  if (sectors.length === 0) {
    console.log('No sector data found in stocks, using general');
    return 'general';
  }
  
  // Find the most common sector
  const sectorCounts = sectors.reduce((acc, sector) => {
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  const mostCommonSector = Object.entries(sectorCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];
  
  console.log('Most common sector:', mostCommonSector);
  return mostCommonSector;
}

function getMajorSectorStocks(sector: string): string[] {
  // Normalize sector name for comparison
  const normalizedSector = sector.toLowerCase();
  
  switch (normalizedSector) {
    case 'solar':
    case 'renewable energy':
    case 'clean energy':
      // Major established solar and energy companies for comparison
      return ['FSLR', 'ENPH', 'SEDG', 'RUN', 'SPWR', 'NOVA', 'ARRY', 'SHLS'];
    case 'technology':
    case 'tech':
    case 'software':
    case 'semiconductors':
      // Major tech companies for comparison
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
    case 'financial':
    case 'banking':
    case 'finance':
    case 'financial services':
    case 'insurance':
    case 'utilities':
    case 'electric utilities':
    case 'gas utilities':
      // Major financial institutions and utilities for comparison
      return ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'DUK', 'SO', 'NEE', 'D', 'AEP'];
    case 'healthcare':
    case 'biotechnology':
    case 'pharmaceuticals':
      // Major healthcare companies for comparison
      return ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR'];
    case 'consumer discretionary':
    case 'retail':
      // Major consumer companies for comparison
      return ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'COST'];
    case 'industrial':
    case 'industrials':
    case 'manufacturing':
      // Major industrial companies for comparison
      return ['CAT', 'BA', 'GE', 'MMM', 'HON', 'UPS', 'FDX', 'DE'];
    case 'energy':
    case 'oil & gas':
      // Major energy companies for comparison
      return ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'KMI', 'VLO'];
    case 'basic materials':
    case 'materials':
      // Major materials companies for comparison
      return ['LIN', 'APD', 'FCX', 'NEM', 'AA', 'BLL', 'SHW', 'ECL'];
    case 'real estate':
    case 'reits':
      // Major real estate companies for comparison
      return ['PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'O', 'SPG'];
    case 'communication services':
    case 'telecommunications':
      // Major communication companies for comparison
      return ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS'];
    default:
      // Major market leaders and indices for comparison
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ'];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { stocks } = await request.json();
    
    console.log('=== ADD SECTOR TICKERS API CALLED ===');
    console.log('Stocks received:', stocks.length);
    console.log('Stock details:', stocks.map((s: any) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      sector: s.sector,
      industry: s.industry
    })));
    
    // Get server-side API keys
    const benzingaApiKey = process.env.BENZINGA_API_KEY;
    const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
    
    if (!benzingaApiKey || !benzingaEdgeApiKey) {
      return NextResponse.json(
        { error: 'Benzinga API keys not configured' },
        { status: 500 }
      );
    }
    
    // Determine sector and get major sector stocks
    const sector = determineSector(stocks);
    const allMajorSectorStocks = getMajorSectorStocks(sector);
    const selectedSymbols = stocks.map((s: any) => s.symbol);
    
    // Filter out stocks that are already in the main analysis
    const majorSectorStocks = allMajorSectorStocks.filter(symbol => 
      !selectedSymbols.includes(symbol)
    );
    
    console.log('Selected stocks:', selectedSymbols);
    console.log('All major sector stocks:', allMajorSectorStocks);
    console.log('Filtered major sector stocks for comparison:', majorSectorStocks);
    
    if (majorSectorStocks.length === 0) {
      return NextResponse.json(
        { error: 'No major sector stocks available for comparison' },
        { status: 400 }
      );
    }
    
    // Fetch sector comparison data
    const sectorComparisonData = await fetchEnhancedStockData(
      majorSectorStocks,
      benzingaApiKey,
      benzingaEdgeApiKey
    );
    
    console.log('Sector comparison data fetched for symbols:', Object.keys(sectorComparisonData));
    
    // Format the data for display
    const sectorTickers = Object.entries(sectorComparisonData).map(([symbol, data]) => {
      const { stockData, edgeData } = data;
      return {
        symbol,
        companyName: symbol, // We'll use symbol as company name for now
        price: stockData.price.toFixed(2),
        marketCap: (stockData.marketCap / 1000000000).toFixed(2),
        edgeScore: edgeData.edgeScore.toFixed(1),
        momentumScore: edgeData.momentumScore.toFixed(1),
        valueScore: edgeData.valueScore.toFixed(1),
        growthScore: edgeData.growthScore.toFixed(1),
        qualityScore: edgeData.qualityScore.toFixed(1)
      };
    });
    
    return NextResponse.json({ 
      sectorTickers,
      sector,
      message: `Added ${sectorTickers.length} major ${sector} sector stocks for comparison`
    });
    
  } catch (error: any) {
    console.error('Error adding sector tickers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add sector tickers' },
      { status: 500 }
    );
  }
} 