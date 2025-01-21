import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API Key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

// export async function POST(request: Request) {
//   try {
//     // Step 1: Handle image upload
//     const contentLength = request.headers.get('content-length');
//     const nodeRequest = Object.assign(Readable.from(request.body as any), {
//       headers: {
//         'content-length': contentLength,
//         ...Object.fromEntries(request.headers),
//       },
//     });

//     const form = formidable({ multiples: false });
//     const [fields, files] = await new Promise((resolve, reject) => {
//       form.parse(nodeRequest, (err, fields, files) => {
//         if (err) reject(err);
//         else resolve([fields, files]);
//       });
//     });

//     // Step 2: Validate file
//     const imageFile = files?.image?.[0];
//     if (!imageFile) {
//       return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
//     }

//     // Step 3: Analyze image using OpenAI Vision API
//     const base64Image = await encodeImageToBase64(imageFile.filepath);
//     const detailedDescription = await analyzeImageWithOpenAI(base64Image);

//     return NextResponse.json({
//       detailedDescription,
//     });

//   } catch (error) {
//     console.error('Error processing the image:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle Image Upload and Analysis
      const contentLength = request.headers.get('content-length');
      const nodeRequest = Object.assign(Readable.from(request.body as any), {
        headers: {
          'content-length': contentLength,
          ...Object.fromEntries(request.headers),
        },
      });

      const form = formidable({ multiples: false });
      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(nodeRequest, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      const imageFile = files?.image?.[0];
      if (!imageFile) {
        return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
      }

      const base64Image = await encodeImageToBase64(imageFile.filepath);
      const detailedDescription = await analyzeImageWithOpenAI(base64Image);

      return NextResponse.json({ detailedDescription });
    } else if (contentType.includes('application/json')) {
      // Handle Conversation Context
      const body = await request.json();
      const { conversation } = body;

      if (!Array.isArray(conversation)) {
        return NextResponse.json(
          { error: 'Invalid conversation format (expected an array)' },
          { status: 400 }
        );
      }

      const reply = await getNextAssistantMessage(conversation);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (error) {
    console.error('Error processing the request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Function to encode the image file as Base64
const encodeImageToBase64 = async (filepath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filepath);
  return fileBuffer.toString('base64');
};

// Function to analyze image using OpenAI's GPT-4 Vision API
const analyzeImageWithOpenAI = async (base64Image: string): Promise<string> => {
  const payload = {
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: 'You are a helpful assistant that determines a fair selling price for an item.' +
                  '1. The user has uploaded a photo. You analyzed it and think what it is.' +
                  '2. First give feedback on the image the user uploaded, for example what is it...' +
                  '3. And ask the user for critical details—size, condition, damage, or anything else relevant—until you feel you have enough information.' +
                  '4. Once you have enough information, you must generate a recommended selling price.' +
                  '5. Your tone should be straightforward and helpful.'
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        ],
      },
    ],
    max_tokens: 200,
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API Error Response:', errorText);
    throw new Error(`Failed to analyze image with OpenAI: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const description = result.choices[0]?.message?.content || 'No description found';
  console.log('OpenAI Response:', description);
  return description;
};

const getNextAssistantMessage = async (conversation: { role: string; content: string }[]) => {
  // Prepend a system message for context
  const systemPrompt = {
    role: 'system',
    content: `You are a helpful assistant that determines a fair selling price for an item. 
              You will ask the user for critical details like size, condition, brand, or any unique features of the item. 
              Once you have enough details, provide a recommended price.`,
  };

  // Sanitize conversation roles
  const sanitizedConversation = [systemPrompt, ...conversation.map((msg) => ({
    ...msg,
    role: msg.role === 'gpt' ? 'assistant' : msg.role, // Fix invalid roles
  }))];
  
  const payload = {
    model: 'gpt-4',
    messages: sanitizedConversation,
    max_tokens: 300,
    temperature: 0.7,
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API Error Response:', errorText);
    throw new Error(`Failed to get GPT reply: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
};


