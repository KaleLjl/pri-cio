import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { uploadToS3 } from '@/lib/s3';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { price, description, selectedImage } = await request.json();
    
    // 生成唯一的文件名
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    // 上传图片到 S3
    const imageUrl = await uploadToS3(selectedImage, fileName);
    
    const client = await clientPromise;
    const db = client.db("pri-cio");
    
    // 保存记录到 MongoDB，包括图片 URL
    const result = await db.collection("histories").insertOne({
      price,
      description,
      userEmail: session.user.email,
      imageUrl,
      createdAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      id: result.insertedId,
      imageUrl 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to database' },
      { status: 500 }
    );
  }
}