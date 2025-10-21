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

CRITICAL TASK: Completely rewrite the article to seamlessly integrate the market narrative into the existing stock analysis, creating one flowing story.

INSTRUCTIONS:
1. REWRITE THE ENTIRE ARTICLE - do not just add narrative to existing content
2. Start with the market narrative context, then immediately flow into stock analysis
3. Weave the narrative thread throughout each stock's analysis
4. Add hyperlinks using this EXACT format: <a href="${selectedStory.url}">three word phrase</a>
5. Connect market events directly to why each stock is moving
6. Make the narrative feel like the natural backdrop for the stock movements
7. Do NOT reference "recent articles" or similar phrases
8. Ensure all prices are formatted to exactly 2 decimal places
9. DO NOT use phrases like "according to Benzinga" or "according to recent reports"
10. HYPERLINK FORMAT: Use ONLY the three-word phrase as the clickable text, NOT the URL

INTEGRATION STRATEGY:
- Start with market narrative as the backdrop
- Flow directly into first stock analysis, connecting it to the narrative
- Continue weaving narrative elements into each stock's story
- Make each stock's movement feel connected to the broader market story
- End with how these stocks fit into the overall narrative

CRITICAL RULES:
- REWRITE EVERYTHING - create one cohesive story
- The narrative should feel like the natural explanation for stock movements
- Maximum 2 sentences per paragraph
- No separate sections or blocks
- Format all prices to exactly 2 decimal places
- Integrate hyperlinks naturally into the flow

HYPERLINK EXAMPLES:
- CORRECT: "influenced by <a href="${selectedStory.url}">Fed's policy decisions</a> and the broader market"
- CORRECT: "as <a href="${selectedStory.url}">Tom Lee cautioned</a> about market optimism"
- CORRECT: "amid <a href="${selectedStory.url}">market volatility concerns</a> and economic uncertainty"
- WRONG: "influenced by <a href="${selectedStory.url}">https://www.benzinga.com/...</a>"
- WRONG: "influenced by <a href="${selectedStory.url}">[Fed's policy decisions]</a>"
- WRONG: "influenced by <a href="${selectedStory.url}">recent market analysis</a>"

CRITICAL: Use exactly 3 words for each hyperlink text. Never show the URL in the text.

IMPORTANT: Return ONLY the enhanced article text, not JSON. The article should focus on the stocks while using the market narrative for context and background.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional financial news writer who creates engaging, integrated stories. REWRITE the entire article to seamlessly weave the market narrative into the stock analysis. Do NOT create separate sections or blocks. Create one flowing narrative where the market story naturally explains the stock movements."
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

    // Clean up any raw URLs and convert them to proper hyperlinks
    const cleanedArticle = enhancedArticle.replace(
      /https:\/\/www\.benzinga\.com\/[^\s<>"]+/g,
      (url) => `<a href="${url}">market analysis report</a>`
    );

    console.log('Enhanced article generated:', cleanedArticle.substring(0, 200) + '...');

    // Create a new article structure with the enhanced content
    const enhancedArticleData = {
      ...originalArticle,
      introduction: cleanedArticle,
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
