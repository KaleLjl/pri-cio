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

    const { price, description, images, currency } = await request.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    // 上传所有图片到 S3
    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        if (!image.url) {
          throw new Error('Image URL is required for each image');
        }
        const fileName = `history-${session.user?.email || 'unknown'}-${Date.now()}-${image.id}.jpg`;
        const s3ImageUrl = await uploadToS3(image.url, fileName);
        return {
          ...image,
          url: s3ImageUrl
        };
      })
    );
    
    const client = await clientPromise;
    const db = client.db("pri-cio");
    
    // 保存记录到数据库
    const result = await db.collection("histories").insertOne({
      price,
      description,
      userEmail: session.user.email,
      images: uploadedImages,
      currency,
      createdAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      _id: result.insertedId,
      images: uploadedImages
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to database' },
      { status: 500 }
    );
  }
}