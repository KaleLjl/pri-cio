import { NextResponse } from "next/server";
// Removed duplicate import
import clientPromise from "@/lib/mongodb"; // Keep for user check
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
// Import ALL service functions
import {
  completeDeal,
  getDealingItemsForUser,
  updateDealingStatus,
} from "@/services/deal.service";
import { DealCompletionData } from "@/lib/types/history"; // Import the type

// Validation logic
const priceValidation = {
  isValidFormat: (price: string): boolean => {
    return /^\d+(\.\d{0,2})?$/.test(price);
  },

  isPositive: (price: string): boolean => {
    const numericPrice = parseFloat(price);
    return numericPrice > 0;
  },

  validate: (price: string): { isValid: boolean; error?: string } => {
    if (!price) {
      return { isValid: false, error: "Price is required" };
    }
    if (!priceValidation.isValidFormat(price)) {
      return {
        isValid: false,
        error:
          "Invalid price format. Price must be a number with at most 2 decimal places.",
      };
    }
    if (!priceValidation.isPositive(price)) {
      return { isValid: false, error: "Price must be greater than 0" };
    }
    return { isValid: true };
  },
};

const meetingValidation = {
  isValidTime: (time: string): boolean => {
    if (!time) return false;
    const meetingDate = new Date(time);
    const now = new Date();
    return meetingDate > now;
  },

  isValidLocation: (location: string): boolean => {
    return Boolean(location && location.trim().length > 0);
  },

  validate: (data: {
    meetingTime: string;
    location: string;
  }): { isValid: boolean; error?: string } => {
    if (!data.meetingTime) {
      return { isValid: false, error: "Meeting time is required" };
    }
    if (!meetingValidation.isValidTime(data.meetingTime)) {
      return { isValid: false, error: "Meeting time must be in the future" };
    }
    if (!meetingValidation.isValidLocation(data.location)) {
      return { isValid: false, error: "Location is required" };
    }
    return { isValid: true };
  },
};

export async function GET(_req: Request) {
  // Prefix req with underscore
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pri-cio");

    // Get user's ID from users collection
    const user = await db
      .collection("users")
      // Need user's ID and email for the service function
      .findOne(
        { email: session.user.email },
        { projection: { _id: 1, email: 1 } }
      );
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Call the service function to get dealing items
    const dealingItems = await getDealingItemsForUser(
      user._id.toString(),
      user.email
    );

    return NextResponse.json(dealingItems);
  } catch (error) {
    // Log error from service or other issues
    console.error("Error fetching dealing items via service:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch dealing items",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      historyId,
      exploreId,
      buyerId,
      sellerId,
      meetingTime,
      location,
      suggestedPrice,
    } = await request.json();

    console.log(`[POST /api/chat/deal] Received historyId: ${historyId}`); // ADD LOGGING

    // Validate IDs
    if (
      !ObjectId.isValid(historyId) ||
      !ObjectId.isValid(exploreId) ||
      !ObjectId.isValid(buyerId) ||
      !ObjectId.isValid(sellerId)
    ) {
      return NextResponse.json(
        { message: "Invalid ID format" },
        { status: 400 }
      );
    }

    // Validate price
    const priceValidationResult = priceValidation.validate(suggestedPrice);
    if (!priceValidationResult.isValid) {
      return NextResponse.json(
        { message: priceValidationResult.error },
        { status: 400 }
      );
    }

    // Validate meeting details
    const meetingValidationResult = meetingValidation.validate({
      meetingTime,
      location,
    });
    if (!meetingValidationResult.isValid) {
      return NextResponse.json(
        { message: meetingValidationResult.error },
        { status: 400 }
      );
    }

    // Make sure both parties are involved in this deal
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { _id: 1 } });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const currentUserId = user._id.toString();
    const buyerIdStr = buyerId.toString();
    const sellerIdStr = sellerId.toString();

    if (currentUserId !== buyerIdStr && currentUserId !== sellerIdStr) {
      return NextResponse.json(
        { message: "You are not authorized to complete this deal" },
        { status: 403 }
      );
    }

    const historiesCollection = db.collection("histories");
    const exploreCollection = db.collection("explore");

    // Check if historyId and exploreId exist
    let historyItem = await historiesCollection.findOne({
      _id: new ObjectId(historyId),
    });

    // If not found, try to find by other fields
    if (!historyItem) {
      const alternativeHistoryItem = await historiesCollection.findOne({
        $or: [
          { _id: new ObjectId(historyId) },
          { historyId: historyId },
          { "content.historyId": historyId },
        ],
      });

      if (alternativeHistoryItem) {
        historyItem = alternativeHistoryItem;
      }
    }

    const exploreItem = await exploreCollection.findOne({
      _id: new ObjectId(exploreId),
      isSold: { $ne: true },
    });

    if (!historyItem) {
      return NextResponse.json(
        { message: "History item not found" },
        { status: 404 }
      );
    }

    if (!exploreItem) {
      return NextResponse.json(
        { message: "Explore item not found or already sold" },
        { status: 404 }
      );
    }

    // Prepare data for the service function
    const dealData: DealCompletionData = {
      historyId,
      exploreId,
      buyerId,
      sellerId,
      meetingTime,
      location,
      suggestedPrice,
    };

    try {
      // Call the service function to handle database updates
      await completeDeal(dealData);

      // Return success response
      return NextResponse.json(
        { message: "Deal completed successfully" },
        { status: 200 }
      );
    } catch (error) {
      // Log the error from the service or other issues
      console.error("Error completing deal via service:", error);
      // Return a generic error response
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Failed to complete deal",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch errors from auth, JSON parsing, validation etc.
    console.error("Error in POST /api/chat/deal handler:", error);
    return NextResponse.json(
      { message: "Failed to complete deal" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dealingId = url.pathname.split("/").pop();

    if (!dealingId) {
      return NextResponse.json(
        { message: "Dealing ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["completed", "cancelled"].includes(status)) {
      // Validate status type more strictly for the service function
      if (status !== "completed" && status !== "cancelled") {
        return NextResponse.json(
          { message: "Invalid status value" },
          { status: 400 }
        );
      }
    }

    // Call the service function to update the status
    await updateDealingStatus(dealingId, status);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error from service or other issues
    console.error("Error updating dealing status via service:", error);
    // Return specific error messages if available from the service
    if (
      error instanceof Error &&
      (error.message === "Invalid dealing ID format." ||
        error.message === "Invalid status provided." ||
        error.message === "Dealing item not found.")
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 }); // Or 404 for not found
    }
    return NextResponse.json(
      {
        message: "Failed to update dealing status",
        error: error instanceof Error ? error.message : "Unknown error", // Keep original fallback
      },
      { status: 500 }
    );
  }
}
