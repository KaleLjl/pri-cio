// pages/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/utils/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/utils/auth";

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

    const session = await auth();
    if (!session?.user?.email) {
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

    await db.collection("messages").createIndex({ conversationId: 1, createdAt: -1 });

    const skip = (page - 1) * limit;
    const messages = await db
      .collection("messages")
      .find({ 
        conversationId: new ObjectId(conversationId),
        $or: [
          { deletedBy: { $exists: false } },
          { deletedBy: { $ne: userId } }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db
      .collection("messages")
      .countDocuments({ 
        conversationId: new ObjectId(conversationId),
        $or: [
          { deletedBy: { $exists: false } },
          { deletedBy: { $ne: userId } }
        ]
      });

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

    // 首先尝试查找现有的对话，不管是否提供了conversationId
    let conversation = await db.collection("conversations").findOne({
      participants: {
        $all: [senderId, receiverId],
        $size: 2
      }
    });

    // 如果没有找到现有对话，则创建新对话
    if (!conversation) {
      conversation = {
        _id: new ObjectId(),
        participants: [senderId, receiverId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("conversations").insertOne(conversation);
    } else {
      // 如果对话存在，恢复被删除的对话（如果被删除了的话）
      await db.collection("conversations").updateOne(
        { _id: conversation._id },
        { 
          $set: { updatedAt: new Date() },
          $unset: { deletedBy: "" } // 移除 deletedBy 字段，恢复对话
        }
      );
    }

    const newMessage = {
      conversationId: conversation._id,
      senderId,
      receiverId,
      content,
      createdAt: new Date(),
      read: false,
      status: 'sent',
    };

    const result = await db.collection("messages").insertOne(newMessage);
    await db
      .collection("conversations")
      .updateOne({ _id: conversation._id }, { 
        $set: { updatedAt: new Date() },
        $inc: { unreadCount: 1 }
      });

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

// PATCH: mark messages as read
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 更新所有未读消息为已读
    const result = await db.collection("messages").updateMany(
      {
        conversationId: new ObjectId(conversationId),
        receiverId: user._id.toString(),
        read: false
      },
      {
        $set: { read: true }
      }
    );

    // 更新会话的未读消息计数
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { unreadCount: 0 } }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
}

// DELETE: soft delete messages and conversation
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
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

    // 检查是否有正在进行的讨论
    const messages = await db.collection("messages")
      .find({ 
        conversationId: new ObjectId(conversationId),
        "content.type": "object_discussion",
        "content.discussingId": { $exists: true }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // 按discussingId分组，找出每个讨论的最后一条消息
    const discussionGroups = new Map();
    messages.forEach(msg => {
      const discussingId = msg.content.discussingId;
      if (!discussionGroups.has(discussingId) || 
          new Date(msg.createdAt) > new Date(discussionGroups.get(discussingId).createdAt)) {
        discussionGroups.set(discussingId, msg);
      }
    });

    // 检查是否有任何讨论的最后状态是"discussing"
    for (const [_, lastMessage] of discussionGroups) {
      if (lastMessage.content.status === "discussing") {
        return NextResponse.json({ 
          error: "Cannot delete conversation with ongoing discussions. Please complete or cancel all discussions first." 
        }, { status: 400 });
      }
    }

    // Start a session for transaction
    const mongoSession = client.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        // 1. 获取对话信息和消息状态
        const conversation = await db.collection("conversations").findOne(
          { _id: new ObjectId(conversationId) },
          { session: mongoSession }
        );

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // 2. 检查消息的删除状态
        const messages = await db.collection("messages")
          .find({ conversationId: new ObjectId(conversationId) })
          .toArray();

        // 3. 判断是否所有参与者都已删除消息
        const otherParticipantId = conversation.participants.find((p: string) => p !== userId);
        const allMessagesDeletedByOther = messages.every(msg => 
          msg.deletedBy?.includes(otherParticipantId)
        );

        if (allMessagesDeletedByOther) {
          // 如果对方已经删除了所有消息，直接进行硬删除
          await db.collection("messages").deleteMany(
            { conversationId: new ObjectId(conversationId) },
            { session: mongoSession }
          );
          
          await db.collection("conversations").deleteOne(
            { _id: new ObjectId(conversationId) },
            { session: mongoSession }
          );
        } else {
          // 否则只进行软删除
          await db.collection("messages").updateMany(
            { 
              conversationId: new ObjectId(conversationId),
              $or: [
                { deletedBy: { $exists: false } },
                { deletedBy: { $ne: userId } }
              ]
            },
            {
              $addToSet: { deletedBy: userId }
            },
            { session: mongoSession }
          );

          await db.collection("conversations").updateOne(
            { _id: new ObjectId(conversationId) },
            {
              $addToSet: { deletedBy: userId },
              $set: { 
                updatedAt: new Date(),
                unreadCount: 0
              }
            },
            { session: mongoSession }
          );
        }

        // 4. 标记消息为已读（无论是软删除还是硬删除）
        await db.collection("messages").updateMany(
          {
            conversationId: new ObjectId(conversationId),
            receiverId: userId,
            read: false
          },
          {
            $set: { read: true }
          },
          { session: mongoSession }
        );
      });
    } finally {
      await mongoSession.endSession();
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete messages" 
    }, { status: 500 });
  }
}

// PUT: update message status
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, status } = await req.json();
    if (!messageId || !status) {
      return NextResponse.json({ error: "Message ID and status are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update message status
    const result = await db.collection("messages").updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      messageId,
      status
    });
  } catch (error) {
    console.error("Error updating message status:", error);
    return NextResponse.json({ error: "Failed to update message status" }, { status: 500 });
  }
}