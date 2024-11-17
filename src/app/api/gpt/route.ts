import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { selectedImage } = await request.json()
    console.log('Received image:', selectedImage.substring(0, 100) + '...')
    
    // 调用OpenAI的API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What is in this image?',
              },
              {
                type: 'image_url',
                image_url: {
                  url: selectedImage
                },
              },
            ],
          }
        ],
      })
    })

    if (!response.ok) {
      const errorDetails = await response.json()
      console.error('API Error:', response.status, response.statusText, errorDetails)
      throw new Error('Failed to analyze image with GPT-4 Vision')
    }

    const result = await response.json()
    const description = result.choices[0]?.message?.content

    console.log(`Description: ${description}`)

    return NextResponse.json({ message: 'Image processed successfully', description })
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
