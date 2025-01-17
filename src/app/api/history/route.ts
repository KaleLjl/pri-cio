import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { uploadToS3 } from '@/lib/s3';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");
    const histories = await db.collection("histories")
      .find({ userEmail: session.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(histories);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch histories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { price, description, imageUrl, currency } = await request.json();
    
    // 1. 先上传图片到 S3
    const fileName = `history-${session.user.email}-${Date.now()}.jpg`;
    const s3ImageUrl = await uploadToS3(imageUrl, fileName);
    
    const client = await clientPromise;
    const db = client.db("pri-cio");
    
    // 2. 保存 S3 URL 到数据库
    const result = await db.collection("histories").insertOne({
      price,
      description,
      userEmail: session.user.email,
      imageUrl: s3ImageUrl,  // 使用 S3 URL
      currency,
      createdAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      id: result.insertedId,
      imageUrl: s3ImageUrl 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to database' },
      { status: 500 }
    );
  }
}