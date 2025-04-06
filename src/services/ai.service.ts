import fs from "fs/promises";
import formidable from "formidable";
import { Readable } from "stream";
import { IncomingMessage } from "http";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API Key
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set.");
  // Consider throwing an error or handling this case appropriately
}

// Define types for OpenAI Vision content items
interface TextContentItem {
  type: "text";
  text: string;
}

interface ImageContentItem {
  type: "image_url";
  image_url: { url: string };
}

// Define types for conversation messages and post data
interface ChatMessage {
  role: "user" | "assistant" | "system" | "gpt"; // Allow 'gpt' for input compatibility
  content: string | (TextContentItem | ImageContentItem)[]; // Use specific types for vision content
}

interface PostData {
  description: string | null;
  price: string | null; // Keep as string based on original code expecting numeric string
}

interface AssistantReply {
  reply: string;
  postData: PostData;
}

export class AIService {
  // Handles image upload analysis (multipart/form-data)
  async handleImageUploadAnalysis(
    request: Request
  ): Promise<{ detailedDescription: string }> {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert Buffer into a Readable Stream
    const nodeRequest = new Readable();
    nodeRequest.push(buffer);
    nodeRequest.push(null);

    // Convert Readable to mimic an IncomingMessage
    const fakeIncomingMessage = Object.assign(nodeRequest, {
      headers: Object.fromEntries(request.headers),
    }) as IncomingMessage;

    const form = formidable({ multiples: false });

    const parsedForm = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(fakeIncomingMessage, (err, fields, files) => {
        if (err) reject(new Error(`Formidable parsing error: ${err.message}`));
        else resolve({ fields, files });
      });
    });

    const imageFile = parsedForm.files?.image?.[0];
    if (!imageFile) {
      throw new Error("No image file uploaded");
    }

    const base64Image = await this.encodeImageToBase64(imageFile.filepath);
    // Assuming default currency if not provided in multipart - might need adjustment
    const detailedDescription = await this.analyzeImageWithOpenAI(
      base64Image,
      "USD"
    );

    return { detailedDescription };
  }

  // Handles JSON chat continuation or image URL analysis
  async handleJsonChat(body: {
    conversation?: ChatMessage[];
    imageUrl?: string;
    currency?: string;
    isInitialAnalysis?: boolean;
  }): Promise<{ detailedDescription: string } | AssistantReply> {
    const {
      conversation,
      imageUrl,
      currency = "USD",
      isInitialAnalysis,
    } = body;

    console.log("AIService called with:", {
      isInitialAnalysis,
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + "..." : "N/A",
    });

    if (isInitialAnalysis) {
      if (!imageUrl) {
        throw new Error("Image URL is required for initial analysis");
      }
      const detailedDescription = await this.analyzeImageWithOpenAI(
        imageUrl,
        currency
      );
      return { detailedDescription };
    }

    if (!Array.isArray(conversation)) {
      throw new Error("Invalid conversation format (expected an array)");
    }

    const reply = await this.getNextAssistantMessage(conversation, currency);
    return reply;
  }

  // Private helper to encode image file to Base64
  private async encodeImageToBase64(filepath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filepath);
      return fileBuffer.toString("base64");
    } catch (error: unknown) {
      console.error(`Error reading file ${filepath}:`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to encode image: ${message}`);
    }
  }

  // Private helper to analyze image using OpenAI's GPT-4 Vision API
  private async analyzeImageWithOpenAI(
    imageInput: string,
    currency: string = "USD"
  ): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured.");
    }

    let imageUrl = imageInput;
    // If the input is a base64 string, convert it to a data URL
    if (!imageInput.startsWith("http") && !imageInput.startsWith("data:")) {
      imageUrl = `data:image/jpeg;base64,${imageInput}`;
    }

    const payload = {
      model: "gpt-4o-2024-08-06", // Use the specific vision model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are a helpful assistant that determines a fair selling price for an item. " +
                "1. The user has uploaded a photo—analyze it and identify what the item is. " +
                "2. Provide clear, specific feedback on the image (for example, what the item is and its model, if applicable). " +
                "3. Ask for any critical missing details (such as size, condition, damage, or other relevant features) until you have sufficient information. " +
                "4. Make sure to ask where is it located." +
                "5. Once enough information is available, generate a single recommended selling price in " +
                currency +
                " (do not provide a price range) based on current market conditions. " +
                "6. Your tone should be straightforward and helpful.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 200,
    };

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error Response (Vision):", errorText);
        throw new Error(
          `OpenAI API Error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const description =
        result.choices[0]?.message?.content || "No description found";
      console.log("OpenAI Vision Response:", description);
      return description;
    } catch (error: unknown) {
      console.error("Error calling OpenAI Vision API:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to analyze image with OpenAI: ${message}`);
    }
  }

  // Private helper to get the next assistant message using GPT-4
  private async getNextAssistantMessage(
    conversation: ChatMessage[],
    currency: string = "USD"
  ): Promise<AssistantReply> {
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured.");
    }

    const systemPrompt = {
      role: "system",
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

    // Map 'gpt' role to 'assistant' for OpenAI compatibility
    const sanitizedConversation = [
      systemPrompt,
      ...conversation.map((msg) => ({
        ...msg,
        role: msg.role === "gpt" ? "assistant" : msg.role,
      })),
    ];

    const payload = {
      model: "gpt-4", // Use the standard GPT-4 model for chat
      messages: sanitizedConversation,
      max_tokens: 300,
      temperature: 0.5,
      // Ensure JSON mode if supported by the model version, otherwise rely on prompt engineering
      // response_format: { type: "json_object" }, // Uncomment if using a model version that supports this reliably
    };

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error Response (Chat):", errorText);
        throw new Error(
          `OpenAI API Error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content || "";

      let parsed: AssistantReply;
      try {
        // Attempt to parse the JSON response from the assistant
        parsed = JSON.parse(content);
        // Basic validation of the parsed structure
        if (
          typeof parsed.reply !== "string" ||
          typeof parsed.postData !== "object" ||
          parsed.postData === null
        ) {
          throw new Error("Parsed JSON does not match expected structure.");
        }
      } catch (error) {
        console.error(
          "Error parsing GPT JSON response:",
          error,
          "Raw content:",
          content
        );
        // Fallback if JSON parsing fails or structure is wrong
        parsed = {
          reply: content,
          postData: { description: null, price: null },
        };
      }
      return parsed;
    } catch (error: unknown) {
      console.error("Error calling OpenAI Chat API:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get assistant reply: ${message}`);
    }
  }
}

// Export an instance for easy use, or allow instantiation
export const aiService = new AIService();
