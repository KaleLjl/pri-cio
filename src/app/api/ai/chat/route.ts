import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { IncomingMessage } from "http";
import { auth } from '@/lib/auth';

dotenv.config(); // Load environment variables

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API Key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const contentLength = request.headers.get("content-length");
      const arrayBuffer = await request.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer); 

      // ✅ Convert Buffer into a Readable Stream
      const nodeRequest = new Readable();
      nodeRequest.push(buffer);
      nodeRequest.push(null);

      // ✅ Convert Readable to mimic an IncomingMessage
      const fakeIncomingMessage = Object.assign(nodeRequest, {
        headers: Object.fromEntries(request.headers),
      }) as IncomingMessage;

      const form = formidable({ multiples: false });

      const parsedForm = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
        (resolve, reject) => {
          form.parse(fakeIncomingMessage, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
          });
        }
      );

      const imageFile = parsedForm.files?.image?.[0];
      if (!imageFile) {
        return NextResponse.json({ error: "No image file uploaded" }, { status: 400 });
      }

      const base64Image = await encodeImageToBase64(imageFile.filepath);
      const detailedDescription = await analyzeImageWithOpenAI(base64Image, 'USD');

      return NextResponse.json({ detailedDescription });
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      const { conversation, imageUrl, currency, isInitialAnalysis } = body;

      // 添加日志来追踪调用
      console.log('API called with:', { isInitialAnalysis, imageUrl: imageUrl.substring(0, 50) + '...' });

      if (isInitialAnalysis) {
        if (!imageUrl) {
          return NextResponse.json(
            { error: "Image URL is required for analysis" },
            { status: 400 }
          );
        }
        const detailedDescription = await analyzeImageWithOpenAI(imageUrl, currency);
        return NextResponse.json({ detailedDescription });
      }

      if (!Array.isArray(conversation)) {
        return NextResponse.json(
          { error: "Invalid conversation format (expected an array)" },
          { status: 400 }
        );
      }

      const reply = await getNextAssistantMessage(conversation, currency);
      return NextResponse.json(reply);
    }

    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 400 });
  } catch (error) {
    console.error("Error processing the request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Function to encode the image file as Base64
const encodeImageToBase64 = async (filepath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filepath);
  return fileBuffer.toString('base64');
};

// Function to analyze image using OpenAI's GPT-4 Vision API
const analyzeImageWithOpenAI = async (imageInput: string, currency: string = 'USD'): Promise<string> => {
  let imageUrl = imageInput;
  
  // If the input is a base64 string, convert it to a data URL
  if (!imageInput.startsWith('http') && !imageInput.startsWith('data:')) {
    imageUrl = `data:image/jpeg;base64,${imageInput}`;
  }

  const payload = {
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'You are a helpful assistant that determines a fair selling price for an item. ' +
              '1. The user has uploaded a photo—analyze it and identify what the item is. ' +
              '2. Provide clear, specific feedback on the image (for example, what the item is and its model, if applicable). ' +
              '3. Ask for any critical missing details (such as size, condition, damage, or other relevant features) until you have sufficient information. ' +
              '4. Make sure to ask where is it located.'+
              '5. Once enough information is available, generate a single recommended selling price in ' + currency + ' (do not provide a price range) based on current market conditions. ' +
              '6. Your tone should be straightforward and helpful.',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
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

// Function to get the next assistant message
const getNextAssistantMessage = async (conversation: { role: string; content: string }[], currency: string = 'USD') => {
  const systemPrompt = {
    role: 'system',
    content: `You are an AI assistant that helps users list their items for sale and determine a fair selling price in ${currency}. 
You must always respond with a valid JSON object, structured as follows:

\`\`\`json
{
  "reply": "Your conversational response to the user.",
  "postData": {
    "description": "A formatted post description for the listing (if enough details are available, otherwise null).",
    "price": "A numeric value without currency symbol (if enough details are available, otherwise null). The price should be in ${currency}."
  }
}
\`\`\`

### Instructions:
1. **NEVER respond with plain text** – your response **must always be valid JSON**.
2. If you need **more details**, set \`"postData": { "description": null, "price": null }\` and ask the user for the missing details in \`"reply"\`.
3. If you have **enough details**, generate a **market-ready post description** and a **single price**.
4. The **price must be a numeric value only** (e.g., \`"2500000"\`) without any currency symbols or formatting. The price should be in ${currency}.
5. **Do not include explanations or extra text – return only the JSON object.**`,
  };

  const sanitizedConversation = [
    systemPrompt,
    ...conversation.map((msg) => ({
      ...msg,
      role: msg.role === 'gpt' ? 'assistant' : msg.role,
    })),
  ];

  const payload = {
    model: 'gpt-4',
    messages: sanitizedConversation,
    max_tokens: 300,
    temperature: 0.5,
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
  const content = result.choices[0]?.message?.content || '';

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('Error parsing GPT JSON:', error, 'Response content:', content);
    parsed = { reply: content, postData: { description: null, price: null } };
  }
  return parsed;
};

