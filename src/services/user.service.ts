import {
  Collection,
  Db,
  MongoClient,
  // ModifyResult, // Removed unused import
  ObjectId,
} from "mongodb";
import clientPromise from "@/lib/mongodb"; // Default export is a promise
import { UserProfile } from "@/lib/types/user";
import { deleteFromS3, uploadToS3 } from "@/lib/s3"; // Correct function names
import { auth } from "@/lib/auth"; // Use the exported auth function for session

const USERS_COLLECTION = "users";

// Internal type representing the MongoDB document structure
interface UserProfileDocument
  extends Omit<UserProfile, "_id" | "createdAt" | "updatedAt"> {
  _id: ObjectId;
  password?: string; // Include password if it exists in the DB schema
  createdAt?: Date;
  updatedAt?: Date;
  emailVerified?: Date | null; // Add if used by NextAuth/Credentials
}

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export class UserService {
  private db: Db;
  // Use the internal document type for the collection
  private usersCollection: Collection<UserProfileDocument>;

  constructor(db: Db) {
    this.db = db;
    this.usersCollection =
      this.db.collection<UserProfileDocument>(USERS_COLLECTION);
  }

  // Helper to convert DB doc (or ModifyResult value) to UserProfile
  private mapDocumentToProfile(
    doc: UserProfileDocument | null // Simplified: Expect the document directly or null
  ): UserProfile | null {
    if (!doc) return null;

    // Document is directly passed now
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, password, ...rest } = doc; // Intentionally ignore password
    return {
      _id: _id.toString(), // Convert ObjectId to string
      ...rest,
      // createdAt and updatedAt are already Dates
    };
  }

  // Method to get the current logged-in user's profile
  async getCurrentUser(): Promise<UserProfile | null> {
    const session = await auth(); // Use auth() to get session
    if (!session?.user?.id) {
      console.error("UserService: No session or user ID found");
      return null;
    }
    try {
      const userId = new ObjectId(session.user.id);
      // Query using ObjectId
      const userDoc = await this.usersCollection.findOne({ _id: userId });
      if (!userDoc) {
        console.error(`UserService: User not found for ID: ${userId}`);
        return null;
      }
      // Map to UserProfile before returning (removes password, converts ID)
      return this.mapDocumentToProfile(userDoc);
    } catch (error) {
      console.error("UserService: Error fetching current user:", error);
      throw new Error("Failed to fetch current user profile.");
    }
  }

  // Method to get a user's public profile by ID
  async getUserById(userId: string): Promise<Partial<UserProfile> | null> {
    if (!ObjectId.isValid(userId)) {
      console.error(`UserService: Invalid user ID format: ${userId}`);
      return null;
    }
    try {
      const userObjectId = new ObjectId(userId);
      // Only return publicly safe fields
      // Query using ObjectId, project fields from UserProfileDocument
      const userDoc = await this.usersCollection.findOne(
        { _id: userObjectId },
        {
          projection: { name: 1, avatarUrl: 1, about: 1, _id: 1, createdAt: 1 },
        } // Use 'about', project Date fields
      );
      if (!userDoc) {
        console.error(`UserService: User not found for ID: ${userId}`);
        return null;
      }
      // Map to Partial<UserProfile> - projection means not all fields are present
      const partialProfile: Partial<UserProfile> = {
        _id: userDoc._id.toString(),
        name: userDoc.name,
        avatarUrl: userDoc.avatarUrl,
        about: userDoc.about, // Use 'about'
        createdAt: userDoc.createdAt, // Keep as Date
      };
      return partialProfile;
    } catch (error) {
      console.error(`UserService: Error fetching user by ID ${userId}:`, error);
      throw new Error("Failed to fetch user profile.");
    }
  }

  // Method to update a user's profile
  async updateUserProfile(
    userId: string,
    data: Partial<UserProfile>, // Use Partial<UserProfile>
    avatarFile?: File
  ): Promise<UserProfile | null> {
    if (!ObjectId.isValid(userId)) {
      console.error(
        `UserService: Invalid user ID format for update: ${userId}`
      );
      throw new Error("Invalid user ID format.");
    }

    const userObjectId = new ObjectId(userId);
    // Use const for data that won't change, let for potentially changing avatar
    const updatePayload: Partial<UserProfileDocument> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.about !== undefined) updatePayload.about = data.about; // Use 'about'
    if (data.website !== undefined) updatePayload.website = data.website;
    // Handle avatarUrl separately
    let newAvatarUrl: string | null | undefined = data.avatarUrl; // Start with incoming value

    let oldAvatarUrl: string | null | undefined = undefined;

    try {
      // 1. Fetch current user data to get old avatar URL if needed
      const currentUserDoc = await this.usersCollection.findOne({
        _id: userObjectId,
      });
      if (!currentUserDoc) {
        console.error(`UserService: User not found for update: ${userId}`);
        return null; // Or throw error
      }
      oldAvatarUrl = currentUserDoc.avatarUrl;

      // 2. Handle avatar upload if a new file is provided
      if (avatarFile) {
        const base64Image = await fileToBase64(avatarFile);
        const fileName = `avatars/${userId}-${Date.now()}-${avatarFile.name}`;
        newAvatarUrl = await uploadToS3(base64Image, fileName);
        updatePayload.avatarUrl = newAvatarUrl; // Add to payload if changed
      } else if (newAvatarUrl === null) {
        // Explicitly removing avatar (data.avatarUrl was null)
        updatePayload.avatarUrl = null;
      }
      // If avatarFile is not provided and data.avatarUrl is undefined, don't update avatarUrl

      // Check if there's anything to update
      if (Object.keys(updatePayload).length === 0) {
        console.log(`UserService: No fields to update for user ${userId}`);
        return this.mapDocumentToProfile(currentUserDoc); // Return current profile
      }

      // 3. Update user document in MongoDB
      const result = await this.usersCollection.findOneAndUpdate(
        { _id: userObjectId },
        { $set: updatePayload, $currentDate: { updatedAt: true } },
        { returnDocument: "after" } // Return the updated document
      );

      // findOneAndUpdate with returnDocument: 'after' returns the updated doc directly
      if (!result) {
        // Check if the result (updated doc) is null
        console.error(
          `UserService: Failed to update user profile for ID: ${userId} (document not found or update failed)`
        );
        // If upload happened, attempt to delete the newly uploaded file? Maybe not, could be transient DB issue.
        return null; // Or throw error
      }

      // 4. Delete old avatar from S3 if a new one was uploaded or explicitly removed
      const shouldDeleteOld =
        oldAvatarUrl &&
        updatePayload.avatarUrl !== undefined && // Only if avatar was part of the update
        oldAvatarUrl !== updatePayload.avatarUrl;

      if (shouldDeleteOld) {
        try {
          await deleteFromS3(oldAvatarUrl as string); // Use deleteFromS3
        } catch (s3Error) {
          console.error(
            `UserService: Failed to delete old avatar ${oldAvatarUrl} from S3:`,
            s3Error
          );
          // Log this error but don't fail the whole operation, profile is updated.
        }
      }

      // Map the updated document (result) back to UserProfile
      return this.mapDocumentToProfile(result);
    } catch (error) {
      console.error(
        `UserService: Error updating user profile for ID ${userId}:`,
        error
      );
      // Consider rolling back S3 upload if it occurred? Complex.
      throw new Error("Failed to update user profile.");
    }
  }

  // Method to delete a user's profile (potentially for admin or self-delete)
  // Be very careful with this method. Ensure proper authorization.
  async deleteUserProfile(userId: string): Promise<boolean> {
    if (!ObjectId.isValid(userId)) {
      console.error(
        `UserService: Invalid user ID format for delete: ${userId}`
      );
      return false;
    }
    const userObjectId = new ObjectId(userId);

    try {
      // Optional: Fetch user to delete avatar first
      const userToDeleteDoc = await this.usersCollection.findOne({
        _id: userObjectId,
      });
      // Check avatarUrl
      if (userToDeleteDoc?.avatarUrl) {
        try {
          // Use deleteFromS3 and avatarUrl
          await deleteFromS3(userToDeleteDoc.avatarUrl);
        } catch (s3Error) {
          console.error(
            `UserService: Failed to delete avatar ${userToDeleteDoc.avatarUrl} during user deletion for ID ${userId}:`,
            s3Error
          );
          // Log but continue with deletion
        }
      }

      const result = await this.usersCollection.deleteOne({
        _id: userObjectId,
      });
      if (result.deletedCount === 1) {
        console.log(
          `UserService: Successfully deleted user with ID: ${userId}`
        );
        return true;
      } else {
        console.warn(
          `UserService: User not found or already deleted for ID: ${userId}`
        );
        return false;
      }
    } catch (error) {
      console.error(
        `UserService: Error deleting user profile for ID ${userId}:`,
        error
      );
      throw new Error("Failed to delete user profile.");
    }
  }
}

// Helper function to get an instance of the service with the DB connection
let userServiceInstance: UserService | null = null;

export async function getUserService(): Promise<UserService> {
  if (!userServiceInstance) {
    const client: MongoClient = await clientPromise; // Await the promise
    const db = client.db(); // Get the Db instance
    userServiceInstance = new UserService(db);
  }
  return userServiceInstance;
}
