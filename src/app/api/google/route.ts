import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API Key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

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

    // Step 4: Fetch web search results using Google Custom Search API
    const searchResults = await fetchSearchResults(detailedDescription);

    // Step 5: Send search contexts to OpenAI for analysis
    const contexts = searchResults.map((result: any) => result.snippet).join('\n\n');
    const analyzedPrice = await analyzePricesWithOpenAI(detailedDescription, contexts);
    console.log('Search Results:', contexts);

    return NextResponse.json({
      detailedDescription,
      mostRelevantPrice: analyzedPrice,
    });
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
          { type: 'text', text: 'Analyze the picture first in detail, and try to guess the name of the thing is in a few words without description. For example, if the thing is a car, try to analyze what brand, model, year it is. For items, try io guess the series, brand, size, and year.' },
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



const analyzePricesWithOpenAI = async (query: string, contexts: string): Promise<string> => {
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







































// Function to find the most relevant price
const findMostRelevantPrice = (searchResults: any[], query: string) => {
  // Improved price regex
  const pricePattern = /(?:[£$€¥]\s?\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?|\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?\s?[£$€¥])/g;

  const keywords = ['price', 'cost', 'starting at', 'from', 'retail', 'worth'];

  const priceFrequency: Record<string, { count: number; context: string }> = {};

  console.log(`\n=== DEBUGGING: Fetching search results for query: "${query}" ===`);

  // Step 1: Iterate through search results
  for (const [index, result] of searchResults.entries()) {
    const snippet = result.snippet || '';
    const title = result.title || '';
    const combinedText = `${title} ${snippet}`;
    console.log(`\nSearch Result [${index + 1}]:\nTitle: ${title}\nSnippet: ${snippet}`);

    // Step 2: Match prices in the text
    const matches = combinedText.match(pricePattern);
    if (matches) {
      console.log(`  🎯 Matched Prices: ${matches}`);

      matches.forEach((match) => {
        const hasKeyword = keywords.some((kw) => combinedText.toLowerCase().includes(kw));

        // Clean price (remove spaces and unwanted characters, keep decimals)
        const cleanedPrice = match.replace(/[^\d.]/g, ''); // Remove non-numeric except '.'

        // Identify the currency
        const currencyMatch = match.match(/[£$€¥]|USD|GBP|EUR|JPY/)?.[0] || '';
        const numericPrice = parseFloat(cleanedPrice);

        if (!isNaN(numericPrice) && numericPrice > 10) {
          const priceKey = `${currencyMatch}${numericPrice.toFixed(2)}`;
          console.log(`    ➡️ Extracted Price: ${priceKey} (Keyword Match: ${hasKeyword})`);

          // Track price frequency, prioritize keyword matches
          if (!priceFrequency[priceKey]) {
            priceFrequency[priceKey] = { count: 0, context: combinedText };
          }
          priceFrequency[priceKey].count += hasKeyword ? 2 : 1; // Prioritize keyword match
        }
      });
    } else {
      console.log(`  ❌ No prices found in this result.`);
    }
  }

  // Step 3: Log all extracted prices
  console.log(`\n=== Extracted Prices with Frequency ===`);
  console.log(priceFrequency);

  // Step 4: Sort and rank prices based on frequency and value
  const sortedPrices = Object.entries(priceFrequency).sort((a, b) => {
    const freqDiff = b[1].count - a[1].count; // Sort by frequency first
    const priceA = parseFloat(a[0].replace(/[^\d.]/g, ''));
    const priceB = parseFloat(b[0].replace(/[^\d.]/g, ''));
    return freqDiff !== 0 ? freqDiff : priceA - priceB; // If tie, choose lower price
  });

  // Step 5: Return the most relevant price
  if (sortedPrices.length > 0) {
    const [bestPrice, details] = sortedPrices[0];
    console.log(`\n🎉 Best Price Found: ${bestPrice} | Context: ${details.context}`);
    return `${bestPrice}`;
  }

  console.log(`\n🚨 No relevant prices found.`);
  return 'No relevant prices found';
};