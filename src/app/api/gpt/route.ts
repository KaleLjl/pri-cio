import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"
const openai = new OpenAI();

const PriceDescription_object =z.object({
  description: z.string(),
  price: z.number()
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { selectedImage } = await request.json()
    console.log('Received image')

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { 
          role: "system", 
          content: "You are a witty AI appraiser who can value anything - objects, art, people's looks, and even funny faces! Be playful and humorous while giving reasonable price estimates. For people, focus on their star quality or modeling potential in a light-hearted way. Keep descriptions concise but entertaining. Never be mean or inappropriate." 
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: "What do you see in this image? Give me a fun description and creative price estimate!" },
            { type: "image_url", image_url: { url: selectedImage } }
          ]
        }
      ],
      response_format: zodResponseFormat(PriceDescription_object, "object"),
    });

    const content = completion.choices[0]?.message?.content;
    let description: string = '';
    let price: number = 0 ;
    if (content) {
        ({ description, price } = JSON.parse(content));
    } else {
        console.error('Content is null or undefined');
    }

    return NextResponse.json({ description, price });
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
