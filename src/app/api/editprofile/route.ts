import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { url } from "inspector";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("pri-cio"); // Replace with your database name

    // Fetch all profiles
    const profiles = await db.collection("users").find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ message: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, firstName, lastName, about, pronouns, website, username, avatar } = body;

    if (!email || !firstName || !lastName || !username) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    console.log("Received email:", email);

    const client = await clientPromise;
    const db = client.db("pri-cio");

    const updatedProfile = {
      firstName,
      lastName,
      about: about || "",
      pronouns: pronouns || "",
      website: website || "",
      username,
      avatar: avatar || "",
      updatedAt: new Date(),
    };

    const result = await db.collection("users").updateOne(
      { email: email },
      { $set: updatedProfile }
    );

    console.log("Update result:", result);
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
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
    const userId = url.pathname.split("/").pop(); // Get the ID from the URL

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


