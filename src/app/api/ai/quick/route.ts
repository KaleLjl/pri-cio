// 移动 gpt/route.ts 的内容到这里
// 主要处理快速分析 
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"
import { 
  InitialAnalysis, 
  PriceDescription,
  SearchItem,
  SearchResult 
} from "@/lib/types/gpt";
import {
  getInitialAnalysisPrompt,
  getNonTradablePrompt,
  getBasePricePrompt,
  getMarketPricePrompt
} from '@/lib/prompts';

export const maxDuration = 20; // This function can run for a maximum of 20 seconds
const openai = new OpenAI();
const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting image analysis process...');
    
    const session = await auth()
    if (!session) {
      console.log('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ Authentication successful');

    const { selectedImage, currency } = await request.json()
    console.log('📸 Received image and currency:', { currency });

    // Step 1: Initial image analysis
    console.log('🔍 Starting initial image analysis...');
    const initialAnalysis = await openai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: getInitialAnalysisPrompt()
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: "What do you see in this image?" },
            { type: "image_url", image_url: { url: selectedImage } }
          ]
        }
      ],
      response_format: zodResponseFormat(InitialAnalysis, "object"),
    });

    const content = initialAnalysis.choices[0].message.content;
    if (!content) throw new Error('No content received from OpenAI');
    
    const { objectDescription, tradable } = JSON.parse(content);
    console.log('📝 Initial analysis complete:', { tradable, objectDescription });

    // Step 2: Handle based on content type
    if (!tradable) {
      console.log('🎨 Processing non-tradable item...');
      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: getNonTradablePrompt(currency)
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Give me a funny description and price estimate!" },
              { type: "image_url", image_url: { url: selectedImage } }
            ]
          }
        ],
        response_format: zodResponseFormat(PriceDescription, "object"),
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received from OpenAI');
      
      console.log('✨ Face analysis complete');
      return NextResponse.json(JSON.parse(content));
    }

    if (tradable) {
      console.log('🔎 Starting market research for:', objectDescription);
      const searchResults = await fetchSearchResults(objectDescription, currency);
      console.log('📊 Market research summary:', {
        resultsFound: searchResults.length,
        hasValidPrices: searchResults.length > 0,
        firstResult: searchResults[0]?.snippet.substring(0, 100) + '...'
      });

      // Add this check for empty search results
      if (searchResults.length === 0) {
        console.log('⚠️ No market data found, falling back to base analysis...');
        const completion = await openai.beta.chat.completions.parse({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: getBasePricePrompt(objectDescription, currency)
            },
            { 
              role: "user", 
              content: [
                { type: "text", text: "Based on the image, what's a fair second-hand market price?" },
                { type: "image_url", image_url: { url: selectedImage } }
              ]
            }
          ],
          response_format: zodResponseFormat(PriceDescription, "object"),
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content received from OpenAI');
        
        console.log('✅ Base price estimation complete');
        return NextResponse.json({
          ...JSON.parse(content),
          note: "Estimated price without market data"
        });
      }

      const contexts = searchResults.map((result: SearchResult) => result.snippet).join('\n\n');
      console.log('💡 Generating price analysis with', searchResults.length, 'market references');

      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: getMarketPricePrompt(objectDescription, currency, contexts)
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Based on the market research and image, what's a fair second-hand market price?" },
              { type: "image_url", image_url: { url: selectedImage } }
            ]
          }
        ],
        response_format: zodResponseFormat(PriceDescription, "object"),
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received from OpenAI');
      
      console.log('✅ Object analysis complete');
      return NextResponse.json(JSON.parse(content));
    }

  } catch (error) {
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    console.error('❌ Error processing image:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}

// Google search helper function
async function fetchSearchResults(query: string, currency: string): Promise<SearchResult[]> {
  console.log('🔍 Starting Google search for:', query);
  const dynamicQuery = `${query} price cost ${currency}`;
  console.log('🔎 Full search query:', dynamicQuery);
  
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(dynamicQuery)}&key=${CUSTOM_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.items) {
    console.error('❌ Google Custom Search API Error:', data);
    return [];
  }

  console.log(`📊 Found ${data.items.length} search results`);
  const pricePattern = /(?:[£$€¥]\s?\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?|\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?\s?[£$€¥])/g;

  const results = data.items
    .map((item: SearchItem) => {
      const text = `${item.title} ${item.snippet}`;
      const prices = text.match(pricePattern);
      if (prices) {
        console.log('💰 Found prices in result:', { title: item.title, prices });
      }
      return prices ? { snippet: item.snippet, prices } : null;
    })
    .filter((item: SearchResult | null): item is SearchResult => item !== null);

  console.log('✅ Search results processed:', {
    totalResults: data.items.length,
    resultsWithPrices: results.length,
    samplePrices: results.slice(0, 3).map((r: SearchResult) => r.prices).flat()
  });
  
  return results;
}


