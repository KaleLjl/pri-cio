// src/app/api/chat/conversations/list/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import conversationService from "@/services/conversation.service"; // Import the service

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id; // Get user ID directly

    // Call the service method
    const conversations = await conversationService.listConversations(userId);

    // Service returns ConversationListItem[] or empty array on error/validation fail
    return NextResponse.json(conversations);
  } catch (err) {
    console.error("Error fetching conversations in API route:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
