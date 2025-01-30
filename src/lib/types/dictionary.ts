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
  history: {
    loading: string;
    error: string;
    noHistory: string;
    editProfile: string;
    savedItems: string;
    postedItems: string;
    dealingItems: string;
    itemCount: string;
    noDescription: string;
    noDealingItems: string;
    buyer: string;
    seller: string;
    complete: string;
    cancel: string;
    actions: {
      post: string;
      posting: string;
      edit: string;
      delete: string;
      deleting: string;
      unpublish: string;
      unpublishing: string;
    };
    toast: {
      deleteSuccess: string;
      deleteError: string;
      postSuccess: string;
      postError: string;
      updateSuccess: string;
      updateError: string;
      unpublishSuccess: string;
      unpublishError: string;
    };
    locationModal: {
      title: string;
      message: string;
      allow: string;
      deny: string;
    };
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