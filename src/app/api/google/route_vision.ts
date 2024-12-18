import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Environment variable path for Service Account JSON and Custom Search API
const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export async function POST(request: Request) {
  try {
    // 1. Convert Next.js Request to a Node.js stream
    const contentLength = request.headers.get('content-length');
    const nodeRequest = Object.assign(Readable.from(request.body as any), {
      headers: {
        'content-length': contentLength,
        ...Object.fromEntries(request.headers),
      },
    });

    // 2. Parse the form data using formidable
    const form = formidable({ multiples: false });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(nodeRequest, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // 3. Validate the uploaded file
    const imageFile = files?.image?.[0];
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    // 4. Encode the uploaded image as Base64
    const base64Image = await encodeImageToBase64(imageFile.filepath);

    // 5. Authenticate using Google Service Account
    const credentials = JSON.parse(
      await fs.readFile(SERVICE_ACCOUNT_KEY_PATH as string, 'utf-8')
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();

    // 6. Send the image to Google Vision API
    const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate';
    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'LANDMARK_DETECTION', maxResults: 5 },
          ],
        },
      ],
    };

    const response = await client.request({
      url: visionApiUrl,
      method: 'POST',
      data: requestBody,
    });

    // 7. Process the Vision API response
    const result = response.data;

    if (!result.responses || !result.responses[0]) {
      console.error('Error from Google Vision API:', result);
      return NextResponse.json({ error: 'Failed to analyze image', details: result }, { status: 500 });
    }

    // const webEntities = result.responses[0]?.webDetection?.webEntities || [];
    // const topDescription = webEntities[0]?.description || 'No description found';

    // Process the Vision API response to extract detailed information
    const detailedDescription = processVisionApiResponse(result);

    // 8. Fetch search results using Google Custom Search API
    const searchResults = await fetchGoogleSearchResults(detailedDescription);
    const mostRelevantPrice = findMostRelevantPrice(searchResults, detailedDescription);

    return NextResponse.json({ 
      // detectedObject: topDescription, mostRelevantPrice,
      detailedDescription, mostRelevantPrice,// Replace topDescription with detailedDescription
    });
  } catch (error) {
    console.error('Error processing the image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const processVisionApiResponse = (response: any) => {
  const webDetection = response.responses[0]?.webDetection?.webEntities || [];
  const labelAnnotations = response.responses[0]?.labelAnnotations || [];
  const objectAnnotations = response.responses[0]?.localizedObjectAnnotations || [];

  const allDescriptions: string[] = [];

  // Collect all descriptions from Vision API results
  webDetection.forEach((entity: any) => {
    if (entity.description) allDescriptions.push(entity.description);
  });
  labelAnnotations.forEach((label: any) => {
    if (label.description) allDescriptions.push(label.description);
  });
  objectAnnotations.forEach((object: any) => {
    if (object.name) allDescriptions.push(object.name);
  });

  console.log('All descriptions:', allDescriptions);

  // Return the first description directly, or fallback to a default
  return allDescriptions.length > 0
    ? allDescriptions[0].trim() // Use the first description
    : 'No detailed description found';
};



// Helper function to encode file to Base64
const encodeImageToBase64 = async (filepath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filepath);
  return fileBuffer.toString('base64');
};

// Function to fetch Google Custom Search API results
const fetchGoogleSearchResults = async (query: string) => {
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}+price&key=${CUSTOM_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.items || [];
};

const findMostRelevantPrice = (searchResults: any[], query: string) => {
  const pricePattern = /([£$€]\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g; // Match prices with currencies
  const priceCounts: Record<string, { count: number; currency: string }> = {}; // Track price and currency
  const relevantPrices: { price: number; currency: string; context: string }[] = [];

  console.log('Extracting and filtering prices...');

  // Extract prices and count occurrences
  for (const result of searchResults) {
    const snippet = result.snippet || '';
    const title = result.title || '';
    const combinedText = `${title} ${snippet}`;

    const matches = combinedText.match(pricePattern);

    if (matches) {
      matches.forEach((match) => {
        const currency = match.trim().charAt(0); // Extract currency symbol (£, $, €)
        const cleanPrice = parseFloat(match.replace(/[^0-9.]/g, '')); // Extract numeric price

        if (!isNaN(cleanPrice)) {
          const priceKey = `${currency}${cleanPrice.toFixed(2)}`; // Use currency + price as key
          if (!priceCounts[priceKey]) {
            priceCounts[priceKey] = { count: 0, currency };
          }
          priceCounts[priceKey].count += 1;

          relevantPrices.push({
            price: cleanPrice,
            currency,
            context: combinedText,
          });

          console.log(`Found price: ${match} | Context: "${combinedText}"`);
        }
      });
    }
  }

  // Sort by occurrence count first, then price value
  const sortedPrices = Object.entries(priceCounts).sort(
    (a, b) => b[1].count - a[1].count || parseFloat(a[0].slice(1)) - parseFloat(b[0].slice(1))
  );

  console.log('All extracted prices with counts:', priceCounts);

  // Return the most relevant price with its original currency
  if (sortedPrices.length > 0) {
    const [mostRelevantKey] = sortedPrices[0]; // Key is "£123.45"
    return mostRelevantKey; // Returns with correct currency symbol
  }

  return 'No relevant prices found';
};


