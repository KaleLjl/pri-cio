import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    const user = await db.collection('users').findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const conversations = await db.collection('conversations')
      .find({ participants: user._id.toString() })
      .sort({ updatedAt: -1 })
      .toArray();

    // Get the last message and other participant's info for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipantId = conv.participants.find(
          (id: string) => id !== user._id.toString()
        );

        const [otherParticipant, lastMessage] = await Promise.all([
          db.collection('users').findOne(
            { _id: new ObjectId(otherParticipantId) },
            { projection: { _id: 1, name: 1, avatarUrl: 1 } }
          ),
          db.collection('messages')
            .findOne(
              { conversationId: conv._id.toString() },
              { sort: { createdAt: -1 } }
            )
        ]);

        return {
          _id: conv._id.toString(),
          otherParticipant: otherParticipant ? {
            _id: otherParticipant._id.toString(),
            name: otherParticipant.name,
            avatarUrl: otherParticipant.avatarUrl,
          } : null,
          lastMessage: lastMessage ? {
            ...lastMessage,
            _id: lastMessage._id.toString(),
          } : null,
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
        };
      })
    );

    return NextResponse.json(conversationsWithDetails);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    const user = await db.collection('users').findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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
        $all: [user._id.toString(), otherUserId],
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
      participants: [user._id.toString(), otherUserId],
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