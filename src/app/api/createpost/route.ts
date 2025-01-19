import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { zodResponseFormat } from "openai/helpers/zod";
import { InitialAnalysis, PriceDescription } from "@/lib/types/gpt";
import { getInitialAnalysisPrompt, getBasePricePrompt } from "@/lib/prompts";

const openai = new OpenAI();

export async function POST(req: Request) {
  try {
    console.log("🚀 Starting image analysis process...");

    // Authenticate user
    const session = await auth();
    if (!session) {
      console.log("❌ Authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ Authentication successful");

    // Parse request body
    const { description, images } = await req.json();
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!images || images.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    // Validate image URLs
    const invalidImages = images.filter((url: string) => !isValidUrl(url));
    if (invalidImages.length > 0) {
      return NextResponse.json(
        { error: `One or more images are not valid URLs: ${invalidImages.join(", ")}` },
        { status: 400 }
      );
    }
    console.log("📸 Validated images:", images);

    // Step 1: Initial image analysis
    console.log("🔍 Starting initial image analysis...");
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
            { type: "text", text: `What do you see in these images? Description: ${description}` },
            ...images.map((image: string) => ({ type: "image_url", image_url: { url: image } })),
          ],
        },
      ],
      response_format: zodResponseFormat(InitialAnalysis, "object"),
    });

    const content = initialAnalysis.choices[0].message.content;
    if (!content) throw new Error("No content received from OpenAI");

    const { objectDescription, tradable } = JSON.parse(content);
    console.log("📝 Initial analysis complete:", { tradable, objectDescription });
    // Step 2: Handle tradable/non-tradable items
    const baseAnalysisPrompt = getBasePricePrompt(objectDescription, "USD"); // Assuming USD as the currency for simplicity
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: baseAnalysisPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Estimate a second-hand market price for this item." },
            ...images.map((image: string) => ({ type: "image_url", image_url: { url: image } })),
          ],
        },
      ],
      response_format: zodResponseFormat(PriceDescription, "object"),
    });

    const completionContent = completion.choices[0].message.content;
    if (!completionContent) throw new Error("No content received from OpenAI");

    console.log("✅ Analysis complete");
    return NextResponse.json(JSON.parse(completionContent));
  } catch (error) {
    console.error("❌ Error processing image:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}

// Helper function to validate URLs
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
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









