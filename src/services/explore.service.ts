import clientPromise from "@/lib/mongodb";
import { Collection, Db, Filter, ObjectId } from "mongodb";
import axios from "axios";
import { ExploreItem } from "@/lib/types/explore";
import { HistoryItem } from "@/lib/types/history";
import { UserProfile } from "@/lib/types/user";

// --- Interfaces for Service Methods ---

interface GetExploreItemsParams {
  search?: string;
  userId?: string;
}

interface PublishItemData {
  price: number; // Keep as number for input, convert later
  description: string;
  images: { id: string; url: string; isPrimary: boolean }[]; // Match ExploreItem type
  location?: { latitude: number; longitude: number };
  historyId: string;
  currency: string;
}

interface UnpublishItemParams {
  historyId: string;
  exploreId: string;
  // userEmail: string; // Removed - not used currently
}

// --- Service Class ---

export class ExploreService {
  private client!: Awaited<typeof clientPromise>; // Definite assignment assertion
  private db!: Db; // Definite assignment assertion
  private exploreCollection!: Collection<ExploreItem>; // Definite assignment assertion
  private historiesCollection!: Collection<HistoryItem>; // Definite assignment assertion
  private usersCollection!: Collection<UserProfile>; // Definite assignment assertion

  constructor() {
    // Initialize client and db in an async method or ensure they are ready
    // For simplicity here, assuming they will be available when methods are called
    // A better approach might involve an async factory or initialization method
  }

  private async connectDb() {
    if (!this.client) {
      this.client = await clientPromise;
      this.db = this.client.db("pri-cio");
      this.exploreCollection = this.db.collection<ExploreItem>("explore");
      this.historiesCollection = this.db.collection<HistoryItem>("histories");
      this.usersCollection = this.db.collection<UserProfile>("users");
    }
  }

  /**
   * Fetches explore items, optionally filtering by search term or user ID.
   * Enriches items with basic user profile information.
   */
  async getExploreItems({
    search,
    userId,
  }: GetExploreItemsParams): Promise<ExploreItem[]> {
    await this.connectDb();

    const filter: Filter<ExploreItem> = {}; // Use Filter type
    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const posts = await this.exploreCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const updatedPosts = await Promise.all(
      posts.map(async (post) => {
        const userProfile = await this.usersCollection.findOne(
          { email: post.userEmail },
          { projection: { _id: 1, name: 1, avatarUrl: 1 } }
        );

        // Use inline type matching ExploreItem.userProfile
        const postUserProfile: ExploreItem["userProfile"] = userProfile
          ? {
              _id: userProfile._id.toString(),
              name: userProfile.name,
              // Handle potential null from DB query vs undefined in ExploreItem type
              avatarUrl: userProfile.avatarUrl ?? undefined,
            }
          : undefined;

        // If userId is provided, filter posts by user ID
        if (userId && postUserProfile?._id !== userId) {
          return null; // Mark for filtering out
        }

        return {
          ...post,
          _id: post._id, // Ensure _id is included
          userProfile: postUserProfile,
        };
      })
    );

    // Filter out null values (posts not matching the userId filter)
    return updatedPosts.filter((post) => post !== null) as ExploreItem[];
  }

  /**
   * Publishes a new item to the explore feed.
   * Validates input, performs geocoding, checks for duplicates,
   * creates the explore record, and updates the corresponding history record.
   */
  async publishItem(
    data: PublishItemData,
    userEmail: string
  ): Promise<ExploreItem> {
    await this.connectDb();

    const { price, description, images, location, historyId, currency } = data;

    // Basic Validation (can be expanded)
    if (
      price === undefined || // Check for undefined specifically for price number
      !description ||
      !images ||
      images.length === 0 ||
      !historyId ||
      !currency
    ) {
      throw new Error("Missing required fields for publishing.");
    }
    if (!ObjectId.isValid(historyId)) {
      throw new Error("Invalid history ID format.");
    }

    // 1. Geocode Location (if provided)
    // Use inline type matching ExploreItem.location
    let enrichedLocation: ExploreItem["location"] = undefined;
    if (location) {
      try {
        const geocodeResponse = await axios.get(
          "https://api.opencagedata.com/geocode/v1/json",
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
          city:
            geocodeData?.components?.city ||
            geocodeData?.components?.town ||
            "Unknown City",
          country: geocodeData?.components?.country || "Unknown Country",
        };
      } catch (geocodeError) {
        console.error("Geocoding failed:", geocodeError);
        // Fallback: Use original lat/lon without city/country
        enrichedLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          // city and country will be undefined
        };
      }
    }

    // 2. Get User Profile
    const userProfile = await this.usersCollection.findOne(
      { email: userEmail },
      { projection: { _id: 1, name: 1, avatarUrl: 1 } }
    );
    // Use inline type matching ExploreItem.userProfile
    const postUserProfile: ExploreItem["userProfile"] = userProfile
      ? {
          _id: userProfile._id.toString(),
          name: userProfile.name,
          // Handle potential null from DB query vs undefined in ExploreItem type
          avatarUrl: userProfile.avatarUrl ?? undefined,
        }
      : undefined;

    // 3. Check if History Item is Already Published
    // Query by ObjectId, casting the field in the filter due to type mismatch (HistoryItem._id is string)
    const existingHistory = await this.historiesCollection.findOne({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: new ObjectId(historyId) as any, // Cast filter field
      exploreId: { $exists: true }, // Check only if exploreId exists
    });

    if (existingHistory) {
      throw new Error("This item has already been published.");
    }

    // 4. Create New Publication Record
    const newPublicationData: Omit<ExploreItem, "_id"> = {
      price: String(price), // Convert price to string
      description,
      images, // Already matches the target type { id: string; url: string; isPrimary: boolean }[]
      userEmail: userEmail,
      userProfile: postUserProfile,
      location: enrichedLocation, // Matches target type ExploreItem['location']
      createdAt: new Date().toISOString(), // Convert date to ISO string
      historyId: historyId,
      currency,
    };

    const result = await this.exploreCollection.insertOne(
      newPublicationData as ExploreItem
    );

    // 5. Update History Record with exploreId
    // Query by ObjectId, casting the field in the filter due to type mismatch
    const updateResult = await this.historiesCollection.updateOne(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _id: new ObjectId(historyId) as any }, // Cast filter field
      { $set: { exploreId: result.insertedId.toString() } }
    );

    if (updateResult.matchedCount === 0) {
      // Rollback or handle error: History item not found, but explore item was created
      // Ensure querying by ObjectId for rollback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.exploreCollection.deleteOne({ _id: result.insertedId as any }); // Cast filter field
      throw new Error(`History item with ID ${historyId} not found.`);
    }

    // Return the newly created explore item
    return {
      ...newPublicationData,
      _id: result.insertedId,
    };
  }

  /**
   * Unpublishes an item from the explore feed.
   * Deletes the explore record and removes the exploreId from the history record.
   */
  async unpublishItem({
    historyId,
    exploreId,
  }: // userEmail, // Removed
  UnpublishItemParams): Promise<void> {
    await this.connectDb();

    if (!ObjectId.isValid(historyId) || !ObjectId.isValid(exploreId)) {
      throw new Error("Invalid history or explore ID format.");
    }

    // Optional: Add check to ensure the userEmail matches the item owner before deleting

    // 1. Delete from explore collection
    // Ensure querying by ObjectId, casting the field in the filter due to type mismatch
    const deleteResult = await this.exploreCollection.deleteOne({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: new ObjectId(exploreId) as any, // Cast filter field
    });

    if (deleteResult.deletedCount === 0) {
      // Explore item might have already been deleted, proceed to update history or throw error
      console.warn(`Explore item with ID ${exploreId} not found for deletion.`);
      // Depending on desired behavior, you might still want to ensure history is updated
    }

    // 2. Update history record to remove exploreId
    // Ensure querying by ObjectId, casting the field in the filter due to type mismatch
    const updateResult = await this.historiesCollection.updateOne(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _id: new ObjectId(historyId) as any }, // Cast filter field
      { $unset: { exploreId: "" } }
    );

    if (updateResult.matchedCount === 0) {
      // This case might indicate an inconsistency if the explore item existed
      console.warn(
        `History item with ID ${historyId} not found for unsetting exploreId.`
      );
    }
  }
}
