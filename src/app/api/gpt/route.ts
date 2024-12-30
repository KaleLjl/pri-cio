import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"

export const maxDuration = 20; // This function can run for a maximum of 20 seconds
const openai = new OpenAI();
const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// Initial analysis schema
const InitialAnalysis = z.object({
  objectDescription: z.string(),
  tradable: z.boolean()
})

// Final price analysis schema
const PriceDescription = z.object({
  description: z.string(),
  price: z.number()
})

// 添加搜索结果的类型定义
interface SearchItem {
  title: string;
  snippet: string;
}

interface SearchResult {
  snippet: string;
  prices: string[];
}

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
          content: `Analyze the picture in detail and provide a concise identification:
          
          1. If it's a product:
             - Always include the brand name if recognizable
             - Include model/series name if applicable
             - Include year if identifiable
             Format example: "Nike Air Jordan 1 2024" or "Apple iPhone 15 Pro"
          
          2. If it's a generic item without clear branding:
             - Provide the most specific description possible
             Format example: "Leather Office Chair" or "Stainless Steel Watch"
          
          3. Determine if the item is tradable by these rules:
             Return tradable=false for:
             - Human faces, body parts, or personal photos
             - Prepared food or perishable items
             - Natural scenery (mountains, sunset, etc.)
             - Buildings or architectural structures
             - Screenshots or digital content
             - Abstract concepts or artwork
             - Living creatures (pets, plants, etc.)
             
             Return tradable=true for:
             - Consumer products with clear branding
             - Electronics and gadgets
             - Clothing and accessories
             - Furniture and home goods
             - Vehicles and parts
             - Collectibles and merchandise
             - Tools and equipment
          
          Keep the response brief and focused on identification only.`
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
            content: `You are a creative and humorous assistant. A non-tradable item (like a human face, food, building, tree, etc.) has been detected.
            Generate a funny and witty description and a humorous symbolic "value" in ${currency}.
            Use normal speaking tone and a touch of humor, but don't use difficult words.
            Keep descriptions concise under 100 characters, avoiding anything inappropriate or overly critical.`
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
              content: `You are an assistant tasked with estimating the second-hand market price for: "${objectDescription}".
              
              Consider the following factors for your estimation:
              - Brand value and market positioning
              - Apparent condition from the image
              - Age and wear level visible in the image
              - Current retail price trends for similar items
              - Standard depreciation for this type of item
              
              Provide a conservative second-hand market price estimate in ${currency}.
              Your response should be concise (under 100 characters) and include:
              - Brief description maintaining the brand/model information
              - Estimated second-hand price
              
              Example format:
              description: "Used Nike Air Jordan 1 (Good condition)"
              price: 180`
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
            content: `You are an assistant tasked with determining the most accurate second-hand market price for: "${objectDescription}".
            
            Based on the provided market research and the item's image:
            1. Compare the item's condition in the image with market listings
            2. Consider the brand value and market positioning
            3. Account for visible wear and age
            4. Analyze the price trends in the following market data
            
            Provide a conservative second-hand market price in ${currency} based on the most reliable data.
            Your response should be concise (under 100 characters) and include:
            - Brief description maintaining the brand/model information
            - Current second-hand market price
            
            Market Research Data:
            ${contexts}`
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


