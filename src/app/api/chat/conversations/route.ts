import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Find all conversations where the current user is a participant
    const conversations = await db.collection('conversations').aggregate([
      {
        $match: {
          participants: session.user.id
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participants'
        }
      },
      {
        $lookup: {
          from: 'messages',
          let: { conversationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$conversationId', '$$conversationId'] }
              }
            },
            {
              $sort: { createdAt: -1 }
            },
            {
              $limit: 1
            }
          ],
          as: 'lastMessage'
        }
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] }
        }
      },
      {
        $sort: {
          'lastMessage.createdAt': -1,
          updatedAt: -1 // 如果没有最后消息，则按更新时间排序
        }
      }
    ]).toArray();

    // Convert ObjectIds to strings
    const conversationsWithStringIds = conversations.map(conv => ({
      ...conv,
      _id: conv._id.toString(),
      participants: conv.participants.map((p: any) => ({
        ...p,
        _id: p._id.toString()
      })),
      lastMessage: conv.lastMessage ? {
        ...conv.lastMessage,
        _id: conv.lastMessage._id.toString(),
        conversationId: conv.lastMessage.conversationId.toString()
      } : null
    }));

    return NextResponse.json(conversationsWithStringIds);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    const { otherUserId } = await request.json();
    if (!otherUserId || !ObjectId.isValid(otherUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Check if other user exists
    const otherUser = await db.collection('users').findOne(
      { _id: new ObjectId(otherUserId) }
    );
    if (!otherUser) {
      return NextResponse.json(
        { error: 'Other user not found' },
        { status: 404 }
      );
    }

    // Check if conversation already exists
    const existingConversation = await db.collection('conversations').findOne({
      participants: {
        $all: [session.user.id, otherUserId],
        $size: 2
      }
    });

    if (existingConversation) {
      return NextResponse.json({
        _id: existingConversation._id.toString(),
        participants: existingConversation.participants,
        updatedAt: existingConversation.updatedAt,
        createdAt: existingConversation.createdAt,
      });
    }

    // Create new conversation
    const newConversation = {
      _id: new ObjectId(),
      participants: [session.user.id, otherUserId],
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    await db.collection('conversations').insertOne(newConversation);

    return NextResponse.json({
      _id: newConversation._id.toString(),
      participants: newConversation.participants,
      updatedAt: newConversation.updatedAt,
      createdAt: newConversation.createdAt,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 