import { NextRequest, NextResponse } from 'next/server';

const BENZINGA_API_KEY = process.env.BENZINGA_API_KEY!;
const BZ_NEWS_URL = 'https://api.benzinga.com/api/v2/news';

export async function GET(request: NextRequest) {
  try {
    if (!BENZINGA_API_KEY) {
      return NextResponse.json(
        { error: 'Benzinga API key not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching market narrative stories from Benzinga API...');
    
    // Use the working pattern: fetch more items to ensure enough after filtering
    const items = 100; // Request 100 items to get more options after filtering
    
    // Try multiple market-related tickers to get broader market news
    const marketTickers = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI']; // Major market ETFs
    const allStories = [];
    
        for (const ticker of marketTickers) {
      const url = `${BZ_NEWS_URL}?token=${BENZINGA_API_KEY}&tickers=${encodeURIComponent(ticker)}&items=${items}&fields=headline,title,created,body,teaser,id,url,channels&accept=application/json&displayOutput=full`;
      
      console.log(`Calling Benzinga API for ${ticker} with URL:`, url);
      
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
        });

        const text = await res.text();
        if (!res.ok) {
          console.error(`Benzinga API error for ${ticker}:`, text);
          continue; // Skip this ticker and try the next one
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`Benzinga API did not return valid JSON for ${ticker}. Response:`, text);
          continue; // Skip this ticker and try the next one
        }

        if (!Array.isArray(data)) {
          console.error(`Benzinga API response (not array) for ${ticker}:`, data);
          continue; // Skip this ticker and try the next one
        }

        console.log(`Got ${data.length} articles for ${ticker} from Benzinga API`);

        // Filter for market-relevant content (similar to working implementation)
        const prChannelNames = ['press releases', 'press-releases', 'pressrelease', 'pr'];
        const normalize = (str: string) => str.toLowerCase().replace(/[-_]/g, ' ');
        
        // Market-related keywords to look for - more specific to broad market analysis
        const marketKeywords = [
          'market', 'stocks', 'trading', 'invest', 'economy', 'fed', 'federal reserve',
          'earnings', 'analysis', 'outlook', 'forecast', 'trend', 'rally', 'gains',
          'sector', 'equities', 'momentum', 'volatility', 'bull', 'bear',
          'wall street', 'economic', 'financial', 'investment', 'trading session',
          'financial', 'money', 'wealth', 'finance', 'banking', 'business',
          'company', 'corporate', 'profit', 'revenue', 'growth', 'performance',
          'inflation', 'interest rates', 'monetary policy', 'economic data',
          'gdp', 'employment', 'consumer spending', 'retail sales',
          'manufacturing', 'industrial production', 'housing market',
          'bond yields', 'dollar index', 'commodities', 'oil prices',
          'central bank', 'monetary policy', 'economic growth',
          // Broader terms to catch more relevant content
          'price', 'prices', 'cost', 'costs', 'spending', 'sales', 'revenue',
          'profit', 'profits', 'loss', 'losses', 'income', 'wages', 'salary',
          'employment', 'jobs', 'unemployment', 'consumer', 'consumers',
          'business', 'businesses', 'industry', 'industries', 'sector', 'sectors',
          'trade', 'trades', 'commerce', 'commercial', 'retail', 'wholesale',
          'production', 'manufacturing', 'industrial', 'service', 'services'
        ];

        // Keywords to EXCLUDE (avoid celebrity/personal finance fluff)
        const excludeKeywords = [
          // Only exclude specific celebrity names, not general terms
          'kardashian', 'taylor swift', 'beyonce', 'shaq', 'kobe bryant',
          'reddit', 'tiktok', 'instagram', 'youtube', 'social media',
          'pizza delivery', 'law school', 'student loans',
          'healthcare', 'insurance', 'medical', 'hospital',
          'nft', 'blockchain'
        ];

        const marketStories = data
          .filter((item: any) => {
            // Exclude press releases (like working implementation)
            if (Array.isArray(item.channels) &&
              item.channels.some(
                (ch: any) =>
                  typeof ch.name === 'string' &&
                  prChannelNames.includes(normalize(ch.name))
              )) {
              return false;
            }
            
            // Exclude insights URLs (like working implementation)
            if (item.url && item.url.includes('/insights/')) {
              return false;
            }

            // Look for market-related content in headline or body
            const headline = (item.headline || item.title || '').toLowerCase();
            const body = (item.body || item.teaser || '').toLowerCase();
            
            // Debug: Log what we're checking
            console.log(`Checking article: "${headline.substring(0, 50)}..."`);
            
            // First check if it contains any exclude keywords (reject if found)
            const hasExcludeKeywords = excludeKeywords.some(keyword => 
              headline.includes(keyword) || body.includes(keyword)
            );
            
            if (hasExcludeKeywords) {
              console.log(`  -> EXCLUDED due to exclude keyword`);
              return false;
            }
            
            // Then check if it contains market keywords (accept if found)
            const hasMarketKeywords = marketKeywords.some(keyword => 
              headline.includes(keyword) || body.includes(keyword)
            );
            
            if (hasMarketKeywords) {
              console.log(`  -> INCLUDED due to market keyword`);
            } else {
              console.log(`  -> EXCLUDED due to no market keywords`);
            }
            
            return hasMarketKeywords;
          })
          .map((item: any) => ({
            id: item.id,
            title: item.headline || item.title || '[No Headline]',
            summary: item.body || item.teaser || '[No body text]',
            published: item.created,
            url: item.url || '',
            author: item.author || 'Market Analyst'
          }));

        // Add to our collection
        allStories.push(...marketStories);
        
      } catch (error) {
        console.error(`Error fetching stories for ${ticker}:`, error);
        continue; // Skip this ticker and try the next one
      }
    }

    // Remove duplicates based on article ID
    const uniqueStories = allStories.filter((story, index, self) => 
      index === self.findIndex(s => s.id === story.id)
    );

    // Sort by date (newest first)
    uniqueStories.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

    console.log(`Found ${uniqueStories.length} total market-relevant stories`);

    // Return the first 10 stories
    const selectedStories = uniqueStories.slice(0, 10);

    console.log(`Returning ${selectedStories.length} market narrative stories`);
    
    return NextResponse.json({ 
      stories: selectedStories,
      message: `Market narrative stories from Benzinga API (${selectedStories.length} found)`
    });

  } catch (error) {
    console.error('Error fetching narrative stories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch narrative stories' },
      { status: 500 }
    );
  }
}
