import clientPromise from "@/lib/mongodb";
import { DealCompletionData, DealingItem } from "@/lib/types/history"; // Import types
import { ObjectId } from "mongodb";

/**
 * Completes a deal by updating relevant database collections.
 * @param dealData - The data required to complete the deal.
 */
export async function completeDeal(
  dealData: DealCompletionData
): Promise<void> {
  const {
    historyId,
    exploreId,
    buyerId,
    sellerId,
    meetingTime,
    location,
    suggestedPrice,
  } = dealData;

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");

    const historiesCollection = db.collection("histories");
    const exploreCollection = db.collection("explore");
    const dealingCollection = db.collection("dealing");

    // Use Promise.all to run updates concurrently for efficiency
    await Promise.all([
      // Update the history item with deal information
      historiesCollection.updateOne(
        { _id: new ObjectId(historyId) },
        {
          $set: {
            dealCompleted: true,
            buyerId: new ObjectId(buyerId),
            sellerId: new ObjectId(sellerId),
            meetingTime: meetingTime,
            location: location,
            suggestedPrice: suggestedPrice,
            dealCompletedAt: new Date(),
          },
        }
      ),
      // Update the explore item to mark it as sold
      exploreCollection.updateOne(
        { _id: new ObjectId(exploreId) },
        {
          $set: {
            isSold: true,
            soldTo: new ObjectId(buyerId),
            soldAt: new Date(),
            meetingTime: meetingTime,
            location: location,
            suggestedPrice: suggestedPrice,
          },
        }
      ),
      // Update the dealing item status
      dealingCollection.updateOne(
        { historyId: historyId.toString() }, // Match based on historyId string
        { $set: { status: "completed", updatedAt: new Date() } }
      ),
    ]);

    console.log(
      `[DealService] Successfully completed deal for historyId: ${historyId}`
    );
  } catch (error) {
    console.error(
      `[DealService] Error completing deal for historyId ${historyId}:`,
      error
    );
    // Re-throw the error so the API route can handle it
    throw new Error("Failed to update database during deal completion.");
  }
}

/**
 * Updates the status of a specific dealing item.
 * @param dealingId - The ID of the dealing record to update.
 * @param status - The new status ('completed' or 'cancelled').
 * @returns A promise that resolves when the update is complete.
 * @throws Error if the dealing item is not found or the update fails.
 */
export async function updateDealingStatus(
  dealingId: string,
  status: "completed" | "cancelled"
): Promise<void> {
  if (!ObjectId.isValid(dealingId)) {
    throw new Error("Invalid dealing ID format.");
  }
  if (!status || !["completed", "cancelled"].includes(status)) {
    throw new Error("Invalid status provided.");
  }

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const dealingCollection = db.collection("dealing");

    const result = await dealingCollection.updateOne(
      { _id: new ObjectId(dealingId) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error("Dealing item not found.");
    }
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      // This might happen if the status was already set to the target value
      console.log(
        `[DealService] Dealing item ${dealingId} status already set to ${status}.`
      );
    } else {
      console.log(
        `[DealService] Updated status for dealingId ${dealingId} to ${status}.`
      );
    }
  } catch (error) {
    console.error(
      `[DealService] Error updating status for dealingId ${dealingId}:`,
      error
    );
    if (error instanceof Error && error.message === "Dealing item not found.") {
      throw error; // Re-throw specific known errors
    }
    throw new Error("Failed to update dealing status.");
  }
}

/**
 * Fetches dealing items for a specific user, joining history details.
 * @param userId - The ID of the user whose dealing items are to be fetched.
 * @param userEmail - The email of the user (used for determining role).
 * @returns A promise that resolves to an array of DealingItem objects.
 */
export async function getDealingItemsForUser(
  userId: string,
  userEmail: string
): Promise<DealingItem[]> {
  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");

    // Find all dealing items where user is either buyer or seller
    const dealingItems = await db
      .collection("dealing")
      .aggregate([
        {
          $match: {
            $or: [
              { buyerId: userId }, // Match directly with provided userId string
              { sellerId: userId }, // Match directly with provided userId string
            ],
          },
        },
        {
          $lookup: {
            from: "histories",
            let: { historyIdString: "$historyId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", { $toObjectId: "$$historyIdString" }],
                  },
                },
              },
            ],
            as: "historyDetails",
          },
        },
        {
          $unwind: "$historyDetails",
        },
        {
          $addFields: {
            // Use the provided userEmail for role determination
            isSeller: {
              $eq: ["$historyDetails.userEmail", userEmail],
            },
          },
        },
        {
          $project: {
            _id: "$historyDetails._id", // Use history item's _id
            imageUrl: {
              // Extract first image URL
              $ifNull: [
                { $arrayElemAt: ["$historyDetails.images.url", 0] },
                null,
              ],
            },
            price: "$historyDetails.price", // Use 'price' field
            description: "$historyDetails.description",
            createdAt: "$historyDetails.createdAt",
            currency: "$historyDetails.currency",
            dealingId: { $toString: "$_id" }, // dealing document's _id
            status: 1, // from dealing document
            role: {
              // Determined by isSeller field
              $cond: {
                if: "$isSeller",
                then: "selling",
                else: "buying",
              },
            },
            buyerId: 1, // from dealing document
            sellerId: 1, // from dealing document
            // Add final deal details from historyDetails
            meetingTime: "$historyDetails.meetingTime", // Final meeting time
            finalLocation: "$historyDetails.location", // Final location (use different name to avoid conflict)
            finalPrice: "$historyDetails.suggestedPrice", // Final agreed price
            // Note: otherPartyEmail logic might need adjustment if buyerEmail/sellerEmail aren't in dealing doc
            // Assuming buyerId/sellerId are sufficient for now
          },
        },
      ])
      .toArray();

    // Map to ensure correct type casting, although aggregation should handle most
    // The aggregation pipeline already projects the fields needed for DealingItem
    return dealingItems as DealingItem[];
  } catch (error) {
    console.error(
      `[DealService] Error fetching dealing items for user ${userId}:`,
      error
    );
    throw new Error("Failed to fetch dealing items.");
  }
}
