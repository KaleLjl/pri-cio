// pages/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb"; // Keep clientPromise import for user lookup
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
// Import ALL service functions used in this file
import {
  getMessages,
  sendMessage,
  markMessagesRead,
  deleteConversation,
  updateMessageStatus, // Import updateMessageStatus service function
} from "@/services/message.service";
// Remove MessageDBSchema import if only used for problematic type annotations
// import { MessageDBSchema } from "@/lib/types/chat";

export const revalidate = 30;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = user._id.toString();

    // Call the service function
    const result = await getMessages({ conversationId, userId, page, limit });

    return NextResponse.json(result);
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in GET /api/chat/messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST: send a new message
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, receiverId } = await req.json(); // Removed unused conversationId
    if (!content || !receiverId) {
      return NextResponse.json(
        { error: "Content and receiver ID are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const sender = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }
    const senderId = sender._id.toString();

    // Call the service function to handle message sending and related logic
    const createdMessage = await sendMessage({ senderId, receiverId, content });

    // Return the created message (already formatted by the service)
    return NextResponse.json(createdMessage);
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in POST /api/chat/messages:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// PATCH: mark messages as read
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = user._id.toString();

    // Call the service function
    const modifiedCount = await markMessagesRead({ conversationId, userId });

    return NextResponse.json({
      success: true,
      modifiedCount, // Return the count from the service
    });
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in PATCH /api/chat/messages:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}

// DELETE: soft delete messages and conversation
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = user._id.toString();

    // Call the service function to handle deletion logic
    await deleteConversation({ conversationId, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in DELETE /api/chat/messages:", error);
    // Return specific error message if thrown by service
    if (
      error instanceof Error &&
      error.message.startsWith("Cannot delete conversation")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete messages",
      },
      { status: 500 }
    );
  }
}

// PUT: update message status
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, status } = await req.json();
    if (!messageId || !status) {
      return NextResponse.json(
        { error: "Message ID and status are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      // User lookup might not be strictly necessary here unless authorization rules depend on it
      // For now, we assume the service handles finding the message by ID
      // return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Call the service function
    await updateMessageStatus({ messageId, status });

    return NextResponse.json({
      success: true,
      messageId,
      status,
    });
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in PUT /api/chat/messages:", error);
    // Return specific error messages if available from the service
    if (
      error instanceof Error &&
      (error.message === "Invalid message ID format." ||
        error.message === "Invalid status provided." ||
        error.message === "Message not found.")
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 }); // Or 404 for not found
    }
    return NextResponse.json(
      { error: "Failed to update message status" },
      { status: 500 }
    );
  }
}
