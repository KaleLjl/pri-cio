import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { InitialAnalysis, PriceDescription } from "@/lib/types/gpt";
import {
  getInitialAnalysisPrompt,
  getNonTradablePrompt
} from "@/lib/prompts";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting image analysis process...');
    
    // Authenticate user
    const session = await auth();
    if (!session) {
      console.log('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Authentication successful');

    // Parse request payload
    const { images } = await request.json();
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required.' }, { status: 400 });
    }
    console.log('📸 Received images:', images);

    // Analyze each image
    const feedbacks = await Promise.all(
      images.map(async (image: string) => {
        try {
          console.log(`🔍 Analyzing image: ${image}`);
          const initialAnalysis = await openai.beta.chat.completions.parse({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: getInitialAnalysisPrompt(),
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "What do you see in this image?" },
                  { type: "image_url", image_url: { url: image } },
                ],
              },
            ],
            response_format: zodResponseFormat(InitialAnalysis, "object"),
          });

          const content = initialAnalysis.choices[0].message.content;
          if (!content) throw new Error('No content received from OpenAI.');

          const { objectDescription, tradable } = JSON.parse(content);
          console.log('📝 Analysis complete:', { tradable, objectDescription });

          if (!tradable) {
            console.log('🎨 Non-tradable item detected.');
            return { image, message: "This item isn't tradable, but it looks interesting!", objectDescription };
          }

          console.log('🛒 Tradable item detected.');
          return { image, message: "This item appears tradable!", objectDescription };
        } catch (err) {
          console.error('❌ Error analyzing image:', image, err);
          return { image, error: "Failed to analyze this image." };
        }
      })
    );

    console.log('✅ All images analyzed. Sending feedback...');
    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}










// import { NextResponse } from 'next/server';

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { description, images, conversationHistory } = body;

//     if (!description && (!conversationHistory || conversationHistory.length === 0)) {
//       return NextResponse.json({ error: 'Initial description is required' }, { status: 400 });
//     }

//     if (!images || images.length === 0) {
//       return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
//     }

//     // Call OpenAI API with description, image data, and conversation history
//     const gptResponse = await callOpenAIAPI(description, images, conversationHistory);

//     return NextResponse.json({ message: gptResponse });
//   } catch (error) {
//     console.error('Error processing request:', error);
//     return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
//   }
// }

// async function callOpenAIAPI(
//   description: string | null,
//   images: string[],
//   conversationHistory: { role: string; content: string }[] = []
// ): Promise<string> {
//   const apiKey = process.env.OPENAI_API_KEY;

//   if (!apiKey) {
//     throw new Error('Missing OpenAI API key in environment variables');
//   }

//   const messages = [
//     {
//       role: 'system',
//       content:
//         'You are an assistant specialized in item appraisal. Analyze both the description and the images provided by the user. If there are visible details in the images, mention them and ask the user for confirmation or corrections. Gather all necessary details about the item, such as condition, size, age, brand, and any damage. Once you have enough information, provide an estimated price for the item.',
//     },
//     ...conversationHistory, // Add the ongoing conversation history
//   ];

//   if (description) {
//     messages.push({
//       role: 'user',
//       content: `Description: ${description}. Images are attached below in base64 format.`,
//     });
//   }

//   messages.push({
//     role: 'user',
//     content: `Images: The following base64 images are provided for analysis. [Number of images: ${images.length}]`,
//   });

//   const response = await fetch('https://api.openai.com/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify({
//       model: 'gpt-4o',
//       messages,
//     }),
//   });

//   if (!response.ok) {
//     const errorDetails = await response.text();
//     console.error('OpenAI API error:', errorDetails);
//     throw new Error('Failed to fetch response from OpenAI API');
//   }

//   const data = await response.json();
//   const choice = data.choices?.[0]?.message;

//   if (!choice || !choice.content) {
//     throw new Error('Invalid API response structure');
//   }

//   return choice.content.trim();
// }









