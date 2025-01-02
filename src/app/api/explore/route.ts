import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import axios from 'axios';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { price, description, imageUrl, userEmail, location } = body;

    if (!price || !description || !imageUrl || !userEmail) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Perform geocoding if location exists
    let enrichedLocation = null;

    if (location) {
      const { latitude, longitude } = location;
      try {
        const geocodeResponse = await axios.get(
          'https://api.opencagedata.com/geocode/v1/json',
          {
            params: {
              key: process.env.OPENCAGE_API_KEY, // Your OpenCage API Key
              q: `${latitude},${longitude}`,
            },
          }
        );

        const geocodeData = geocodeResponse.data.results[0];
        enrichedLocation = {
          latitude,
          longitude,
          city: geocodeData?.components?.city || geocodeData?.components?.town || 'Unknown City',
          country: geocodeData?.components?.country || 'Unknown Country',
        };
      } catch (geocodeError) {
        console.error('Geocoding failed:', geocodeError);
        enrichedLocation = { latitude, longitude, city: 'Unknown City', country: 'Unknown Country' };
      }
    }

    const client = await clientPromise;
    const db = client.db('pri-cio'); 

    const newPost = {
      price,
      description,
      imageUrl,
      userEmail,
      location: enrichedLocation || null,
      createdAt: new Date(),
    };

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
