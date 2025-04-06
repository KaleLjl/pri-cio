import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aiService } from "@/services/ai.service"; // Import the AIService instance

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for user ID
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Delegate image upload analysis to the service
      const result = await aiService.handleImageUploadAnalysis(request);
      return NextResponse.json(result);
    } else if (contentType.includes("application/json")) {
      // Delegate JSON chat handling to the service
      const body = await request.json();
      const result = await aiService.handleJsonChat(body);
      return NextResponse.json(result);
    }

    // If content type is not supported
    return NextResponse.json(
      { error: "Unsupported Content-Type" },
      { status: 415 } // Use 415 Unsupported Media Type
    );
  } catch (error: unknown) {
    console.error("Error in AI chat API route:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    // Determine appropriate status code based on error type if needed
    const status =
      error instanceof Error && error.message.includes("Unauthorized")
        ? 401
        : 500;
    if (error instanceof Error && error.message === "No image file uploaded") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message === "Image URL is required for initial analysis"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message === "Invalid conversation format (expected an array)"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status }
    );
  }
}
