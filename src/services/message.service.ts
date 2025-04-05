import clientPromise from "@/lib/mongodb";
// Import necessary types
import {
  ChatMessage,
  MessageDBSchema,
  MessageContent,
  ObjectDiscussionData,
} from "@/lib/types/chat";
import { ObjectId } from "mongodb";
import { Filter } from "mongodb"; // Import Filter type

interface GetMessagesParams {
  conversationId: string;
  userId: string; // ID of the user requesting messages (for filtering deleted)
  page?: number;
  limit?: number;
}

interface GetMessagesResult {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Fetches messages for a specific conversation, paginated.
 * @param params - Parameters including conversationId, userId, page, and limit.
 * @returns A promise resolving to the fetched messages and pagination info.
 */
export async function getMessages(
  params: GetMessagesParams
): Promise<GetMessagesResult> {
  const { conversationId, userId, page = 1, limit = 20 } = params;

  if (!ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversation ID format.");
  }

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const messagesCollection = db.collection<MessageDBSchema>("messages");

    await messagesCollection.createIndex({ conversationId: 1, createdAt: -1 });

    const skip = (page - 1) * limit;

    const filter: Filter<MessageDBSchema> = {
      conversationId: new ObjectId(conversationId),
      $or: [{ deletedBy: { $exists: false } }, { deletedBy: { $ne: userId } }],
    };

    const messagesFromDb = await messagesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await messagesCollection.countDocuments(filter);

    const formattedMessages = messagesFromDb.map(
      (msg): ChatMessage => ({
        _id: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        senderId: msg.senderId.toString(),
        receiverId: msg.receiverId.toString(),
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        status: msg.status,
        read: msg.read,
      })
    );

    return {
      messages: formattedMessages.reverse(),
      total,
      page,
      limit,
      hasMore: total > skip + limit,
    };
  } catch (error) {
    console.error(
      `[MessageService] Error fetching messages for conversation ${conversationId}:`,
      error
    );
    throw new Error("Failed to fetch messages.");
  }
}

// --- Send Message Logic ---

interface SendMessageParams {
  senderId: string;
  receiverId: string;
  content: MessageContent;
}

/**
 * Sends a new message, creates/updates conversation, and handles dealing record initiation.
 * @param params - Sender ID, Receiver ID, and message content.
 * @returns A promise resolving to the newly created ChatMessage.
 */
export async function sendMessage(
  params: SendMessageParams
): Promise<ChatMessage> {
  const { senderId, receiverId, content } = params;

  if (!content || !receiverId || !senderId) {
    throw new Error("Content, receiver ID, and sender ID are required");
  }

  // Outer try...catch for the entire operation
  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const conversationsCollection = db.collection("conversations");
    const messagesCollection = db.collection<MessageDBSchema>("messages");
    const usersCollection = db.collection("users"); // Needed for dealing logic
    const historiesCollection = db.collection("histories"); // Needed for dealing logic
    const dealingCollection = db.collection("dealing"); // Needed for dealing logic

    // Find or create conversation
    let conversation = await conversationsCollection.findOne({
      participants: {
        $all: [senderId, receiverId],
        $size: 2,
      },
    });

    if (!conversation) {
      const newConversationData = {
        _id: new ObjectId(),
        participants: [senderId, receiverId],
        createdAt: new Date(),
        updatedAt: new Date(),
        unreadCount: 0,
      };
      await conversationsCollection.insertOne(newConversationData);
      conversation = newConversationData;
    } else {
      await conversationsCollection.updateOne(
        { _id: conversation._id },
        {
          $set: { updatedAt: new Date() },
          $unset: { deletedBy: "" },
          $inc: { unreadCount: 1 },
        }
      );
      // Refresh conversation data if needed (optional, depends if you need updated fields later)
      // conversation = await conversationsCollection.findOne({ _id: conversation._id });
      // if (!conversation) throw new Error("Failed to refresh conversation data after update.");
    }

    // Prepare message document for DB insertion
    const newMessageData: MessageDBSchema = {
      _id: new ObjectId(), // Generate _id beforehand
      conversationId: conversation._id,
      senderId: new ObjectId(senderId),
      receiverId: new ObjectId(receiverId),
      content,
      createdAt: new Date(),
      read: false,
      status: "sent",
    };

    // Insert the message
    await messagesCollection.insertOne(newMessageData);
    const insertedId = newMessageData._id; // Store the generated ID

    // --- Handle dealing record initiation ---
    // Type guard to check if content is ObjectDiscussionData
    if (
      typeof content === "object" &&
      content !== null &&
      "type" in content &&
      content.type === "object_discussion"
    ) {
      const objectDiscussionContent = content as ObjectDiscussionData; // Cast for convenience

      if (
        objectDiscussionContent.historyId &&
        ObjectId.isValid(objectDiscussionContent.historyId)
      ) {
        // Inner try...catch specifically for the dealing logic, so it doesn't block message sending on failure
        try {
          const historyId = objectDiscussionContent.historyId;

          const historyItem = await historiesCollection.findOne(
            { _id: new ObjectId(historyId) },
            { projection: { userEmail: 1 } }
          );

          if (historyItem?.userEmail) {
            const sellerUser = await usersCollection.findOne(
              { email: historyItem.userEmail },
              { projection: { _id: 1 } }
            );

            if (sellerUser) {
              const sellerId = sellerUser._id.toString();
              const buyerId = senderId === sellerId ? receiverId : senderId;

              const filter = { historyId: historyId };
              const update = {
                $set: { updatedAt: new Date() },
                $setOnInsert: {
                  historyId: historyId,
                  buyerId: buyerId,
                  sellerId: sellerId,
                  status: "pending",
                  createdAt: new Date(),
                },
              };
              await dealingCollection.updateOne(filter, update, {
                upsert: true,
              });
              console.log(
                `[MessageService] Upserted dealing record for historyId: ${historyId}`
              );
            } else {
              console.error(
                `[MessageService] Seller user not found for email: ${historyItem.userEmail}`
              );
            }
          } else {
            console.error(
              `[MessageService] History item not found for ID: ${historyId}`
            );
          }
        } catch (dealError) {
          console.error(
            `[MessageService] Error upserting dealing record for historyId ${objectDiscussionContent.historyId}:`,
            dealError
          );
        }
      }
    }
    // --- End dealing record handling ---

    // Construct the ChatMessage object to return (with string IDs)
    const createdMessage: ChatMessage = {
      _id: insertedId.toString(),
      conversationId: conversation._id.toString(),
      senderId: senderId,
      receiverId: receiverId,
      content: content,
      createdAt: newMessageData.createdAt.toISOString(),
      status: newMessageData.status,
      read: newMessageData.read,
    };

    return createdMessage; // Ensure return is inside the try block
  } catch (error) {
    // Outer catch block
    console.error("[MessageService] Error sending message:", error);
    throw new Error("Failed to send message.");
  }
}

// --- Mark Messages Read Logic ---

interface MarkMessagesReadParams {
  conversationId: string;
  userId: string; // ID of the user whose messages should be marked read
}

/**
 * Marks messages in a conversation as read for a specific user.
 * @param params - Conversation ID and User ID.
 * @returns A promise resolving to the number of messages updated.
 */
export async function markMessagesRead(
  params: MarkMessagesReadParams
): Promise<number> {
  const { conversationId, userId } = params;

  if (!ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversation ID format.");
  }
  if (!userId) {
    throw new Error("User ID is required.");
  }

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const messagesCollection = db.collection<MessageDBSchema>("messages");
    const conversationsCollection = db.collection("conversations");

    // Update messages to read: true where receiverId matches userId
    const result = await messagesCollection.updateMany(
      {
        conversationId: new ObjectId(conversationId),
        receiverId: new ObjectId(userId), // Match receiverId
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    // Reset unread count for the conversation (for this user, though unreadCount isn't user-specific here)
    // Consider if unreadCount needs to be user-specific in the conversation schema
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { unreadCount: 0 } } // Resetting global unread count
    );

    console.log(
      `[MessageService] Marked ${result.modifiedCount} messages as read for user ${userId} in conversation ${conversationId}`
    );
    return result.modifiedCount;
  } catch (error) {
    console.error(
      `[MessageService] Error marking messages read for user ${userId} in conversation ${conversationId}:`,
      error
    );
    throw new Error("Failed to mark messages as read.");
  }
}

// --- Delete Conversation Logic ---

interface DeleteConversationParams {
  conversationId: string;
  userId: string; // ID of the user requesting the deletion
}

/**
 * Soft/hard deletes a conversation and its messages for a user.
 * Checks for ongoing discussions before deleting.
 * @param params - Conversation ID and User ID.
 * @returns A promise that resolves when the deletion is complete.
 * @throws Error if conversation has ongoing discussions or deletion fails.
 */
export async function deleteConversation(
  params: DeleteConversationParams
): Promise<void> {
  const { conversationId, userId } = params;

  if (!ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversation ID format.");
  }
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const client = await clientPromise;
  const db = client.db("pri-cio");
  const messagesCollection = db.collection<MessageDBSchema>("messages");
  const conversationsCollection = db.collection("conversations");

  // Check for ongoing discussions first
  const ongoingMessages = await messagesCollection
    .find({
      conversationId: new ObjectId(conversationId),
      "content.type": "object_discussion",
      "content.status": "discussing", // Check specifically for 'discussing' status
    })
    .limit(1) // We only need to know if at least one exists
    .toArray();

  if (ongoingMessages.length > 0) {
    throw new Error(
      "Cannot delete conversation with ongoing discussions. Please complete or cancel all discussions first."
    );
  }

  // Start transaction
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const conversation = await conversationsCollection.findOne(
        { _id: new ObjectId(conversationId) },
        { session }
      );

      if (!conversation) {
        // If conversation already deleted by other party, consider it success for this user
        console.log(
          `[MessageService] Conversation ${conversationId} not found, likely already deleted.`
        );
        return;
        // Alternatively, throw new Error("Conversation not found"); if strict check needed
      }

      // Check if other participant has already deleted
      const otherParticipantId = conversation.participants.find(
        (p: string) => p !== userId
      );
      let allMessagesDeletedByOther = false;
      if (otherParticipantId) {
        const messages = await messagesCollection
          .find(
            { conversationId: new ObjectId(conversationId) },
            { projection: { deletedBy: 1 }, session }
          )
          .toArray();
        allMessagesDeletedByOther = messages.every((msg) =>
          msg.deletedBy?.includes(otherParticipantId)
        );
      } else {
        // Handle case where there might not be another participant (e.g., self-conversation?)
        // Or if conversation structure guarantees two participants, this branch might be unnecessary
        console.warn(
          `[MessageService] Could not find other participant for conversation ${conversationId}`
        );
      }

      if (allMessagesDeletedByOther) {
        // Hard delete if other user already deleted
        await messagesCollection.deleteMany(
          { conversationId: new ObjectId(conversationId) },
          { session }
        );
        await conversationsCollection.deleteOne(
          { _id: new ObjectId(conversationId) },
          { session }
        );
        console.log(
          `[MessageService] Hard deleted conversation ${conversationId}`
        );
      } else {
        // Soft delete for the current user
        await messagesCollection.updateMany(
          {
            conversationId: new ObjectId(conversationId),
            $or: [
              { deletedBy: { $exists: false } },
              { deletedBy: { $ne: userId } },
            ],
          },
          {
            $addToSet: { deletedBy: userId },
          },
          { session }
        );
        await conversationsCollection.updateOne(
          { _id: new ObjectId(conversationId) },
          {
            $addToSet: { deletedBy: userId },
            $set: {
              updatedAt: new Date(),
              // Optionally reset unread count for the deleting user if tracked per user
              // unreadCount: { ...conversation.unreadCount, [userId]: 0 }
              // For now, just reset global count as before
              unreadCount: 0,
            },
          },
          { session }
        );
        console.log(
          `[MessageService] Soft deleted conversation ${conversationId} for user ${userId}`
        );
      }

      // Mark messages as read for the deleting user (redundant if hard deleting, but safe)
      await messagesCollection.updateMany(
        {
          conversationId: new ObjectId(conversationId),
          receiverId: new ObjectId(userId),
          read: false,
        },
        {
          $set: { read: true },
        },
        { session }
      );
    });
  } catch (error) {
    console.error(
      `[MessageService] Error deleting conversation ${conversationId} for user ${userId}:`,
      error
    );
    throw new Error("Failed to delete conversation."); // Rethrow generic error
  } finally {
    await session.endSession();
  }
}

import { MessageStatus } from "@/lib/types/chat"; // Import MessageStatus type

// --- Update Message Status Logic ---

interface UpdateMessageStatusParams {
  messageId: string;
  status: MessageStatus; // Use the specific MessageStatus type
}

/**
 * Updates the status of a specific message.
 * @param params - Message ID and the new status.
 * @returns A promise that resolves when the update is complete.
 * @throws Error if the message is not found, status is invalid, or the update fails.
 */
export async function updateMessageStatus(
  params: UpdateMessageStatusParams
): Promise<void> {
  const { messageId, status } = params;
  const validStatuses: MessageStatus[] = [
    "sending",
    "sent",
    "delivered",
    "read",
    "error",
  ];

  if (!ObjectId.isValid(messageId)) {
    throw new Error("Invalid message ID format.");
  }
  // Validate against the MessageStatus type values
  if (!status || !validStatuses.includes(status)) {
    throw new Error(
      `Invalid status provided. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("pri-cio");
    const messagesCollection = db.collection<MessageDBSchema>("messages");

    const result = await messagesCollection.updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { status, updatedAt: new Date() } } // Assuming status is stored directly
    );

    if (result.matchedCount === 0) {
      throw new Error("Message not found.");
    }
    console.log(
      `[MessageService] Updated status for messageId ${messageId} to ${status}.`
    );
  } catch (error) {
    console.error(
      `[MessageService] Error updating status for messageId ${messageId}:`,
      error
    );
    if (error instanceof Error && error.message === "Message not found.") {
      throw error; // Re-throw specific known errors
    }
    throw new Error("Failed to update message status.");
  }
}
