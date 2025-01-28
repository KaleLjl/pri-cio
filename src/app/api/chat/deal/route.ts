import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { historyId, exploreId } = await req.json();

    if (!historyId || !exploreId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // 1. Get the explore item before deleting it
    const exploreItem = await db.collection('explore').findOne({
      _id: new ObjectId(exploreId)
    });

    if (!exploreItem) {
      return NextResponse.json(
        { message: 'Explore item not found' },
        { status: 404 }
      );
    }

    // 2. Delete from explore collection
    await db.collection('explore').deleteOne({
      _id: new ObjectId(exploreId)
    });

    // 3. Update history record
    await db.collection('histories').updateOne(
      { _id: new ObjectId(historyId) },
      { 
        $unset: { exploreId: "" }
      }
    );

    // 4. Add to dealing collection
    const dealingItem = {
      ...exploreItem,
      originalExploreId: exploreId,
      historyId: historyId,
      dealStartedAt: new Date(),
      status: 'in_progress', // 可以用来跟踪交易状态
      buyer: session.user.email, // 记录买家信息
      seller: exploreItem.userEmail, // 记录卖家信息
    };

    const result = await db.collection('dealing').insertOne(dealingItem);

    return NextResponse.json({ 
      success: true,
      dealingId: result.insertedId 
    });

  } catch (error) {
    console.error('Error in deal API:', error);
    return NextResponse.json(
      { 
        message: 'Failed to complete deal', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 