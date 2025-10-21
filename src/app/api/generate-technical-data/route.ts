import { NextRequest, NextResponse } from 'next/server';
import { EdgeRankingData } from '@/types';
import { fetchEnhancedStockData } from '@/lib/benzinga';

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
    const benzingaApiKey = process.env.BENZINGA_API_KEY;
    const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
    
    // Debug: Check if environment variables are loaded
    console.log('Environment check:', {
      benzingaKey: benzingaApiKey ? 'Present' : 'Missing',
      benzingaEdgeKey: benzingaEdgeApiKey ? 'Present' : 'Missing'
    });
    
    if (!benzingaApiKey || !benzingaEdgeApiKey) {
      console.log('Benzinga API keys not configured');
      return NextResponse.json(
        { error: 'Benzinga API keys not configured. Please set BENZINGA_API_KEY and BENZINGA_EDGE_API_KEY in your environment.' },
        { status: 500 }
      );
    }

    // Fetch enhanced data from Benzinga APIs
    console.log('Fetching enhanced Benzinga data...');
    const enhancedData = await fetchEnhancedStockData(
      stocks.map(s => s.symbol),
      benzingaApiKey,
      benzingaEdgeApiKey
    );
    console.log('Enhanced data fetched for symbols:', Object.keys(enhancedData));

    return NextResponse.json({ technicalData: enhancedData });
  } catch (error) {
    console.error('Error generating technical data:', error);
    return NextResponse.json(
      { error: 'Failed to generate technical data' },
      { status: 500 }
    );
  }
} 