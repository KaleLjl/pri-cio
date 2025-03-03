import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { priceValidation, meetingValidation } from '@/lib/utils/ObjectDiscussionValidation';

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
          $addFields: {
            isSeller: {
              $eq: ['$historyDetails.userEmail', session.user.email]
            }
          }
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
                if: '$isSeller',
                then: 'selling',
                else: 'buying'
              }
            },
            buyerId: 1,
            sellerId: 1,
            otherPartyEmail: {
              $cond: {
                if: '$isSeller',
                then: { $toString: '$buyerEmail' },
                else: { $toString: '$sellerEmail' }
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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      historyId, 
      exploreId, 
      buyerId, 
      sellerId, 
      meetingTime, 
      location,
      suggestedPrice,
    } = await request.json();

    // Validate price
    const priceValidationResult = priceValidation.validate(suggestedPrice);
    if (!priceValidationResult.isValid) {
      return NextResponse.json(
        { message: priceValidationResult.error },
        { status: 400 }
      );
    }

    // Validate meeting details
    const meetingValidationResult = meetingValidation.validate({ meetingTime, location });
    if (!meetingValidationResult.isValid) {
      return NextResponse.json(
        { message: meetingValidationResult.error },
        { status: 400 }
      );
    }
    
    // Make sure both parties are involved in this deal
    const currentUserId = session.user.id;
    if (currentUserId !== buyerId && currentUserId !== sellerId) {
      return NextResponse.json(
        { message: 'You are not authorized to complete this deal' },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');
    const historyCollection = db.collection('history');
    const exploreCollection = db.collection('explore');

    // Check if historyId and exploreId exist
    const historyItem = await historyCollection.findOne({
      _id: new ObjectId(historyId),
    });

    const exploreItem = await exploreCollection.findOne({
      _id: new ObjectId(exploreId),
    });

    if (!historyItem || !exploreItem) {
      return NextResponse.json(
        { message: 'History or item not found' },
        { status: 404 }
      );
    }

    // Update the history item with deal information
    await historyCollection.updateOne(
      { _id: new ObjectId(historyId) },
      {
        $set: {
          dealCompleted: true,
          buyerId: new ObjectId(buyerId),
          sellerId: new ObjectId(sellerId),
          meetingTime: meetingDate,
          meetingLocation: location,
          dealCompletedAt: new Date(),
        },
      }
    );

    // Update the explore item to mark it as sold
    await exploreCollection.updateOne(
      { _id: new ObjectId(exploreId) },
      {
        $set: {
          isSold: true,
          soldTo: new ObjectId(buyerId),
          soldAt: new Date(),
          meetingTime: meetingDate,
          meetingLocation: location,
        },
      }
    );

    return NextResponse.json(
      { message: 'Deal completed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error completing deal:', error);
    return NextResponse.json(
      { message: 'Failed to complete deal' },
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