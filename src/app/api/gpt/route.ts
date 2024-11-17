import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
const openai = new OpenAI();

const PriceDescription_object =z.object({
  description: z.string(),
  price: z.number()
})

export async function POST(request: Request) {
  try {
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

    const description = completion.choices[0]?.message?.content
    console.log(`Description: ${description}`)

    return NextResponse.json({ message: 'Image processed successfully', description })
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
