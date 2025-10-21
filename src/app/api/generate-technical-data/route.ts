import { NextRequest, NextResponse } from 'next/server';
import { EdgeRankingData } from '@/types';
import { fetchCombinedStockData } from '@/lib/stockData';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TECHNICAL DATA API ROUTE CALLED ===');
    const { stocks } = await request.json();
    
    console.log('Stocks received:', stocks?.length || 0);

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      console.log('Invalid stocks data');
      return NextResponse.json(
        { error: 'Invalid stocks data' },
        { status: 400 }
      );
    }

    // Get server-side API keys
    const polygonApiKey = process.env.POLYGON_API_KEY;
    const benzingaApiKey = process.env.BENZINGA_API_KEY;
    const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
    
    // Debug: Check if environment variables are loaded
    console.log('Environment check:', {
      polygonKey: polygonApiKey ? 'Present' : 'Missing',
      benzingaKey: benzingaApiKey ? 'Present' : 'Missing',
      benzingaEdgeKey: benzingaEdgeApiKey ? 'Present' : 'Missing'
    });
    
    if (!polygonApiKey || !benzingaApiKey || !benzingaEdgeApiKey) {
      console.log('API keys not configured');
      return NextResponse.json(
        { error: 'API keys not configured. Please set POLYGON_API_KEY, BENZINGA_API_KEY and BENZINGA_EDGE_API_KEY in your environment.' },
        { status: 500 }
      );
    }

    // Fetch combined data from Polygon and Benzinga APIs
    console.log('Fetching combined data from Polygon and Benzinga...');
    const enhancedData = await fetchCombinedStockData(
      stocks.map((s: EdgeRankingData) => s.symbol),
      polygonApiKey,
      benzingaApiKey,
      benzingaEdgeApiKey
    );
    console.log('Combined data fetched for symbols:', Object.keys(enhancedData));

    return NextResponse.json({ technicalData: enhancedData });
  } catch (error) {
    console.error('Error generating technical data:', error);
    return NextResponse.json(
      { error: 'Failed to generate technical data' },
      { status: 500 }
    );
  }
} 