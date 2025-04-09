import clientPromise from "@/lib/mongodb";
import { DealCompletionData, DealingItem } from "@/lib/types/history";
import { ObjectId } from "mongodb"; // Remove unused Document import
import { customAlphabet } from "nanoid"; // Import nanoid

// Define a nanoid generator for 6-digit alphanumeric codes
const generateCode = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  6
);

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
            price: "$historyDetails.price",
            description: "$historyDetails.description",
            images: "$historyDetails.images", // Add images field
            userEmail: "$historyDetails.userEmail", // Add userEmail field
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
            completionCode: "$completionCode", // Fetch completion code from dealing doc
            // Note: otherPartyEmail logic might need adjustment if buyerEmail/sellerEmail aren't in dealing doc
            // Assuming buyerId/sellerId are sufficient for now
          },
        },
      ])
      .toArray();

    // Post-process: Generate completion code for buyer if needed
    const dealingCollection = db.collection("dealing");
    const processedItems = await Promise.all(
      // Remove explicit 'any' type, let TS infer from aggregation result
      dealingItems.map(async (item) => {
        // We will cast the final array to DealingItem[] later

        if (
          item.role === "buying" &&
          item.status === "pending" &&
          !item.completionCode
        ) {
          // Generate and update code in DB if missing
          const newCode = generateCode();
          const codeGeneratedAt = new Date();
          try {
            const updateResult = await dealingCollection.updateOne(
              {
                _id: new ObjectId(item.dealingId), // Use dealingId from item
                completionCode: { $exists: false }, // Prevent race condition
              },
              { $set: { completionCode: newCode, codeGeneratedAt } }
            );

            if (updateResult.modifiedCount > 0) {
              console.log(
                `[DealService] Auto-generated completion code for dealingId ${item.dealingId}`
              );
              item.completionCode = newCode; // Add generated code directly to the item object
            } else {
              // Code might have been generated concurrently, fetch again
              const updatedDeal = await dealingCollection.findOne({
                _id: new ObjectId(item.dealingId),
              });
              // Use existing or undefined
              item.completionCode = updatedDeal?.completionCode || undefined;
            }
          } catch (updateError) {
            console.error(
              `[DealService] Error auto-generating code for dealingId ${item.dealingId}:`,
              updateError
            );
            // Proceed without the code for this item in case of error
            item.completionCode = undefined;
          }
        }
        return item; // Return the potentially modified item
      })
    );

    // The aggregation pipeline already projects the fields needed for DealingItem
    return processedItems as DealingItem[];
  } catch (error) {
    console.error(
      `[DealService] Error fetching dealing items for user ${userId}:`,
      error
    );
    throw new Error("Failed to fetch dealing items.");
  }
}

/**
 * Generates a unique completion code for a pending deal if one doesn't exist.
 * Only the buyer associated with the deal can trigger this.
 * @param dealingId - The ID of the dealing record.
 * @param userId - The ID of the user attempting to generate the code (must be the buyer).
 * @returns The generated (or existing) completion code.
 * @throws Error if validation fails or update fails.
 */
export async function generateCompletionCode(
  dealingId: string,
  userId: string
): Promise<string> {
  if (!ObjectId.isValid(dealingId)) {
    throw new Error("Invalid dealing ID format.");
  }

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const dealingCollection = db.collection("dealing");

    const deal = await dealingCollection.findOne({
      _id: new ObjectId(dealingId),
    });

    if (!deal) {
      throw new Error("Dealing item not found.");
    }
    if (deal.status !== "pending") {
      throw new Error("Deal is not in pending status.");
    }
    if (deal.buyerId !== userId) {
      throw new Error("Only the buyer can generate the completion code.");
    }

    // If code already exists, return it
    if (deal.completionCode) {
      console.log(
        `[DealService] Completion code already exists for dealingId ${dealingId}.`
      );
      return deal.completionCode;
    }

    // Generate a new code
    const newCode = generateCode();
    const codeGeneratedAt = new Date();

    const result = await dealingCollection.updateOne(
      { _id: new ObjectId(dealingId), completionCode: { $exists: false } }, // Ensure code doesn't exist to prevent race conditions
      { $set: { completionCode: newCode, codeGeneratedAt } }
    );

    if (result.modifiedCount === 0) {
      // Could happen if another request generated the code just before this one
      const updatedDeal = await dealingCollection.findOne({
        _id: new ObjectId(dealingId),
      });
      if (updatedDeal?.completionCode) {
        console.log(
          `[DealService] Code generated by concurrent request for dealingId ${dealingId}.`
        );
        return updatedDeal.completionCode;
      }
      throw new Error("Failed to generate or retrieve completion code.");
    }

    console.log(
      `[DealService] Generated completion code for dealingId ${dealingId}.`
    );
    return newCode;
  } catch (error) {
    console.error(
      `[DealService] Error generating completion code for dealingId ${dealingId}:`,
      error
    );
    if (error instanceof Error) {
      throw error; // Re-throw specific known errors
    }
    throw new Error("Failed to generate completion code.");
  }
}

/**
 * Verifies the completion code provided by the seller and completes the deal if valid.
 * Only the seller associated with the deal can trigger this.
 * @param dealingId - The ID of the dealing record.
 * @param enteredCode - The code entered by the seller.
 * @param userId - The ID of the user attempting verification (must be the seller).
 * @throws Error if validation fails or completion fails.
 */
export async function verifyAndCompleteDeal(
  dealingId: string,
  enteredCode: string,
  userId: string
): Promise<void> {
  if (!ObjectId.isValid(dealingId)) {
    throw new Error("Invalid dealing ID format.");
  }
  if (!enteredCode || typeof enteredCode !== "string") {
    throw new Error("Invalid code provided.");
  }

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const dealingCollection = db.collection("dealing");
    const historiesCollection = db.collection("histories");

    const deal = await dealingCollection.findOne({
      _id: new ObjectId(dealingId),
    });

    if (!deal) {
      throw new Error("Dealing item not found.");
    }
    if (deal.status !== "pending") {
      throw new Error("Deal is not in pending status.");
    }
    if (deal.sellerId !== userId) {
      throw new Error("Only the seller can verify the completion code.");
    }
    if (!deal.completionCode) {
      throw new Error("Completion code has not been generated for this deal.");
    }
    if (deal.completionCode !== enteredCode) {
      throw new Error("Invalid completion code.");
    }

    // Code is valid, proceed to complete the deal
    console.log(
      `[DealService] Completion code verified for dealingId ${dealingId}. Completing deal...`
    );

    // Fetch history item to get necessary details for completeDeal
    const historyItem = await historiesCollection.findOne({
      _id: new ObjectId(deal.historyId),
    });

    if (!historyItem) {
      throw new Error(
        `Associated history item (ID: ${deal.historyId}) not found.`
      );
    }
    if (!historyItem.exploreId) {
      // Should ideally not happen if it's in dealing state, but check anyway
      throw new Error(
        `Associated history item (ID: ${deal.historyId}) is not published (missing exploreId).`
      );
    }

    // Prepare data for the existing completeDeal function
    const dealCompletionData: DealCompletionData = {
      historyId: deal.historyId,
      exploreId: historyItem.exploreId.toString(), // Ensure exploreId is a string
      buyerId: deal.buyerId,
      sellerId: deal.sellerId,
      // Use details from history item if available, otherwise use placeholders or throw error?
      // For now, let's assume these might be null/undefined if not set during chat
      meetingTime: historyItem.meetingTime || "Not specified",
      location: historyItem.location || "Not specified", // Assuming location field exists on history
      suggestedPrice: historyItem.suggestedPrice || historyItem.price, // Use suggestedPrice or original price
    };

    // Call the existing function to update all collections
    await completeDeal(dealCompletionData);

    console.log(
      `[DealService] Successfully completed deal via code verification for dealingId ${dealingId}.`
    );
  } catch (error) {
    console.error(
      `[DealService] Error verifying code or completing deal for dealingId ${dealingId}:`,
      error
    );
    if (error instanceof Error) {
      throw error; // Re-throw specific known errors
    }
    throw new Error("Failed to verify code and complete deal.");
  }
}
