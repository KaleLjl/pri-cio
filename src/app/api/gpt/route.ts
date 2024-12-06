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
        { role: "system", content: "Identify the object in the picture and give out the price" },
        { 
          role: "user", 
          content: [
            { type: "text", text: "Please tell me what it is shortly and give me an estimate price of it." },
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
