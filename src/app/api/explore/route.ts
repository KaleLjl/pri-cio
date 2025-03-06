import { NextResponse } from 'next/server';
import clientPromise from '@/lib/utils/mongodb';
import { auth } from '@/lib/utils/auth';
import axios from 'axios';
import { ObjectId } from 'mongodb';


export async function GET(req: Request) {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const userId = url.searchParams.get('userId');
  
    try {
      const client = await clientPromise;
      const db = client.db('pri-cio');
  
      let filter: any = {};
      
      // 添加搜索条件
      if (search) {
        filter.description = { $regex: search, $options: 'i' };
      }

      // 获取所有帖子
      const posts = await db.collection('explore').find(filter).sort({ createdAt: -1 }).toArray();
  
      // Update user profiles for all posts
      const updatedPosts = await Promise.all(posts.map(async (post) => {
        const userProfile = await db.collection('users').findOne(
          { email: post.userEmail },
          { projection: { _id: 1, name: 1, avatarUrl: 1 } }
        );
  
        // 如果提供了 userId，只返回匹配的帖子
        if (userId && userProfile?._id.toString() !== userId) {
          return null;
        }

        return {
          ...post,
          userProfile: userProfile ? {
            _id: userProfile._id.toString(),
            name: userProfile.name,
            avatarUrl: userProfile.avatarUrl
          } : undefined
        };
      }));
  
      // 过滤掉 null 值（不匹配 userId 的帖子）
      const filteredPosts = updatedPosts.filter(post => post !== null);
  
      return NextResponse.json(filteredPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ message: 'Failed to fetch posts' }, { status: 500 });
    }
}
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { price, description, images, location, historyId, currency } = body;

    // 添加详细的验证
    const validationErrors = [];
    if (!price) validationErrors.push('Price is required');
    if (!description) validationErrors.push('Description is required');
    if (!images || !Array.isArray(images) || images.length === 0) validationErrors.push('At least one image is required');
    if (!historyId) validationErrors.push('History ID is required');
    if (!currency) validationErrors.push('Currency is required'); 

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        message: 'Missing required fields', 
        errors: validationErrors,
        receivedData: { price, description, images, historyId }
      }, { status: 400 });
    }

    // 验证 historyId 是否为有效的 ObjectId
    if (!ObjectId.isValid(historyId)) {
      return NextResponse.json({ 
        message: 'Invalid history ID format',
        receivedId: historyId
      }, { status: 400 });
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
      images,
      userEmail: session.user.email,
      userProfile: userProfile ? {
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl
      } : undefined,
      location: enrichedLocation,
      createdAt: new Date(),
      historyId: historyId, // 存储原始的 history ID
      currency
    };

    const result = await db.collection('explore').insertOne(newPublication);

    // 更新 history 记录
    await db.collection('histories').updateOne(
      { _id: new ObjectId(historyId) },
      { 
        $set: { 
          exploreId: result.insertedId.toString() 
        } 
      }
    );

    return NextResponse.json({ 
      ...newPublication, 
      _id: result.insertedId,
      publishedId: result.insertedId.toString() 
    });
  } catch (error) {
    console.error('Error in publish API:', error);
    return NextResponse.json(
      { 
        message: 'Failed to publish item', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const historyId = searchParams.get('historyId');
    const exploreId = searchParams.get('exploreId');

    if (!historyId || !exploreId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');

    // Delete from explore collection
    await db.collection('explore').deleteOne({ _id: new ObjectId(exploreId) });

    // Update history record to remove exploreId
    await db.collection('histories').updateOne(
      { _id: new ObjectId(historyId) },
      { $unset: { exploreId: "" } }
    );

    return NextResponse.json({ message: 'Successfully unpublished' });
  } catch (error) {
    console.error('Error in unpublish API:', error);
    return NextResponse.json(
      { message: 'Failed to unpublish item' },
      { status: 500 }
    );
  }
}
