import { NextResponse } from 'next/server';
import clientPromise from '@/lib/utils/mongodb';
import { auth } from '@/lib/utils/auth';
import { ObjectId } from 'mongodb';

// Initialize or get a single conversation between two users
export async function POST(req: Request) {
  try {
    console.log('=== Chat Initialization API Called ===');
    const session = await auth();
    if (!session?.user?.email) {
      console.log('Unauthorized: No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { participantId } = await req.json();
    console.log('Initializing chat with participant:', participantId);
    
    if (!participantId || !ObjectId.isValid(participantId)) {
      console.log('Invalid participant ID:', participantId);
      return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Get current user ID
    const currentUser = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { _id: 1 } }
    );

    if (!currentUser) {
      console.log('Current user not found for email:', session.user.email);
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const currentUserId = currentUser._id.toString();
    console.log('Current user ID:', currentUserId);

    // Verify participant exists
    const participant = await db.collection('users').findOne(
      { _id: new ObjectId(participantId) },
      { projection: { _id: 1, name: 1, avatarUrl: 1 } }
    );

    if (!participant) {
      console.log('Participant not found for ID:', participantId);
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    console.log('Participant found:', participant);

    // Find existing conversation or create new one
    const existingConversation = await db.collection('conversations').findOne({
      participants: {
        $all: [currentUserId, participantId],
        $size: 2
      }
    });

    console.log('Existing conversation found:', existingConversation ? existingConversation._id : 'none');

    if (existingConversation) {
      console.log('Returning existing conversation');
      return NextResponse.json({
        _id: existingConversation._id,
        participants: [
          {
            _id: currentUser._id,
            name: session.user.name,
            avatarUrl: session.user.image
          },
          {
            _id: participant._id,
            name: participant.name,
            avatarUrl: participant.avatarUrl
          }
        ],
        createdAt: existingConversation.createdAt,
        updatedAt: new Date()
      });
    }

    // Create new conversation
    console.log('Creating new conversation between', currentUserId, 'and', participantId);
    const newConversation = await db.collection('conversations').insertOne({
      participants: [currentUserId, participantId],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('New conversation created with ID:', newConversation.insertedId);

    return NextResponse.json({
      _id: newConversation.insertedId,
      participants: [
        {
          _id: currentUser._id,
          name: session.user.name,
          avatarUrl: session.user.image
        },
        {
          _id: participant._id,
          name: participant.name,
          avatarUrl: participant.avatarUrl
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error in chat initialization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update conversation settings (e.g., notifications, theme, etc.)
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, settings } = await req.json();
    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Get current user ID
    const user = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { _id: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();

    // Verify conversation exists and user is participant
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId),
      participants: userId
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Update conversation settings
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: {
          settings,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating conversation settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 