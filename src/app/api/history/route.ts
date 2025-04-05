import { NextResponse } from "next/server";
// Remove clientPromise and uploadToS3 if no longer needed directly
// import clientPromise from "@/lib/mongodb";
// import { uploadToS3 } from "@/lib/s3";
import { auth } from "@/lib/auth";
// Import BOTH service functions
import {
  getHistoryForUser,
  createHistoryItem,
} from "@/services/history.service";
import { CreateHistoryData } from "@/lib/types/history"; // Import type

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the service function
    const histories = await getHistoryForUser(session.user.email);

    return NextResponse.json(histories);
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in GET /api/history:", error);
    return NextResponse.json(
      { error: "Failed to fetch histories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { price, description, images, currency } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }
    // Add explicit check for session.user before accessing it in map
    if (!session.user) {
      return NextResponse.json(
        { error: "Unauthorized - User data missing" },
        { status: 401 }
      );
    }

    // Prepare data for the service function
    const historyData: CreateHistoryData = {
      userEmail: session.user.email, // We know email exists from the check above
      price,
      description,
      images, // Pass raw image data (base64 URLs) to the service
      currency,
    };

    // Call the service function to handle S3 upload and DB insertion
    const createdItem = await createHistoryItem(historyData);

    // Return the result from the service (ID and S3 URLs)
    return NextResponse.json({
      success: true,
      _id: createdItem._id,
      images: createdItem.images,
    });
  } catch (error) {
    // Log error from service or other issues
    console.error("Error in POST /api/history:", error);
    return NextResponse.json(
      { error: "Failed to save to database" },
      { status: 500 }
    );
  }
}
