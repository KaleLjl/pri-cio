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
  // ... rest of the dictionary
} as const;

export type Dictionary = typeof dictionary; 