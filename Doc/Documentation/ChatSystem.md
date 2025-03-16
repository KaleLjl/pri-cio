# Chat System Documentation

## Overview
The chat system is a real-time messaging solution built with Next.js, TypeScript, and WebSocket. It provides a modern, feature-rich chat interface with support for object discussions, message history, and real-time updates.

## Core Components

### 1. Chat Component (`Chat.tsx`)
The main chat interface component that orchestrates all chat-related functionality.

#### Key Features:
- Real-time messaging
- Message history with infinite scrolling
- User typing indicators
- Message status indicators (sending, sent, delivered, read)
- Object discussion system for product negotiations
- Image support with fallback
- Message deletion
- Responsive design

### 2. Chat Hooks

#### `useInitializeChat`
Handles chat initialization and user data loading.
```typescript
const {
  currentUserId,
  otherUser,
  conversationId,
  isInitializing,
  error
} = useInitializeChat({ userId });
```

#### `useChatData`
Manages chat messages and posts data.
```typescript
const {
  messages,
  userPosts,
  isLoadingPosts,
  isTyping,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage
} = useChatData({
  userId,
  conversationId,
  otherUser
});
```

#### `useChatUI`
Handles UI-related functionality and message input.
```typescript
const {
  messagesEndRef,
  messagesContainerRef,
  loadMoreRef,
  inputMessage,
  showPosts,
  // ... other UI states and handlers
} = useChatUI({
  messages,
  currentUserId,
  conversationId,
  fetchNextPage,
  hasNextPage
});
```

#### `useMessageActions`
Manages message operations like sending and deleting.
```typescript
const {
  sendMessage,
  deleteMessages,
  handleSubmit,
  isSending,
  isDeleting
} = useMessageActions({
  conversationId,
  currentUserId,
  otherUserId,
  handleMessageSubmit
});
```

#### `useObjectDiscussion`
Handles product discussion functionality.
```typescript
const {
  selectedPost,
  editingContent,
  handleDiscussionSubmit,
  // ... other discussion-related states and handlers
} = useObjectDiscussion({
  currentUserId,
  messages,
  sendMessage,
  queryClient,
  setShowPosts,
  dict
});
```

### 3. Managers

#### ChatCacheManager
Handles caching of chat data and messages.
- Manages local storage of chat history
- Handles message caching and retrieval
- Optimizes performance by reducing server calls

#### SocketEventManager
Manages WebSocket connections and real-time events.
- Handles real-time message delivery
- Manages typing indicators
- Handles connection state
- Manages reconnection logic

## Areas for Improvement

### 1. Architecture Refinement
Current analysis shows overlapping responsibilities between SocketEventManager and ChatCacheManager:

```typescript
// Current overlap in event handling
// SocketEventManager.ts
public initializeEventListeners({
  onNewMessage,
  onNewConversation,
  onMessageDelivered,
  onMessageRead,
  onConversationRead,
  onUserTyping
})

// ChatCacheManager.ts
public async handleNewMessage(message: ChatMessage)
public async handleNewConversation(conversationId: string)
public updateMessageStatus(messageId: string, status: Status)
```

Recommendations:
- Implement a clear event flow: Socket Event → SocketEventManager → ChatCacheManager → UI Update
- Make ChatCacheManager the single source of truth for data updates
- Remove duplicate message status management between Socket and Cache managers

### 2. State Management Optimization
Current issues:
- Multiple components handling same state updates
- Redundant API calls for the same data
- Mixing of real-time updates with REST API calls

Proposed solution:
```typescript
// Centralized state management
interface ChatStateManager {
  handleMessageUpdate: (message: ChatMessage) => void;
  handleConversationUpdate: (conversation: Conversation) => void;
  handleStatusUpdate: (status: MessageStatus) => void;
}

// Event bus pattern
class ChatEventBus {
  emit(event: ChatEvent): void;
  subscribe(event: ChatEvent, handler: Handler): void;
  unsubscribe(event: ChatEvent, handler: Handler): void;
}
```

### 3. Real-time vs REST API Separation
Current redundancy:
```typescript
// Current: Both WebSocket and REST API updating same data
socket.on('message', handleNewMessage);
fetch('/api/chat/messages').then(handleNewMessage);
```

Recommended separation:
- WebSocket: Real-time events (typing, presence, immediate message delivery)
- REST API: CRUD operations, history loading, initial data fetch
- Cache: Local state management and optimistic updates

## Implementation Guide

### 1. Refactored Service Layer
```typescript
class ChatService {
  private socketManager: SocketEventManager;
  private cacheManager: ChatCacheManager;
  private stateManager: ChatStateManager;

  constructor() {
    this.socketManager = SocketEventManager.getInstance();
    this.cacheManager = new ChatCacheManager(queryClient);
    this.stateManager = new ChatStateManager();
    
    // Initialize socket events with clear flow
    this.socketManager.initializeEventListeners({
      onNewMessage: this.handleNewMessage.bind(this),
      onNewConversation: this.handleNewConversation.bind(this),
      onMessageStatus: this.handleMessageStatus.bind(this),
    });
  }

  private handleNewMessage(message: ChatMessage) {
    // Single entry point for message handling
    this.cacheManager.handleNewMessage(message);
    this.stateManager.notifySubscribers('message', message);
  }

  private handleNewConversation(data: ConversationData) {
    // Unified conversation handling
    this.cacheManager.handleNewConversation(data.conversationId);
    this.stateManager.notifySubscribers('conversation', data);
  }
}
```

### 2. Optimized Event Flow
```typescript
// Clear event flow with proper separation
interface ChatEventFlow {
  // Socket events - real-time only
  socketEvents: {
    'new-message': (message: ChatMessage) => void;
    'typing-status': (status: TypingStatus) => void;
    'presence': (presence: UserPresence) => void;
  };

  // REST API - data operations
  apiOperations: {
    fetchHistory: (params: HistoryParams) => Promise<Messages>;
    updateMessage: (message: MessageUpdate) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
  };

  // Cache operations - local state
  cacheOperations: {
    updateCache: (data: CacheUpdate) => void;
    invalidateCache: (keys: CacheKeys) => void;
    optimisticUpdate: (update: OptimisticUpdate) => void;
  };
}
```

### 3. Enhanced State Management
```typescript
class ChatStateManager {
  private subscribers = new Map<string, Set<Subscriber>>();
  private cache: ChatCacheManager;

  constructor(cache: ChatCacheManager) {
    this.cache = cache;
  }

  public update(type: UpdateType, data: UpdateData) {
    // Single update point
    this.cache.update(type, data);
    this.notifySubscribers(type, data);
  }

  public subscribe(type: string, subscriber: Subscriber) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(subscriber);
  }

  private notifySubscribers(type: string, data: any) {
    this.subscribers.get(type)?.forEach(subscriber => subscriber(data));
  }
}
```

### 4. Performance Optimizations

#### Message Batching
```typescript
class MessageBatcher {
  private queue: Message[] = [];
  private timeout: NodeJS.Timeout | null = null;

  public queueMessage(message: Message) {
    this.queue.push(message);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), 100);
    }
  }

  private flush() {
    if (this.queue.length > 0) {
      this.processMessages(this.queue);
      this.queue = [];
    }
    this.timeout = null;
  }
}
```

#### Smart Polling
```typescript
class PollingManager {
  private baseInterval = 1000;
  private maxInterval = 30000;
  private currentInterval: number;
  private isWebSocketActive: boolean;

  public adjustPolling(wsStatus: WebSocketStatus) {
    if (wsStatus === 'connected') {
      this.stopPolling();
      this.isWebSocketActive = true;
    } else {
      this.startPolling();
      this.isWebSocketActive = false;
    }
  }

  private startPolling() {
    this.currentInterval = this.baseInterval;
    this.poll();
  }

  private async poll() {
    if (!this.isWebSocketActive) {
      await this.fetchUpdates();
      this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
      setTimeout(() => this.poll(), this.currentInterval);
    }
  }
}
```

## Best Practices

### 1. Event Handling
- Use the ChatEventBus for all event distribution
- Implement proper error boundaries for event handlers
- Use TypeScript for better type safety in event handling

### 2. State Updates
- Always use ChatStateManager for state updates
- Implement optimistic updates for better UX
- Handle edge cases and error states properly

### 3. Performance
- Use message batching for bulk operations
- Implement smart polling as WebSocket fallback
- Use proper caching strategies

### 4. Error Handling
- Implement proper error recovery
- Use proper logging for debugging
- Handle network errors gracefully

## Conclusion
The chat system provides a robust foundation for real-time communication. By implementing these improvements, we can achieve better performance, maintainability, and reliability while reducing code duplication and clarifying responsibility boundaries. 