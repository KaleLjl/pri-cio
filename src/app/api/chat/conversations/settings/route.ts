import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Update conversation settings
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, settings } = await req.json();
    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    // Get current user ID
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id.toString();

    // Verify conversation exists and user is participant
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(conversationId),
      participants: userId,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update conversation settings
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          settings,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating conversation settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
