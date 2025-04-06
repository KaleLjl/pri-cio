import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import conversationService from "@/services/conversation.service"; // Import the service

// Initialize or get a single conversation between two users
export async function POST(req: Request) {
  try {
    console.log("=== Chat Initialization API Called ===");
    const session = await auth();
    if (!session?.user?.id) {
      console.log("Unauthorized: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUserId = session.user.id; // Get current user ID directly from session

    const { participantId } = await req.json();
    console.log("Initializing chat with participant:", participantId);

    // Basic validation (ObjectId validation is handled in the service)
    if (!participantId) {
      console.log("Missing participant ID");
      return NextResponse.json(
        { error: "Missing participant ID" },
        { status: 400 }
      );
    }
    if (!ObjectId.isValid(participantId)) {
      console.log("Invalid participant ID format:", participantId);
      return NextResponse.json(
        { error: "Invalid participant ID format" },
        { status: 400 }
      );
    }

    // Call the service method
    const conversation = await conversationService.initializeConversation(
      currentUserId,
      participantId
    );

    if (!conversation) {
      // Service handles internal errors and logging, returns null on failure
      return NextResponse.json(
        { error: "Failed to initialize conversation" },
        { status: 500 } // Assuming internal error if service returns null
      );
    }

    console.log("Returning conversation:", conversation._id);
    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error in chat initialization API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
