import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Get user's ID from users collection
    const user = await db.collection('users').findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Find all dealing items where user is either buyer or seller
    const dealingItems = await db.collection('dealing')
      .aggregate([
        {
          $match: {
            $or: [
              { buyerId: user._id.toString() },
              { sellerId: user._id.toString() }
            ]
          }
        },
        {
          $lookup: {
            from: 'histories',
            let: { historyId: { $toObjectId: '$historyId' } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$historyId'] }
                }
              }
            ],
            as: 'historyDetails'
          }
        },
        {
          $unwind: '$historyDetails'
        },
        {
          $project: {
            _id: '$historyDetails._id',
            imageUrl: '$historyDetails.imageUrl',
            price: '$historyDetails.price',
            description: '$historyDetails.description',
            createdAt: '$historyDetails.createdAt',
            currency: '$historyDetails.currency',
            dealingId: { $toString: '$_id' },
            status: 1,
            role: {
              $cond: {
                if: { $eq: ['$buyerId', user._id.toString()] },
                then: 'buyer',
                else: 'seller'
              }
            },
            buyerId: 1,
            sellerId: 1,
            otherPartyEmail: {
              $cond: {
                if: { $eq: ['$buyerId', user._id.toString()] },
                then: '$sellerEmail',
                else: '$buyerEmail'
              }
            }
          }
        }
      ])
      .toArray();

    return NextResponse.json(dealingItems);
  } catch (error) {
    console.error('Error in deal API:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dealing items', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dealingId = url.pathname.split('/').pop();
    
    if (!dealingId) {
      return NextResponse.json({ message: 'Dealing ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !['completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    const result = await db.collection('dealing').updateOne(
      { _id: new ObjectId(dealingId) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Dealing item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in deal API:', error);
    return NextResponse.json(
      { message: 'Failed to update dealing status', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 