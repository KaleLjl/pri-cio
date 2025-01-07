import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

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
  
      // Update user profiles for all posts
      const updatedPosts = await Promise.all(posts.map(async (post) => {
        const userProfile = await db.collection('users').findOne(
          { email: post.userEmail },
          { projection: { name: 1, avatarUrl: 1 } }
        );
  
        return {
          ...post,
          userProfile: userProfile ? {
            name: userProfile.name,
            avatarUrl: userProfile.avatarUrl
          } : undefined
        };
      }));
  
      return NextResponse.json(updatedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ message: 'Failed to fetch posts' }, { status: 500 });
    }
}
