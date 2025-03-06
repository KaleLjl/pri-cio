# Socket Service Reorganization Implementation Plan

## Overview
This document outlines our approach to reorganizing the socket functionality in the application. We're adopting a hybrid approach where global socket operations remain in context while specialized functionality moves to hooks.

## Implementation Progress

### Stage 1: Build Service Layer ✅
- ✅ Created socket and cache service modules
- ✅ Implemented core functionality with no React dependencies
- ✅ Created types for services
- ✅ Refactored to separate socket concerns from cache integration

### Stage 2: Create Hook Integration Layer ✅
- ✅ Implemented socket-cache integration in hooks
- ✅ Created useSocketConnection hook for core integration
- ✅ Simplified hook architecture by removing unnecessary abstraction layers
- ✅ Consolidated room management into useSocketMessages

### Stage 3: Hook Layer Optimization ✅
- ✅ Removed useSocketChat and useSocketRoom to reduce duplication
- ✅ Enhanced useSocketMessages to handle room management
- ✅ Updated ChatMessage type to include receiverId
- ✅ Improved error handling and type safety

### Stage 4: Context-Hook Hybrid Architecture ⏳
- ⏳ Refactor context to focus on global socket operations
- ⏳ Move message-specific functionality to hooks
- ⏳ Establish clear boundaries between context and hooks
- ⏳ Update components to use the appropriate source

### Stage 5: Component Migration ⏭️
- ⏭️ Create test components to validate the new architecture
- ⏭️ Migrate existing components to use hooks directly where appropriate
- ⏭️ Maintain context usage for global operations
- ⏭️ Add comprehensive error handling and loading states

## Responsibility Division

### Socket Context Responsibilities (Global)
- Socket connection management (connect/disconnect)
- Connection status tracking (isConnected)
- Global event listeners registration
- Room management (join/leave)
- Handling reconnection logic
- Providing access to the socket instance

### Hook Responsibilities (Specialized)
- Message sending and receiving
- Typing status management
- Read receipts and message status
- Conversation-specific logic
- UI state management (loading, sending, etc.)
- Component-specific caching

## Current Architecture

```
src/services/
├── socket/          # Socket-only concerns
│   ├── socketClient.ts     # Raw socket.io operations
│   ├── socketService.ts    # Socket business logic
│   ├── socketEvents.ts     # Event definitions and handlers
│   └── types.ts            # Socket-related types
└── cache/           # Cache-only concerns
    ├── chatCacheService.ts # Chat data caching
    └── types.ts            # Cache-related types

src/lib/hooks/chat/socket/   # React integration layer
├── useSocketConnection.ts   # Core socket-cache integration
└── useSocketMessages.ts     # High-level message operations

src/lib/context/
└── NewSocketContext.tsx     # Global socket context (to be refactored)
```

## Target Architecture

```
src/services/         # Service layer (unchanged)
├── socket/           # Socket services
└── cache/            # Cache services

src/lib/hooks/chat/socket/   # Specialized hook layer
├── useSocketMessages.ts     # Message-specific operations
└── useConversation.ts       # Conversation management

src/lib/context/
└── SocketContext.tsx        # Global socket operations only
```

## Benefits of Hybrid Architecture

1. **Clear Division of Responsibilities**
   - Context handles global, application-wide concerns
   - Hooks handle component-specific, specialized functionality
   - Clearer mental model for developers

2. **Improved Performance**
   - Reduced re-renders through proper context scoping
   - More granular updates through specialized hooks
   - Components only subscribe to relevant parts of state

3. **Better Developer Experience**
   - More intuitive API surface
   - Easier to understand data flow
   - Simpler debugging and testing

4. **Scalable Architecture**
   - Easier to add new features
   - Better separation of concerns
   - More maintainable in the long term

## Next Steps

1. **Refactor the Socket Context**
   - Focus on global operations
   - Remove specialized functionality
   - Provide clear, minimal API

2. **Enhance Specialized Hooks**
   - Move message functionality to useSocketMessages
   - Move conversation functionality to useConversation
   - Ensure proper error handling and loading states

3. **Update Components**
   - Use context for global operations
   - Use hooks for specialized functionality
   - Create example components demonstrating the approach

4. **Documentation & Testing**
   - Document the new architecture
   - Create usage examples
   - Test both context and hooks thoroughly

## Implementation Guide

### Socket Context Usage (Global Operations)
```typescript
function GlobalComponent() {
  const { isConnected, joinRoom, leaveRoom } = useSocketContext();
  
  // Use for global operations like joining/leaving rooms
  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(roomId);
      return () => leaveRoom(roomId);
    }
  }, [isConnected, roomId, joinRoom, leaveRoom]);
}
```

### Hook Usage (Specialized Operations)
```typescript
function ChatComponent() {
  const { handleMessageSubmit, isSending, handleTyping } = useSocketMessages({
    conversationId,
    userId
  });
  
  // Use for message-specific operations
  const sendMessage = () => {
    handleMessageSubmit(messageText, otherUserId);
  };
}
```

## Migration Guide

1. **For New Components**
   ```typescript
   function ChatComponent() {
     const { handleMessageSubmit, isSending } = useSocketMessages({
       conversationId,
       userId
     });
   }
   ```

2. **Replacing Context Usage**
   - Replace useSocket() with appropriate hooks
   - Use useSocketMessages for message operations
   - Remove context dependencies gradually

3. **Error Handling**
   - Use try/catch blocks for async operations
   - Handle connection status appropriately
   - Provide user feedback for errors 