import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { uploadToS3, deleteFromS3 } from '@/lib/s3';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
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

export async function POST(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 如果 slug 长度为 0，说明是根路径 /api/history
    if (params.slug.length === 0) {
      const { price, description, selectedImage } = await request.json();
      
      // 生成唯一的文件名
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      // 上传图片到 S3
      const imageUrl = await uploadToS3(selectedImage, fileName);
      
      const client = await clientPromise;
      const db = client.db("pri-cio");
      
      // 保存记录到 MongoDB
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
    }

    return NextResponse.json({ error: 'Invalid route' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to database' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> | { slug: string[] } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const historyId = resolvedParams.slug[0];
    
    if (!historyId) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");
    
    // 先获取记录以获取图片 URL
    const history = await db.collection("histories").findOne({
      _id: new ObjectId(historyId),
      userEmail: session.user.email
    });

    if (!history) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }

    // 删除 S3 中的图片
    await deleteFromS3(history.imageUrl);

    // 删除 MongoDB 中的记录
    await db.collection("histories").deleteOne({
      _id: new ObjectId(historyId),
      userEmail: session.user.email
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete history' },
      { status: 500 }
    );
  }
}