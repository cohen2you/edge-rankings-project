import { NextRequest, NextResponse } from 'next/server';
import { fetchEnhancedStockData } from '@/lib/benzinga';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { article, selectedTickers } = await request.json();
    
    console.log('=== ADD TICKERS TO ARTICLE API CALLED ===');
    console.log('Selected tickers:', selectedTickers);
    
    if (!selectedTickers || selectedTickers.length === 0) {
      return NextResponse.json(
        { error: 'No tickers selected' },
        { status: 400 }
      );
    }
    
    if (selectedTickers.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 tickers allowed' },
        { status: 400 }
      );
    }
    
    // Detect ranking category from article content
    let rankingCategory = 'Momentum'; // Default
    if (article.introduction.includes('value score') || article.introduction.includes('value scores')) {
      rankingCategory = 'Value';
    } else if (article.introduction.includes('quality score') || article.introduction.includes('quality scores')) {
      rankingCategory = 'Quality';
    } else if (article.introduction.includes('growth score') || article.introduction.includes('growth scores')) {
      rankingCategory = 'Growth';
    }
    
    console.log('Detected ranking category from article:', rankingCategory);
    
    // Fetch enhanced data to get full company names
    const benzingaApiKey = process.env.BENZINGA_API_KEY;
    const benzingaEdgeApiKey = process.env.BENZINGA_EDGE_API_KEY;
    
    let enhancedTickerData: { [symbol: string]: any } = {};
    if (benzingaApiKey && benzingaEdgeApiKey) {
      try {
        const symbols = selectedTickers.map((ticker: any) => ticker.symbol);
        enhancedTickerData = await fetchEnhancedStockData(symbols, benzingaApiKey, benzingaEdgeApiKey);
        console.log('Enhanced ticker data fetched:', Object.keys(enhancedTickerData));
      } catch (error) {
        console.warn('Failed to fetch enhanced ticker data, using basic data:', error);
      }
    }
    
    // Prepare detailed ticker information for AI
    const tickerInfo = selectedTickers.map((ticker: any) => {
      const enhancedData = enhancedTickerData[ticker.symbol];
      
      // Get company name from Benzinga API data
      let companyName = ticker.symbol; // fallback
      if (enhancedData?.stockData?.companyName) {
        companyName = enhancedData.stockData.companyName;
      } else if (ticker.companyName && ticker.companyName !== ticker.symbol) {
        companyName = ticker.companyName;
      }
      
      // Get the appropriate score based on ranking category
      let scoreValue = ticker.edgeScore;
      if (rankingCategory === 'Value') scoreValue = ticker.valueScore;
      else if (rankingCategory === 'Quality') scoreValue = ticker.qualityScore;
      else if (rankingCategory === 'Growth') scoreValue = ticker.growthScore;
      else if (rankingCategory === 'Momentum') scoreValue = ticker.momentumScore;
      
      const numericScore = typeof scoreValue === 'number' ? scoreValue : parseFloat(scoreValue || '0');
      
      return {
        symbol: ticker.symbol,
        companyName,
        price: ticker.price,
        marketCap: ticker.marketCap,
        edgeScore: ticker.edgeScore,
        momentumScore: ticker.momentumScore,
        valueScore: ticker.valueScore,
        growthScore: ticker.growthScore,
        qualityScore: ticker.qualityScore,
        primaryScore: numericScore.toFixed(2),
        primaryScoreLabel: rankingCategory
      };
    });
    
    // Use OpenAI to generate rich, integrated sector comparison
    const prompt = `You are a financial journalist. You have an article about specific stocks and need to integrate sector peer comparisons throughout the article.

ORIGINAL ARTICLE:
${article.introduction}

SECTOR PEER TICKERS TO INTEGRATE:
${tickerInfo.map((t: any) => `
${t.companyName} (NASDAQ: ${t.symbol})
- Price: $${t.price}
- Market Cap: $${t.marketCap}B
- Edge Score: ${t.edgeScore}
- ${t.primaryScoreLabel} Score: ${t.primaryScore}
- Momentum: ${t.momentumScore}, Value: ${t.valueScore}, Growth: ${t.growthScore}, Quality: ${t.qualityScore}
`).join('\n')}

MAIN STOCKS IN ARTICLE:
${article.stocks.map((s: any) => `${s.companyName} (${s.symbol})`).join(', ')}

INSTRUCTIONS:
1. Rewrite the article to naturally integrate the sector peer tickers throughout
2. For EACH sector peer ticker, write 2-3 sentences providing:
   - Full company name and ticker with EXACT formatting: "**Apple Inc.** (NASDAQ: AAPL)"
   - Current ${rankingCategory} score and brief context
   - How it compares to the main stocks
   - What this comparison reveals about market dynamics
3. Spread the peer ticker discussions throughout the article, not all at once
4. Each peer comparison should feel natural and add insight
5. Use the exact format for company names: "**Company Name Inc.** (NASDAQ: TICKER)" ONLY ON FIRST MENTION
   - First mention must be in bold with full ticker: "**Apple Inc.** (NASDAQ: AAPL)"
   - Include period after Inc, Corp, Ltd, LLC, etc.
   - SUBSEQUENT mentions use ONLY shortened name: "Apple" (no bold, no Inc, no ticker)
   - Examples: First mention "**Microsoft Corp.** (NASDAQ: MSFT)", later just "Microsoft"
6. Use AP style for all numbers:
   - Market caps: "$3.9 trillion" not "$3935.78B", "$529.88 billion" not "$529.88B"
   - Prices: "$255.95" for prices under $1000, "$1,247" for prices over $1000
   - Scores: "36.80" or "36.8" (keep decimal precision)
   - Round to one decimal place for readability (e.g., "$3.1 trillion" not "$3.095 trillion")
7. Maintain the article's overall narrative flow
8. Keep existing technical and fundamental analysis intact

CRITICAL: Return the COMPLETE rewritten article, not just the additions. Integrate peer comparisons naturally into the flow.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional financial journalist who seamlessly integrates sector peer analysis into stock articles. CRITICAL FORMATTING: First mention use bold with full ticker '**Apple Inc.** (NASDAQ: AAPL)' with period after Inc/Corp/Ltd/LLC. Subsequent mentions use ONLY shortened name without bold or ticker: just 'Apple' or 'Microsoft' (no Inc, no ticker, no bold). Use AP style for numbers: market caps as '$3.9 trillion' or '$529.5 billion', not '$3935.78B'. Round to one decimal place for readability. Provide meaningful context for each peer comparison."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const enhancedIntroduction = completion.choices[0]?.message?.content?.trim();
    
    if (!enhancedIntroduction) {
      throw new Error('Failed to generate enhanced article with sector tickers');
    }
    
    const updatedArticle = {
      ...article,
      introduction: enhancedIntroduction
    };
    
    return NextResponse.json({ 
      article: updatedArticle,
      message: `Added ${selectedTickers.length} sector tickers to the article`
    });
    
  } catch (error: any) {
    console.error('Error adding tickers to article:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add tickers to article' },
      { status: 500 }
    );
  }
} 