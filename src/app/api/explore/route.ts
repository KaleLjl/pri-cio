import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// export async function GET() {
//     try {
//       const client = await clientPromise;
//       const db = client.db('pri-cio');
  
//       const posts = await db.collection('explore').find({}).sort({ createdAt: -1 }).toArray();
  
//       return NextResponse.json(posts);
//     } catch (error) {
//       console.error('Error fetching explore posts:', error);
//       return NextResponse.json({ message: 'Failed to fetch explore posts' }, { status: 500 });
//     }
// }

// ********************************************************************************************************
export async function GET(req: Request) {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
  
    try {
      const client = await clientPromise;
      const db = client.db('pri-cio'); // Replace with your database name
  
      const filter = search
        ? { description: { $regex: search, $options: 'i' } } // Case-insensitive search
        : {}; // Fetch all posts if no query
  
      const posts = await db.collection('explore').find(filter).sort({ createdAt: -1 }).toArray();
  
      return NextResponse.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ message: 'Failed to fetch posts' }, { status: 500 });
    }
}
// ********************************************************************************************************  
  

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { price, description, imageUrl, userEmail } = body;

    if (!price || !description || !imageUrl || !userEmail) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio'); // Replace with your database name

    const newPost = { price, description, imageUrl, userEmail, createdAt: new Date() };
    const result = await db.collection('explore').insertOne(newPost);

    return NextResponse.json({ ...newPost, _id: result.insertedId });
  } catch (error) {
    console.error('Error posting to explore:', error);
    return NextResponse.json({ message: 'Failed to post to explore' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const exploreId = url.pathname.split('/').pop(); // Get the ID from the URL

    if (!exploreId) {
      return NextResponse.json({ message: 'Missing explore ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio'); // Replace with your database name

    const result = await db.collection('explore').deleteOne({ _id: new ObjectId(exploreId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Explore post not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Explore post deleted successfully' });
  } catch (error) {
    console.error('Error deleting explore post:', error);
    return NextResponse.json({ message: 'Failed to delete explore post' }, { status: 500 });
  }
}
