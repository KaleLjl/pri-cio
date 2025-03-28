import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// Validation logic
const priceValidation = {
  isValidFormat: (price: string): boolean => {
    return /^\d+(\.\d{0,2})?$/.test(price);
  },

  isPositive: (price: string): boolean => {
    const numericPrice = parseFloat(price);
    return numericPrice > 0;
  },

  validate: (price: string): { isValid: boolean; error?: string } => {
    if (!price) {
      return { isValid: false, error: 'Price is required' };
    }
    if (!priceValidation.isValidFormat(price)) {
      return { isValid: false, error: 'Invalid price format. Price must be a number with at most 2 decimal places.' };
    }
    if (!priceValidation.isPositive(price)) {
      return { isValid: false, error: 'Price must be greater than 0' };
    }
    return { isValid: true };
  }
};

const meetingValidation = {
  isValidTime: (time: string): boolean => {
    if (!time) return false;
    const meetingDate = new Date(time);
    const now = new Date();
    return meetingDate > now;
  },

  isValidLocation: (location: string): boolean => {
    return Boolean(location && location.trim().length > 0);
  },

  validate: (data: { meetingTime: string; location: string }): { isValid: boolean; error?: string } => {
    if (!data.meetingTime) {
      return { isValid: false, error: 'Meeting time is required' };
    }
    if (!meetingValidation.isValidTime(data.meetingTime)) {
      return { isValid: false, error: 'Meeting time must be in the future' };
    }
    if (!meetingValidation.isValidLocation(data.location)) {
      return { isValid: false, error: 'Location is required' };
    }
    return { isValid: true };
  }
};

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
            suggestedPrice: '$historyDetails.suggestedPrice',
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

    // Validate IDs
    if (!ObjectId.isValid(historyId) || !ObjectId.isValid(exploreId) || 
        !ObjectId.isValid(buyerId) || !ObjectId.isValid(sellerId)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }

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
    const client = await clientPromise;
    const db = client.db('pri-cio');
    const user = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { _id: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const currentUserId = user._id.toString();
    const buyerIdStr = buyerId.toString();
    const sellerIdStr = sellerId.toString();
    
    if (currentUserId !== buyerIdStr && currentUserId !== sellerIdStr) {
      return NextResponse.json(
        { message: 'You are not authorized to complete this deal' },
        { status: 403 }
      );
    }

    const historiesCollection = db.collection('histories');
    const exploreCollection = db.collection('explore');

    // Check if historyId and exploreId exist
    let historyItem = await historiesCollection.findOne({
      _id: new ObjectId(historyId),
    });

    // If not found, try to find by other fields
    if (!historyItem) {
      const alternativeHistoryItem = await historiesCollection.findOne({
        $or: [
          { _id: new ObjectId(historyId) },
          { historyId: historyId },
          { 'content.historyId': historyId }
        ]
      });
      
      if (alternativeHistoryItem) {
        historyItem = alternativeHistoryItem;
      }
    }

    const exploreItem = await exploreCollection.findOne({
      _id: new ObjectId(exploreId),
      isSold: { $ne: true }
    });

    if (!historyItem) {
      return NextResponse.json(
        { message: 'History item not found' },
        { status: 404 }
      );
    }

    if (!exploreItem) {
      return NextResponse.json(
        { message: 'Explore item not found or already sold' },
        { status: 404 }
      );
    }

    try {
      // Update the history item with deal information
      await historiesCollection.updateOne(
        { _id: new ObjectId(historyId) },
        {
          $set: {
            dealCompleted: true,
            buyerId: new ObjectId(buyerId),
            sellerId: new ObjectId(sellerId),
            meetingTime: meetingTime,
            location: location,
            suggestedPrice: suggestedPrice,
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
            meetingTime: meetingTime,
            location: location,
            suggestedPrice: suggestedPrice,
          },
        }
      );

      return NextResponse.json(
        { message: 'Deal completed successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error updating database:', error);
      return NextResponse.json(
        { message: 'Failed to update database' },
        { status: 500 }
      );
    }
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