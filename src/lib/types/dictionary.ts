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
  objectDiscussion: {
    price: string;
    enterPrice: string;
    location: string;
    enterLocation: string;
    meetingTime: string;
    cancel: string;
    send: string;
    complete: string;
    completed: string;
    buyerLabel: string;
    sellerLabel: string;
    noChangesMessage: string;
    dealError: string;
  };
  // ... rest of the dictionary interface
} 