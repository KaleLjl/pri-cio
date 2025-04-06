import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import conversationService from "@/services/conversation.service"; // Import the service

// Update conversation settings
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUserId = session.user.id;

    const { conversationId, settings } = await req.json();

    // Basic validation
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversation ID" },
        { status: 400 }
      );
    }
    if (!ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }
    if (!settings) {
      return NextResponse.json(
        { error: "Missing settings data" },
        { status: 400 }
      );
    }

    // Call the service method
    const updatedConversation =
      await conversationService.updateConversationSettings(
        currentUserId,
        conversationId,
        settings
      );

    if (!updatedConversation) {
      // Service handles internal errors, logging, and auth check (user must be participant)
      return NextResponse.json(
        {
          error:
            "Failed to update settings or conversation not found/unauthorized",
        },
        { status: 404 } // Return 404 if not found or user not participant
      );
    }

    console.log("Conversation settings updated:", conversationId);
    // Return the updated conversation object as per service method
    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error("Error updating conversation settings in API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
