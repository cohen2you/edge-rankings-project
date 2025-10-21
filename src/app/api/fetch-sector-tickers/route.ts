import { NextRequest, NextResponse } from 'next/server';
import { fetchCombinedStockData } from '@/lib/stockData';

function determineSector(stocks: any[]): string {
  const sectors = stocks
    .map(s => s.sector)
    .filter(sector => sector && sector.trim() !== '')
    .map(sector => sector!.toLowerCase());
  
  console.log('Available sectors from stocks:', sectors);
  
  if (sectors.length === 0) {
    console.log('No sector data found in stocks, using general');
    return 'general';
  }
  
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
    case 'consumer cyclical':
    case 'retail':
      return ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'COST', 'MAR', 'HLT', 'BKNG', 'EXPE', 'CCL', 'RCL', 'NCLH'];
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

export async function POST(request: NextRequest) {
  try {
    const { stocks } = await request.json();
    
    console.log('=== FETCH SECTOR TICKERS API CALLED ===');
    console.log('Stocks received:', stocks.length);
    console.log('Stock details:', stocks.map((s: any) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      sector: s.sector,
      industry: s.industry
    })));
    
    const polygonApiKey = process.env.POLYGON_API_KEY;
    const benzingaApiKey = process.env.BENZINGA_API_KEY;
    const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
    
    if (!polygonApiKey || !benzingaApiKey || !benzingaEdgeApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured. Please set POLYGON_API_KEY, BENZINGA_API_KEY and BENZINGA_EDGE_API_KEY' },
        { status: 500 }
      );
    }
    
    const sector = determineSector(stocks);
    const allMajorSectorStocks = getMajorSectorStocks(sector);
    const selectedSymbols = stocks.map((s: any) => s.symbol);
    
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
    
    const sectorComparisonData = await fetchCombinedStockData(
      majorSectorStocks,
      polygonApiKey,
      benzingaApiKey,
      benzingaEdgeApiKey
    );
    
    console.log('Sector comparison data fetched for symbols:', Object.keys(sectorComparisonData));
    
    const sectorTickers = Object.entries(sectorComparisonData).map(([symbol, data]: [string, any]) => {
      const { stockData, edgeData } = data;
      return {
        symbol,
        companyName: stockData.companyName || symbol, // Use actual company name if available
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
      message: `Fetched ${sectorTickers.length} major ${sector} sector stocks for comparison`
    });
    
  } catch (error: any) {
    console.error('Error fetching sector tickers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sector tickers' },
      { status: 500 }
    );
  }
} 