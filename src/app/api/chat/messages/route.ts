// pages/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";

export const revalidate = 30; 

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    await db.collection("messages").createIndex({ conversationId: 1, createdAt: -1 });

    const skip = (page - 1) * limit;
    const messages = await db
      .collection("messages")
      .find({ conversationId: new ObjectId(conversationId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db
      .collection("messages")
      .countDocuments({ conversationId: new ObjectId(conversationId) });

    const formattedMessages = messages.map((msg) => ({
      ...msg,
      _id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      createdAt: msg.createdAt || new Date().toISOString(),
      status: msg.status || "sent",
    }));

    return NextResponse.json({
      messages: formattedMessages.reverse(), 
      total,
      page,
      limit,
      hasMore: total > skip + limit,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: send a new message
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, content, receiverId } = await req.json();
    if (!content || !receiverId) {
      return NextResponse.json({ error: "Content and receiver ID are required" }, { status: 400 });
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

    let conversation;
    if (conversationId) {
      conversation = await db.collection("conversations").findOne({
        _id: new ObjectId(conversationId),
        participants: { $all: [senderId, receiverId] },
      });
    }
    if (!conversation) {
      conversation = {
        _id: new ObjectId(),
        participants: [senderId, receiverId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("conversations").insertOne(conversation);
    }

    const newMessage = {
      conversationId: conversation._id,
      senderId,
      receiverId,
      content,
      createdAt: new Date(),
      read: false,
    };

    const result = await db.collection("messages").insertOne(newMessage);
    await db
      .collection("conversations")
      .updateOne({ _id: conversation._id }, { $set: { updatedAt: new Date() } });

    return NextResponse.json({
      _id: result.insertedId,
      ...newMessage,
      conversationId: conversation._id.toString(),
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}