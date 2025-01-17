// pages/api/chat/conversations/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");
    const user = await db.collection("users").findOne({ email: session.user.email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id.toString();

    // 原先的聚合逻辑
    const conversations = await db
      .collection("conversations")
      .aggregate([
        { $match: { participants: userId } },
        {
          $lookup: {
            from: "messages",
            let: { conversationId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$conversationId" }, "$$conversationId"] },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "lastMessage",
          },
        },
        { $match: { "lastMessage.0": { $exists: true } } },
        {
          $lookup: {
            from: "users",
            let: { participants: "$participants" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: [{ $toString: "$_id" }, "$$participants"] },
                },
              },
            ],
            as: "participants",
          },
        },
        {
          $addFields: {
            lastMessage: {
              $let: {
                vars: { msg: { $arrayElemAt: ["$lastMessage", 0] } },
                in: {
                  _id: { $toString: "$$msg._id" },
                  content: "$$msg.content",
                  createdAt: { $toDate: "$$msg.createdAt" },
                  senderId: { $toString: "$$msg.senderId" },
                  conversationId: { $toString: "$$msg.conversationId" },
                },
              },
            },
          },
        },
        { $sort: { "lastMessage.createdAt": -1 } },
      ])
      .toArray();

    const conversationsWithStringIds = conversations.map((conv) => ({
      ...conv,
      _id: conv._id.toString(),
      participants: conv.participants.map((p: any) => ({
        ...p,
        _id: p._id.toString(),
      })),
      lastMessage: conv.lastMessage
        ? {
            ...conv.lastMessage,
            createdAt: conv.lastMessage.createdAt?.toISOString() ?? new Date().toISOString(),
          }
        : null,
    }));

    return NextResponse.json(conversationsWithStringIds);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}