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

    const { selectedImage, currency } = await request.json()
    console.log('Received image and currency:', currency)

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `
            Identify the object in the picture and give out the price in ${currency}
            - For **human faces**, be humorous and playful. Focus on their charm, star quality, or unique features in a fun and light-hearted way. Use witty phrases and a touch of humor.
            - For **food**, describe it with precision and vivid sensory details. Mention flavors, presentation, or its unique appeal in a straightforward, yet engaging manner.
            - For **objects or other things**, provide a concise and creative description that highlights their functionality, value, or distinctiveness.
            - Always provide a reasonable and imaginative price estimate in ${currency} alongside the description.
            - Keep descriptions concise under 100 characters and entertaining, avoiding anything inappropriate or overly critical.
          `,
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: "What do you see in this image? Give me a fun description and creative price estimate! Just a short one sentence." },
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
