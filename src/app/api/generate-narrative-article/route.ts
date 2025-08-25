import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { originalArticle, selectedStory } = await request.json();
    
    if (!originalArticle) {
      return NextResponse.json({ error: 'Original article is required' }, { status: 400 });
    }
    
    if (!selectedStory) {
      return NextResponse.json({ error: 'Selected story is required' }, { status: 400 });
    }

    const prompt = `You are a financial journalist. You have an existing article about specific stocks with momentum and a selected market narrative story. Your task is to weave the market narrative throughout the article to provide context while keeping the focus on the individual stocks.

EXISTING ARTICLE:
${JSON.stringify(originalArticle, null, 2)}

SELECTED NARRATIVE STORY:
Title: ${selectedStory.title}
Summary: ${selectedStory.summary}
URL: ${selectedStory.url}
Published: ${selectedStory.published}

CRITICAL TASK: Weave the market narrative throughout the article to provide context while maintaining focus on the individual stocks as the main story.

INSTRUCTIONS:
1. KEEP THE STOCKS AS THE MAIN FOCUS - they are the primary story
2. Use the market narrative to provide context and background
3. Weave the narrative naturally into the introduction and throughout the article
4. Add hyperlinks using this EXACT format: <a href="${selectedStory.url}">three word phrase</a>
5. Connect market events to why these stocks are moving
6. Make the integration feel natural and enhance the flow
7. Do NOT reference "recent articles" or similar phrases
8. Ensure all prices are formatted to exactly 2 decimal places
9. DO NOT use phrases like "according to Benzinga" or "according to recent reports"
10. HYPERLINK FORMAT: Use ONLY the three-word phrase as the clickable text, NOT the URL

INTEGRATION STRATEGY:
- Lead with market context that sets up why these stocks are important
- Weave narrative elements throughout to provide background
- Connect market events to individual stock movements where relevant
- Keep stock analysis as the primary focus
- Use narrative to explain market conditions affecting these stocks

CRITICAL RULES:
- STOCKS REMAIN THE MAIN STORY - don't let narrative overshadow them
- Weave narrative throughout, not just in one place
- Maximum 1-2 sentences of narrative context per paragraph
- No standalone hyperlink lines
- Maintain existing stock analysis structure
- Format all prices to exactly 2 decimal places
- Integrate hyperlinks naturally into paragraphs

HYPERLINK EXAMPLES:
- CORRECT: "influenced by <a href="${selectedStory.url}">Fed's policy decisions</a> and the broader market"
- CORRECT: "as <a href="${selectedStory.url}">Tom Lee cautioned</a> about market optimism"
- WRONG: "influenced by <a href="${selectedStory.url}">https://www.benzinga.com/...</a>"
- WRONG: "influenced by <a href="${selectedStory.url}">[Fed's policy decisions]</a>"

IMPORTANT: Return ONLY the enhanced article text, not JSON. The article should focus on the stocks while using the market narrative for context and background.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional financial news writer who creates engaging, accurate content with proper hyperlinks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const enhancedArticle = completion.choices[0]?.message?.content?.trim();
    
    if (!enhancedArticle) {
      throw new Error('Failed to generate enhanced article');
    }

    console.log('Enhanced article generated:', enhancedArticle.substring(0, 200) + '...');

    // Create a new article structure with the enhanced content
    const enhancedArticleData = {
      ...originalArticle,
      introduction: enhancedArticle,
      // Add narrative source info
      narrativeSource: {
        title: selectedStory.title,
        url: selectedStory.url,
        published: selectedStory.published
      }
    };

    return NextResponse.json({ 
      article: enhancedArticleData,
      narrativeSource: {
        title: selectedStory.title,
        url: selectedStory.url
      }
    });

  } catch (error: any) {
    console.error('Error generating narrative article:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate narrative article' },
      { status: 500 }
    );
  }
}
