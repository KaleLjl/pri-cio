export interface Dictionary {
  chat: {
    loading: {
      user: string;
      chat: string;
    };
    error: {
      fetch: string;
      self: string;
    };
    input: {
      placeholder: string;
    };
    status: {
      sending: string;
      sent: string;
      delivered: string;
      read: string;
      error: string;
    };
    actions: {
      send: string;
      back: string;
    };
    typing: string;
    noPosts: string;
  };
  // ... rest of the dictionary interface
} 