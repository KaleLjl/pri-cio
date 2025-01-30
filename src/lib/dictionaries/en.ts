export const dictionary = {
  chat: {
    loading: {
      user: "Loading user...",
      chat: "Loading chat...",
    },
    error: {
      fetch: "Failed to load chat",
      self: "Cannot chat with yourself",
    },
    input: {
      placeholder: "Type a message...",
    },
    status: {
      sending: "Sending...",
      sent: "Sent",
      delivered: "Delivered",
      read: "Read",
      error: "Error",
    },
    actions: {
      send: "Send",
      back: "Back",
    },
    typing: "Typing...",
    noPosts: "No posts available",
  },
  history: {
    loading: "Loading...",
    error: "An error occurred",
    noHistory: "No history found",
    editProfile: "Edit Profile",
    savedItems: "Saved Items",
    postedItems: "Posted Items",
    dealingItems: "Dealing Items",
    itemCount: "items",
    noDescription: "No description",
    noDealingItems: "No dealing items",
    buyer: "Buyer",
    seller: "Seller",
    complete: "Complete",
    cancel: "Cancel",
    actions: {
      post: "Post",
      posting: "Posting...",
      edit: "Edit",
      delete: "Delete",
      deleting: "Deleting...",
      unpublish: "Unpublish",
      unpublishing: "Unpublishing...",
    },
    toast: {
      success: "Success!",
      error: "Error occurred",
    },
    locationModal: {
      title: "Location Permission",
      message: "Allow access to your location?",
      allow: "Allow",
      deny: "Deny",
    },
  },
} as const;

export type Dictionary = typeof dictionary;