import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { deleteFromS3 } from '@/lib/s3';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const historyId = slug[0];
    
    if (!historyId) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const history = await db.collection("histories").findOne({
      _id: new ObjectId(historyId),
      userEmail: session.user.email
    });

    if (!history) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }

    await deleteFromS3(history.imageUrl);

    await db.collection("histories").deleteOne({
      _id: new ObjectId(historyId),
      userEmail: session.user.email
    });

    // Also delete the corresponding explore item
    await db.collection("explore").deleteOne({
      imageUrl: history.imageUrl, // Match the image URL to ensure the correct card is deleted
      userEmail: session.user.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}