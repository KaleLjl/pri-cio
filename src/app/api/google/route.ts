import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';

dotenv.config(); // Load environment variables

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API Key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export async function POST(request: Request) {
  try {
    // Step 1: Handle image upload
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

    // Step 2: Validate file
    const imageFile = files?.image?.[0];
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    // Step 3: Analyze image using OpenAI Vision API
    const base64Image = await encodeImageToBase64(imageFile.filepath);
    const detailedDescription = await analyzeImageWithOpenAI(base64Image);

    if (detailedDescription === 'Human Face') {
      // Step 4: Analyze the image further using Google Vision API
      const [funnyDescription, humorousPrice] = await analyzePricesWithOpenAI_face();
      return NextResponse.json({
        funnyDescription,
        humorousPrice,
      });
    }
    else {
      // Step 4: Fetch web search results using Google Custom Search API
      const searchResults = await fetchSearchResults(detailedDescription);

      // Step 5: Send search contexts to OpenAI for analysis
      const contexts = searchResults.map((result: any) => result.snippet).join('\n\n');
      const analyzedPrice = await analyzePricesWithOpenAI_notface(detailedDescription, contexts);
      console.error('Search Results:', contexts);

      return NextResponse.json({
        detailedDescription,
        mostRelevantPrice: analyzedPrice,
      });
    }
  } catch (error) {
    console.error('Error processing the image:', error);
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
            text: 'Analyze the picture first in detail, and try to guess the name of the thing is in a few words without description. ' +
            'For example, if the thing is a car, try to analyze what brand, model, year it is. ' +
            'For items, try to guess the series, brand, size, and year.' +
            'If recognize as human faces return "Human Face"'
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

const fetchSearchResults = async (query: string) => {
  const dynamicQuery = `${query} price cost`;
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(dynamicQuery)}&key=${CUSTOM_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}`;

  console.log(`Fetching search results for: ${dynamicQuery}`);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.items) {
    console.error('Google Custom Search API Error:', data);
    throw new Error('Failed to fetch search results.');
  }

  const pricePattern = /(?:[£$€¥]\s?\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?|\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?\s?[£$€¥])/g;

  const resultsWithPrices = data.items
    .map((item) => {
      const text = `${item.title} ${item.snippet}`;
      const prices = text.match(pricePattern);
      return prices
        ? {
            title: item.title,
            snippet: item.snippet,
            prices,
          }
        : null;
    })
    .filter((item) => item !== null);

  if (resultsWithPrices.length === 0) {
    console.log('No prices found in search results.');
    return [];
  }

  console.log(`Extracted Prices from Search Results:`, resultsWithPrices);
  return resultsWithPrices;
};


const analyzePricesWithOpenAI_notface = async (query: string, contexts: string): Promise<string> => {
  const prompt = `
You are an assistant tasked with extracting the most accurate and reliable price of an object.
The object description is: "${query}".

Below are contexts extracted from search results that mention prices. 
Please analyze them carefully and provide the most relevant price based on reliability and context.

Contexts:
${contexts}

Your response should contain ONLY the most accurate price, including its currency symbol (e.g., £2,570.00 or $400).
If you cannot find a price, respond with "No relevant prices found".
`;

  const payload = {
    model: 'gpt-4o-2024-08-06',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
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
    throw new Error(`Failed to process prices with OpenAI: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const analyzedPrice = result.choices[0]?.message?.content || 'No relevant prices found';
  console.log(`🎯 OpenAI Processed Price: ${analyzedPrice}`);
  return analyzedPrice.trim();
};

const analyzePricesWithOpenAI_face = async (): Promise<[string, string]> => {
  const prompt = `
You are a creative and humorous assistant. A photo of a human face has been detected.
Generate:
1. A funny and witty description of the person in the photo.
2. A humorous price estimate that reflects the person's "value" in a fun and imaginative way (e.g., "$1,000,000 for the million-dollar smile").
3. Use normal speaking tone and a touch of humor, but don't use difficult words. 
4. Keep descriptions concise under 100 characters, avoiding anything inappropriate or overly critical.

Output the response in the following format:
Funny Description: <Your description here>
Humorous Price: <Numerical price here>
`;

  const payload = {
    model: 'gpt-4o-2024-08-06',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
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
    throw new Error(`Failed to generate funny description and price: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content || 'Funny Description: Unknown\nHumorous Price: $0';

  const funnyDescription = content.match(/Funny Description:\s*(.*)/)?.[1] || 'No description found';
  const humorousPriceMatch = content.match(/Humorous Price:\s*\$?(\d[\d,]*)/);
  const humorousPrice = humorousPriceMatch ? `$${humorousPriceMatch[1]}` : '$0';

  return [funnyDescription, humorousPrice];
};

// Function to analyze the image with Google Vision API
const analyzeWithGoogleVision = async (filepath: string): Promise<string[]> => {
  try {
    const credentials = JSON.parse(
      await fs.readFile(SERVICE_ACCOUNT_KEY_PATH as string, 'utf-8')
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate';

    const base64Image = await encodeImageToBase64(filepath);

    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: 'FACE_DETECTION', maxResults: 15 },
            { type: 'WEB_DETECTION', maxResults: 15 },
            { type: 'LABEL_DETECTION', maxResults: 15 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          ],
        },
      ],
    };

    const response = await client.request({
      url: visionApiUrl,
      method: 'POST',
      data: requestBody,
    });

    const result = response.data.responses[0];

    if (!result) {
      console.error('No response from Google Vision API');
      return ['Unable to analyze'];
    }

    // Collect possible names from various features
    const webEntities = result.webDetection?.webEntities || [];
    const labelAnnotations = result.labelAnnotations || [];
    const objectAnnotations = result.localizedObjectAnnotations || [];

    const possibleNames: string[] = [];

    // Extract names/descriptions from web entities
    webEntities.forEach((entity: any) => {
      if (entity.description && /^[A-Za-z\s]+$/.test(entity.description)) {
        possibleNames.push(entity.description);
      }
    });

    // Extract names/descriptions from label annotations
    labelAnnotations.forEach((label: any) => {
      if (label.description && /^[A-Za-z\s]+$/.test(label.description)) {
        possibleNames.push(label.description);
      }
    });

    // Extract names/descriptions from object annotations
    objectAnnotations.forEach((object: any) => {
      if (object.name && /^[A-Za-z\s]+$/.test(object.name)) {
        possibleNames.push(object.name);
      }
    });

    // Remove duplicates and filter out irrelevant terms
    const uniqueNames = [...new Set(possibleNames)].filter((name) => 
      name.split(' ').length >= 2 // Likely a full name
    );

    console.log('Possible names detected:', uniqueNames);

    return uniqueNames.length > 0 ? uniqueNames : ['Unable to analyze'];
  } catch (error) {
    console.error('Error analyzing with Google Vision API:', error);
    return ['Unable to analyze'];
  }
};