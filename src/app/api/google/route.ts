import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Environment variable path for Service Account JSON
const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

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
          features: [{ type: 'WEB_DETECTION' }],
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

    const webEntities = result.responses[0]?.webDetection?.webEntities || [];
    const topDescription = webEntities[0]?.description || 'No description found';

    return NextResponse.json({ detectedObject: topDescription });
  } catch (error) {
    console.error('Error processing the image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper function to encode file to Base64
const encodeImageToBase64 = async (filepath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filepath);
  return fileBuffer.toString('base64');
};
