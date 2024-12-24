import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"

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

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { selectedImage, currency } = await request.json()

    // Step 1: Initial image analysis
    const initialAnalysis = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the image and determine if it contains a human face. 
                Provide a detailed description of what you see. 
                - If it is a product, specify the brand, model, and any identifiable details.
                - If it is food, include the cuisine type, country of origin, and whether it is street food or fine dining.
                - If it is a human face, specify the apparent gender, age group, and any notable features or expressions.`  },
        { 
          role: "user", 
          content: [
            { type: "text", text: "What do you see in this image? Is it a human face?" },
            { type: "image_url", image_url: { url: selectedImage } }
          ]
        }
      ],
      response_format: zodResponseFormat(InitialAnalysis, "object"),
    });

    const content = initialAnalysis.choices[0].message.content;
    if (!content) throw new Error('No content received from OpenAI');
    
    const { objectDescription, isHumanFace } = JSON.parse(content);

    // Step 2: Handle based on content type
    if (isHumanFace) {
      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Be funny! Give a playful description and price in ${currency} for this face. Within 100 characteristic `
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
      
      return NextResponse.json(JSON.parse(content));
    }

    if (!isHumanFace) {
      const searchResults = await fetchSearchResults(objectDescription);
      const contexts = searchResults.map((result: any) => result.snippet).join('\n\n');

      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Analyze the object and market research. Provide a concise description and price in ${currency}. Keep response within 100 characters:\n\n${contexts}`
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
      
      return NextResponse.json(JSON.parse(content));
    }

  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}

// Google search helper function
async function fetchSearchResults(query: string) {
  const dynamicQuery = `${query} price cost`;
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(dynamicQuery)}&key=${CUSTOM_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.items) {
    console.error('Google Custom Search API Error:', data);
    return [];
  }

  const pricePattern = /(?:[£$€¥]\s?\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?|\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?\s?[£$€¥])/g;

  return data.items
    .map((item: any) => {
      const text = `${item.title} ${item.snippet}`;
      const prices = text.match(pricePattern);
      return prices ? { snippet: item.snippet, prices } : null;
    })
    .filter(Boolean);
}


