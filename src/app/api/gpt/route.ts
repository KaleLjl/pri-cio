import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { selectedImage } = await request.json()
    console.log('Received image:', selectedImage.substring(0, 100) + '...')
    
    return NextResponse.json({ message: 'Image received successfully' })
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
