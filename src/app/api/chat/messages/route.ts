import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';

// 设置合理的缓存时间
export const revalidate = 30; // 30秒缓存

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // 创建复合索引以提高查询性能
    await db.collection('messages').createIndex({ conversationId: 1, createdAt: -1 });

    // 计算要跳过的文档数量
    const skip = (page - 1) * limit;

    // 使用聚合管道优化查询
    const messages = await db.collection('messages')
      .find({ 
        conversationId: new ObjectId(conversationId)
      })
      .sort({ createdAt: -1 }) // 倒序排列，最新的消息在前
      .skip(skip)
      .limit(limit)
      .toArray();

    // 获取总消息数（用于分页）
    const total = await db.collection('messages')
      .countDocuments({ conversationId: new ObjectId(conversationId) });

    // 转换 ObjectId 为字符串
    const formattedMessages = messages.map(msg => ({
      ...msg,
      _id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      createdAt: msg.createdAt || new Date().toISOString(),
      status: msg.status || 'sent'
    }));

    return NextResponse.json({
      messages: formattedMessages.reverse(), // 返回正序的消息列表
      total,
      page,
      limit,
      hasMore: total > skip + limit
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Send a new message
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, content, receiverId } = await req.json();

    if (!content || !receiverId) {
      return NextResponse.json(
        { error: 'Content and receiver ID are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Get sender's user ID
    const sender = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { _id: 1 } }
    );

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    const senderId = sender._id.toString();

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.collection('conversations').findOne({
        _id: new ObjectId(conversationId),
        participants: { $all: [senderId, receiverId] }
      });
    }

    if (!conversation) {
      // Create new conversation
      conversation = {
        _id: new ObjectId(),
        participants: [senderId, receiverId],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('conversations').insertOne(conversation);
    }

    // Create new message
    const newMessage = {
      conversationId: conversation._id,
      senderId,
      receiverId,
      content,
      createdAt: new Date(),
      read: false
    };

    const result = await db.collection('messages').insertOne(newMessage);

    // Update conversation's updatedAt timestamp
    await db.collection('conversations').updateOne(
      { _id: conversation._id },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      _id: result.insertedId,
      ...newMessage,
      conversationId: conversation._id.toString()
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 