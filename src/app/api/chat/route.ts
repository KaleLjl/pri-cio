import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// Get all conversations for the current user
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Get user ID from email
    const user = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { _id: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();

    // Get all conversations where the user is a participant
    const conversations = await db.collection('conversations')
      .aggregate([
        {
          $match: {
            participants: userId
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participantDetails'
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
          $project: {
            _id: 1,
            participants: 1,
            createdAt: 1,
            updatedAt: 1,
            participantDetails: {
              _id: 1,
              name: 1,
              avatarUrl: 1
            },
            lastMessage: { $arrayElemAt: ['$lastMessage', 0] }
          }
        },
        {
          $sort: { 'lastMessage.createdAt': -1 }
        }
      ])
      .toArray();

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// Create a new conversation or get existing one
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { participantId } = await req.json();
    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Get current user's ID
    const currentUser = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { _id: 1 } }
    );

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUserId = currentUser._id.toString();

    // Check if conversation already exists
    const existingConversation = await db.collection('conversations').findOne({
      participants: {
        $all: [currentUserId, participantId],
        $size: 2
      }
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    // Create new conversation
    const newConversation = {
      participants: [currentUserId, participantId],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('conversations').insertOne(newConversation);

    return NextResponse.json({
      _id: result.insertedId,
      ...newConversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
} 