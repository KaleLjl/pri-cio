import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"
import { getPrompts } from "@/lib/prompts"
import type { Locale } from "@/lib/i18n/config";

export const maxDuration = 20; // This function can run for a maximum of 20 seconds
const openai = new OpenAI();

// Simplified analysis schema
const Analysis = z.object({
  description: z.string(),
  price: z.number()
})

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

    // Get locale from cookie
    const cookies = request.headers.get('cookie');
    const localeCookie = cookies?.split(';').find(c => c.trim().startsWith('NEXT_LOCALE='));
    const locale = (localeCookie?.split('=')[1]?.trim() || 'en') as Locale;
    
    const userPrompts = getPrompts(locale);
    console.log('🗣️ Using language:', locale);

    // Single step analysis
    const analysis = await openai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the image and provide:
          1. A brief description of what you see (include brand and model if visible)
          2. An estimated market value in ${currency}
          
          Keep the description under 100 characters.
          If the item is not a product (e.g., scenery, faces, food), provide a humorous symbolic value.`
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: userPrompts.initialQuery },
            { type: "image_url", image_url: { url: selectedImage } }
          ]
        }
      ],
      response_format: zodResponseFormat(Analysis, "object"),
    });

    const content = analysis.choices[0].message.content;
    if (!content) throw new Error('No content received from OpenAI');
    
    console.log('✅ Analysis complete');
    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error('❌ Error processing image:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}


