import { NextResponse } from "next/server";
import clientPromise from "@/lib/utils/mongodb";
import { uploadToS3, deleteFromS3 } from '@/lib/utils/s3';
import { auth } from '@/lib/utils/auth';
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const profiles = await db.collection("users").find({}).sort({ updatedAt: -1 }).toArray();

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ message: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, about, website, avatar, currentAvatarUrl, updatedAt } = body;

    if (!email || !name) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    // 检查用户是否存在
    const existingUser = await db.collection("users").findOne({ email });
    
    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    let newAvatarUrl = currentAvatarUrl;
    
    // 如果有新头像，上传到 S3
    if (avatar) {
      const fileName = `avatar-${email}-${Date.now()}.jpg`;
      try {
        console.log('Starting avatar upload to S3...');
        newAvatarUrl = await uploadToS3(avatar, fileName);
        console.log('Avatar uploaded successfully:', newAvatarUrl);
        
        // 如果上传成功且存在旧头像，删除旧头像
        if (currentAvatarUrl) {
          try {
            console.log('Deleting old avatar:', currentAvatarUrl);
            await deleteFromS3(currentAvatarUrl);
            console.log('Old avatar deleted successfully');
          } catch (error) {
            console.error("Error deleting old avatar:", error);
            // 继续执行，不要因为删除旧头像失败而中断整个流程
          }
        }
      } catch (error) {
        console.error("Error uploading avatar:", error);
        return NextResponse.json({ 
          message: "Failed to upload avatar",
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    const updatedProfile = {
      name,
      about: about || "",
      website: website || "",
      avatarUrl: newAvatarUrl || "",
      updatedAt: updatedAt || new Date(),
    };

    console.log('Updating profile in database:', updatedProfile);

    const result = await db.collection("users").updateOne(
      { email: email },
      { $set: updatedProfile }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
    }

    console.log('Profile updated successfully');

    return NextResponse.json({ 
      message: "Profile updated successfully",
      profile: updatedProfile 
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ 
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: "Missing user ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return NextResponse.json({ message: "Missing user ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const result = await db.collection("users").deleteOne({ _id: new ObjectId(userId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return NextResponse.json({ message: "Failed to delete profile" }, { status: 500 });
  }
}


