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

    const body = await req.json();
    console.log('Received deal request body:', body);

    const { historyId, exploreId, buyerId, sellerId } = body;

    // 添加更详细的错误信息
    const missingFields = [];
    if (!historyId) missingFields.push('historyId');
    if (!exploreId) missingFields.push('exploreId');
    if (!buyerId) missingFields.push('buyerId');
    if (!sellerId) missingFields.push('sellerId');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          message: 'Missing required fields', 
          missingFields 
        },
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

    // 4. Add to dealing collection with buyer and seller IDs
    const dealingItem = {
      ...exploreItem,
      originalExploreId: exploreId,
      historyId: historyId,
      dealStartedAt: new Date(),
      status: 'in_progress',
      buyerId: buyerId,
      sellerId: sellerId,
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