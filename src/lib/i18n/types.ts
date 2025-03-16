export interface Dictionary {
  metadata: {
    title: string;
    description: string;
  };
  landing: {
    hero: {
      title: string;
      subtitle: string;
      cta: string;
    };
    features: {
      title: string;
      accurate: {
        title: string;
        description: string;
      };
      instant: {
        title: string;
        description: string;
      };
      versatile: {
        title: string;
        description: string;
      };
    };
  };
  navigation: {
    home: string;
    explore: string;
    around: string;
    app: string;
    signin: string;
    signout: string;
    profile: string;
    messages: string;
    createpost: string;
    search: string;
    language: {
      select: string;
      en: string;
      zh: string;
    };
  };
  around: {
    unknownArea: string;
    noDescription: string;
    posts: string;
    enableLocation: string;
    geolocationNotSupported: string;
    navigationBar: string;
    postsInCluster: string;
    anonymous: string;
  };
  app: {
    title: string;
    titleWithPrice: string;
    titleEditing: string;
    uploadButton: string;
    priceButton: string;
    deleteButton: string;
    exportButton: string;
    shareButton: string;
    descriptionPlaceholder: string;
    errorTitle: string;
    closeButton: string;
    cancelButton: string;
  };
  explore: {
    loading: string;
    error: string;
    noPostsFound: string;
    setRadius: string;
    radiusModalTitle: string;
    enableLocation: string;
    locationLabel: string;
    noLimit: string;
    apply: string;
    noDescription: string;
    createdAt: string;
    anonymous: string;
    comments: string;
    writeComment: string;
    today: string;
    yesterday: string;
    daysAgo: string;
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
  editProfile: {
    title: string;
    subtitle: string;
    avatar: {
      change: string;
    };
    form: {
      name: {
        label: string;
      };
      about: {
        label: string;
      };
      website: {
        label: string;
      };
    };
    actions: {
      reset: string;
      save: string;
    };
    loading: string;
  };
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
  };
  chatHistory: {
    loading: string;
    error: string;
    empty: string;
    title: string;
    signIn: {
      message: string;
      action: string;
    };
    findPeople: {
      message: string;
      action: string;
    };
    deleteConfirm: {
      title: string;
      message: string;
      confirm: string;
      cancel: string;
    };
    toast: {
      deleteSuccess: string;
      deleteError: string;
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
    canceled: string;
    discussing: string;
    buyerLabel: string;
    sellerLabel: string;
    noChangesMessage: string;
    dealError: string;
    alreadyInDiscussion: string;
    inDiscussion: string;
  };
}