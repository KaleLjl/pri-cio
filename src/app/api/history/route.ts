import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { price, description, userEmail } = await request.json();
    
    const client = await clientPromise;
    const db = client.db("pri-cio");
    
    const result = await db.collection("histories").insertOne({
      price,
      description,
      userEmail,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('DB Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to database' },
      { status: 500 }
    );
  }
}