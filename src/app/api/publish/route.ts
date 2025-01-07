import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import axios from 'axios';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { price, description, imageUrl, location, historyId } = body;

    if (!price || !description || !imageUrl) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // 如果有位置信息，进行地理编码
    let enrichedLocation = null;
    if (location) {
      try {
        const geocodeResponse = await axios.get(
          'https://api.opencagedata.com/geocode/v1/json',
          {
            params: {
              key: process.env.OPENCAGE_API_KEY,
              q: `${location.latitude},${location.longitude}`,
            },
          }
        );

        const geocodeData = geocodeResponse.data.results[0];
        enrichedLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          city: geocodeData?.components?.city || geocodeData?.components?.town || 'Unknown City',
          country: geocodeData?.components?.country || 'Unknown Country',
        };
      } catch (geocodeError) {
        console.error('Geocoding failed:', geocodeError);
        enrichedLocation = { 
          ...location, 
          city: 'Unknown City', 
          country: 'Unknown Country' 
        };
      }
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // 获取用户资料
    const userProfile = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { name: 1, avatarUrl: 1 } }
    );

    // 检查物品是否已经发布（使用 historyId 检查）
    const existingHistory = await db.collection('histories').findOne({
      _id: new ObjectId(historyId),
      publishedId: { $exists: true } // 检查是否已经有 publishedId
    });

    if (existingHistory?.publishedId) {
      return NextResponse.json(
        { message: 'This item has already been published' },
        { status: 400 }
      );
    }

    // 创建新的发布记录
    const newPublication = {
      price,
      description,
      imageUrl,
      userEmail: session.user.email,
      userProfile: userProfile ? {
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl
      } : undefined,
      location: enrichedLocation,
      createdAt: new Date(),
      historyId: historyId // 添加对应的 history ID
    };

    const result = await db.collection('explore').insertOne(newPublication);

    // 更新 history 记录，添加 publishedId
    await db.collection('histories').updateOne(
      { _id: new ObjectId(historyId) },
      { $set: { publishedId: result.insertedId.toString() } }
    );

    return NextResponse.json({ ...newPublication, _id: result.insertedId });
  } catch (error) {
    console.error('Error publishing item:', error);
    return NextResponse.json(
      { message: 'Failed to publish item' },
      { status: 500 }
    );
  }
}
