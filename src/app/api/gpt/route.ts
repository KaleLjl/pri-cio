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
  isHumanFace: z.boolean()
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the picture first in detail, and try to guess the name of the thing is in a few words without description. 
          For example, if the thing is a car, try to analyze what brand, model, year it is. 
          For items, try to guess the series, brand, size, and year.
          If recognize as human faces return "Human Face"`
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
    
    const { objectDescription, isHumanFace } = JSON.parse(content);
    console.log('📝 Initial analysis complete:', { isHumanFace, objectDescription });

    // Step 2: Handle based on content type
    if (isHumanFace) {
      console.log('👤 Processing human face...');
      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a creative and humorous assistant. A photo of a human face has been detected.
            Generate a funny and witty description of the person and a humorous price estimate that reflects the person's "value" in ${currency}.
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

    if (!isHumanFace) {
      console.log('🔎 Starting market research for object...');
      const searchResults = await fetchSearchResults(objectDescription);
      console.log('📊 Search results retrieved:', searchResults.length);

      // Add this check for empty search results
      if (searchResults.length === 0) {
        console.log('⚠️ No market data found, using base analysis...');
        const completion = await openai.beta.chat.completions.parse({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an assistant tasked with estimating the price of an object without market data.
              Based on the object's apparent quality, brand, condition and general market knowledge,
              provide a reasonable price estimate in ${currency}.
              Note that this is an estimate without current market data.
              Your response should be concise (under 100 characters) and include both a brief description and an estimated price.`
            },
            { 
              role: "user", 
              content: [
                { type: "text", text: "What's a reasonable price estimate for this item?" },
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
      console.log('💡 Generating price analysis...');

      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an assistant tasked with extracting the most accurate and reliable price of an object.
            Analyze the following market research carefully and provide the most relevant price in ${currency} based on reliability and context.
            Your response should be concise (under 100 characters) and include both a brief description and the most accurate price.
            
            Market Research:
            ${contexts}`
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Based on the market research, what's an accurate description and price?" },
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
    console.error('❌ Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}

// Google search helper function
async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  console.log('🔍 Starting Google search for:', query);
  const dynamicQuery = `${query} price cost`;
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(dynamicQuery)}&key=${CUSTOM_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.items) {
    console.error('❌ Google Custom Search API Error:', data);
    return [];
  }

  console.log('✅ Search results processed successfully');
  const pricePattern = /(?:[£$€¥]\s?\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?|\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?\s?[£$€¥])/g;

  return data.items
    .map((item: SearchItem) => {
      const text = `${item.title} ${item.snippet}`;
      const prices = text.match(pricePattern);
      return prices ? { snippet: item.snippet, prices } : null;
    })
    .filter((item: SearchResult | null): item is SearchResult => item !== null);
}


