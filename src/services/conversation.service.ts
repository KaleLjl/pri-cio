// src/services/conversation.service.ts
import { Collection, Db, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  Conversation,
  ConversationDBSchema,
  ConversationListItem,
  ConversationSettings,
  ChatUser,
  MessageDBSchema,
} from "@/lib/types/chat";
// UserProfile is not directly needed here anymore
import { getUserService, UserService } from "./user.service"; // Import UserService

class ConversationService {
  private db: Db | null = null;
  private conversationsCollection: Collection<ConversationDBSchema> | null =
    null;
  private messagesCollection: Collection<MessageDBSchema> | null = null;
  private userService: UserService | null = null; // Add UserService instance

  private async initializeDb(): Promise<Db> {
    // Check if both db and userService are already initialized
    if (this.db && this.userService) {
      return this.db;
    }
    const client = await clientPromise;
    this.db = client.db("pri-cio");
    this.conversationsCollection =
      this.db.collection<ConversationDBSchema>("conversations");
    this.messagesCollection = this.db.collection<MessageDBSchema>("messages");
    // Initialize userService only if it hasn't been initialized yet
    if (!this.userService) {
      this.userService = await getUserService();
    }
    return this.db;
  }

  // --- Service Methods ---

  /**
   * Finds an existing conversation between two users or creates a new one.
   * @param currentUserId - The ID of the user initiating the request.
   * @param participantId - The ID of the other participant.
   * @returns The existing or newly created conversation object, or null if an error occurs.
   */
  async initializeConversation(
    currentUserId: string,
    participantId: string
  ): Promise<Conversation | null> {
    try {
      const db = await this.initializeDb(); // Ensures userService is initialized
      if (!this.userService) {
        // This check might be redundant if initializeDb guarantees it, but safe to keep
        throw new Error("UserService not initialized in ConversationService");
      }
      const conversationsCollection =
        db.collection<ConversationDBSchema>("conversations");

      // Validate ObjectIds format (early exit)
      if (
        !ObjectId.isValid(currentUserId) ||
        !ObjectId.isValid(participantId)
      ) {
        console.error(
          "Invalid ObjectId format provided to initializeConversation"
        );
        return null;
      }

      // --- Pre-validation: Check if both users exist using UserService ---
      // userService.getUserById handles ObjectId validation internally and returns null if invalid/not found
      const currentUserProfile = await this.userService.getUserById(
        currentUserId
      );
      const participantProfile = await this.userService.getUserById(
        participantId
      );

      if (!currentUserProfile || !participantProfile) {
        console.error(
          `initializeConversation: One or both users not found via UserService. Current: ${!!currentUserProfile}, Participant: ${!!participantProfile}. IDs: ${currentUserId}, ${participantId}`
        );
        // Return null if either user doesn't exist
        return null;
      }
      // --- End Pre-validation ---

      // Find existing conversation (using string IDs as stored in conversation doc)
      const existingConversation = await conversationsCollection.findOne({
        participants: {
          $all: [currentUserId, participantId],
          $size: 2,
        },
      });

      if (existingConversation) {
        // Construct participants array using already fetched profiles
        // Ensure profiles and their IDs are not null/undefined
        if (!currentUserProfile?._id || !participantProfile?._id) {
          throw new Error(
            "User profile ID missing after successful validation."
          );
        }
        const participants: ChatUser[] = [
          {
            _id: currentUserProfile._id,
            name: currentUserProfile.name || "",
            avatarUrl: currentUserProfile.avatarUrl || undefined,
          },
          {
            _id: participantProfile._id,
            name: participantProfile.name || "",
            avatarUrl: participantProfile.avatarUrl || undefined,
          },
        ];

        return {
          _id: existingConversation._id.toString(),
          participants: participants,
          createdAt: existingConversation.createdAt.toISOString(),
          updatedAt: existingConversation.updatedAt.toISOString(),
          settings: existingConversation.settings,
        };
      }

      // Create new conversation
      const newConversationData: ConversationDBSchema = {
        _id: new ObjectId(),
        participants: [currentUserId, participantId], // Store string IDs
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {},
      };
      const newConversationResult = await conversationsCollection.insertOne(
        newConversationData
      );

      // Construct participants array using already fetched profiles
      // Ensure profiles and their IDs are not null/undefined
      if (!currentUserProfile?._id || !participantProfile?._id) {
        // This case should ideally not be reached due to pre-validation
        throw new Error(
          "User profile ID missing after successful validation during conversation creation."
        );
      }
      const participants: ChatUser[] = [
        {
          _id: currentUserProfile._id,
          name: currentUserProfile.name || "",
          avatarUrl: currentUserProfile.avatarUrl || undefined,
        },
        {
          _id: participantProfile._id,
          name: participantProfile.name || "",
          avatarUrl: participantProfile.avatarUrl || undefined,
        },
      ];

      return {
        _id: newConversationResult.insertedId.toString(),
        participants: participants,
        createdAt: newConversationData.createdAt.toISOString(),
        updatedAt: newConversationData.updatedAt.toISOString(),
        settings: newConversationData.settings,
      };
    } catch (error) {
      console.error(
        "Error in ConversationService.initializeConversation:",
        error
      );
      return null;
    }
  }

  /**
   * Lists conversations for a given user, including last message and unread count.
   * @param userId - The ID of the user whose conversations to list.
   * @returns An array of conversation list items.
   */
  async listConversations(userId: string): Promise<ConversationListItem[]> {
    // This method seems okay as it uses aggregation which handles lookups correctly.
    // No direct calls to usersCollection were made here previously that caused issues.
    // Keep the existing implementation for listConversations.
    try {
      const db = await this.initializeDb();
      const conversationsCollection =
        db.collection<ConversationDBSchema>("conversations");

      if (!ObjectId.isValid(userId)) {
        console.error("Invalid userId provided to listConversations");
        return [];
      }
      const userObjectId = new ObjectId(userId);

      // Aggregation pipeline based on GET /api/chat/conversations/list/route.ts
      const conversations = await conversationsCollection
        .aggregate([
          {
            $match: {
              participants: userId, // Match string ID in participants array
              $or: [
                { deletedBy: { $exists: false } },
                { deletedBy: { $ne: userId } }, // Check string ID
              ],
            },
          },
          {
            $lookup: {
              from: "messages",
              let: { conversationId: "$_id" }, // conversationId is ObjectId
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$conversationId", "$$conversationId"] }, // Compare ObjectId
                  },
                },
                { $sort: { createdAt: -1 } },
                { $limit: 1 },
              ],
              as: "lastMessage",
            },
          },
          { $match: { "lastMessage.0": { $exists: true } } },
          {
            $lookup: {
              from: "users",
              let: {
                participantObjectIds: {
                  $map: {
                    input: "$participants",
                    as: "pId",
                    in: { $toObjectId: "$$pId" },
                  },
                },
              },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ["$_id", "$$participantObjectIds"] },
                  },
                },
                {
                  // Project to UserProfile structure (ensure fields match UserProfile type)
                  $project: {
                    _id: { $toString: "$_id" },
                    name: 1,
                    email: 1,
                    avatarUrl: 1,
                    // Assuming location and bio are not part of UserProfile, remove if so
                    // location: 1, bio: 1,
                    createdAt: 1,
                    updatedAt: 1,
                  },
                },
              ],
              as: "participants", // Result should match UserProfile[] structure
            },
          },
          {
            $lookup: {
              from: "messages",
              let: { conversationId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$conversationId", "$$conversationId"] },
                        { $eq: ["$receiverId", userObjectId] },
                        { $ne: ["$read", true] },
                      ],
                    },
                  },
                },
                { $count: "unreadCount" },
              ],
              as: "unreadInfo",
            },
          },
          {
            $addFields: {
              lastMessage: {
                $cond: {
                  if: { $gt: [{ $size: "$lastMessage" }, 0] },
                  then: {
                    $let: {
                      vars: { msg: { $arrayElemAt: ["$lastMessage", 0] } },
                      in: {
                        // Map fields from MessageDBSchema to match ChatMessage structure if needed
                        _id: { $toString: "$$msg._id" },
                        content: "$$msg.content",
                        createdAt: { $toString: "$$msg.createdAt" },
                        senderId: { $toString: "$$msg.senderId" },
                        receiverId: { $toString: "$$msg.receiverId" },
                        conversationId: { $toString: "$$msg.conversationId" },
                        status: "$$msg.status",
                        read: "$$msg.read",
                      },
                    },
                  },
                  else: null,
                },
              },
              unreadCount: {
                $ifNull: [{ $arrayElemAt: ["$unreadInfo.unreadCount", 0] }, 0],
              },
              _id: { $toString: "$_id" }, // Convert conversation _id
              // participants field is already projected in the $lookup stage
              // settings field is implicitly carried over unless projected out
            },
          },
          { $project: { unreadInfo: 0 } }, // Remove temporary field
          { $sort: { "lastMessage.createdAt": -1 } }, // Sort by string date
        ])
        .toArray();

      // Assert the type after aggregation - requires careful validation of the pipeline
      // and ensuring the $project stage for participants matches UserProfile
      return conversations as ConversationListItem[];
    } catch (error) {
      console.error("Error in ConversationService.listConversations:", error);
      return [];
    }
  }

  /**
   * Updates the settings for a specific conversation.
   * @param userId - The ID of the user making the request (must be a participant).
   * @param conversationId - The ID of the conversation to update.
   * @param settings - The new settings object.
   * @returns The updated conversation object, or null if not found or unauthorized.
   */
  async updateConversationSettings(
    userId: string,
    conversationId: string,
    settings: ConversationSettings
  ): Promise<Conversation | null> {
    try {
      const db = await this.initializeDb(); // Ensures userService is initialized
      if (!this.userService) {
        throw new Error("UserService not initialized in ConversationService");
      }
      const conversationsCollection =
        db.collection<ConversationDBSchema>("conversations");

      // Validate ObjectIds
      if (!ObjectId.isValid(userId) || !ObjectId.isValid(conversationId)) {
        console.error(
          "Invalid ObjectId provided to updateConversationSettings"
        );
        return null;
      }
      const conversationObjectId = new ObjectId(conversationId);

      // Find and update the conversation, ensuring the user is a participant
      const updateResult = await conversationsCollection.findOneAndUpdate(
        {
          _id: conversationObjectId,
          participants: userId, // Check string userId in participants array
        },
        { $set: { settings, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

      if (!updateResult) {
        return null; // Conversation not found or user not a participant
      }
      const updatedConversation = updateResult;

      // Fetch participant details using UserService
      const participants: ChatUser[] = [];
      for (const pId of updatedConversation.participants) {
        // Fetch partial profile using userService
        const pData = await this.userService.getUserById(pId);
        if (pData?._id) {
          // Check for profile and its ID
          // Construct ChatUser from partial profile
          participants.push({
            _id: pData._id,
            name: pData.name || "",
            avatarUrl: pData.avatarUrl || undefined,
          });
        } else {
          console.warn(
            `Could not find participant details for ID ${pId} during settings update.`
          );
          // Decide how to handle - skip user? Return error? For now, skip.
        }
      }

      // Check if we retrieved details for all participants listed in the conversation
      if (participants.length !== updatedConversation.participants.length) {
        console.error(
          "Failed to retrieve full participant details during settings update. Data inconsistency likely."
        );
        // Return null or the conversation with potentially incomplete participant data?
        // Returning null might be safer to signal an issue.
        // return null;
        // Or return with the participants found:
        // console.warn("Returning conversation with potentially incomplete participant details.");
      }

      return {
        _id: updatedConversation._id.toString(),
        participants: participants, // Use the constructed array
        createdAt: updatedConversation.createdAt.toISOString(),
        updatedAt: updatedConversation.updatedAt.toISOString(),
        settings: updatedConversation.settings,
      };
    } catch (error) {
      console.error(
        "Error in ConversationService.updateConversationSettings:",
        error
      );
      return null;
    }
  }
}

// Export a singleton instance
const conversationService = new ConversationService();
export default conversationService;
