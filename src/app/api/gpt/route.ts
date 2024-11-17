import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
const openai = new OpenAI();

const PriceDescription =z.object({
  description: z.string(),
  price: z.number()
})

export async function POST(request: Request) {
  try {
    const { selectedImage } = await request.json()
    console.log('Received image')

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            {
              type: "image_url",
              image_url: {
                url: selectedImage,
              },
            }
          ],
        },
      ],
    })

    const description = completion.choices[0]?.message?.content
    console.log(`Description: ${description}`)

    return NextResponse.json({ message: 'Image processed successfully', description })
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
