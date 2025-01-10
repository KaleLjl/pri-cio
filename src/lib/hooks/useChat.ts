import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { default as socketIOClient } from 'socket.io-client';
import { ChatMessage, ChatUser, MessageStatus } from '@/lib/types/chat';

interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  otherUser: ChatUser;
}

interface ChatHookResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  inputMessage: string;
  isSending: boolean;
  hasMore: boolean;
  setInputMessage: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
}

export function useChat(props: UseChatProps | null): ChatHookResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch messages with pagination and retry mechanism
  const fetchMessages = useCallback(async (page = 1, shouldRetry = true) => {
    if (!props?.conversationId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&page=${page}&limit=20`,
        { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setHasMore(data.hasMore);
      
      setMessages(prev => {
        const newMessages = [...prev];
        data.messages.forEach(message => {
          if (!newMessages.find(m => m._id === message._id)) {
            newMessages.push(message);
          }
        });
        return newMessages.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      // Reset retry count on successful fetch
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching messages:', err);
      
      if (shouldRetry && retryCount < maxRetries) {
        // Exponential backoff retry
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`Retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchMessages(page, true);
        }, retryDelay);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      }
    } finally {
      setIsLoading(false);
    }
  }, [props?.conversationId, retryCount]);

  // Cleanup retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore) return;
    const nextPage = currentPage + 1;
    await fetchMessages(nextPage);
    setCurrentPage(nextPage);
  }, [currentPage, hasMore, fetchMessages]);

  // Send message with status
  const sendMessage = useCallback(async (content: string) => {
    if (!props?.conversationId) return;
    
    setIsSending(true);
    const tempId = Date.now().toString();
    const tempMessage: ChatMessage = {
      _id: tempId,
      conversationId: props.conversationId,
      senderId: props.currentUserId,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: props.conversationId, content }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();
      newMessage.status = 'sent';
      
      // Emit the message through socket
      socketRef.current?.emit('send-message', newMessage);
      
      // Update local messages
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? newMessage : msg
      ));
      setInputMessage('');
    } catch (err) {
      // Update message status to error
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...msg, status: 'error' as MessageStatus } : msg
      ));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [props?.conversationId, props?.currentUserId]);

  // Handle typing status
  const handleTyping = useCallback((typing: boolean) => {
    if (!props?.conversationId || !props?.currentUserId) return;
    
    socketRef.current?.emit('typing', {
      conversationId: props.conversationId,
      userId: props.currentUserId,
      typing,
    });
  }, [props?.conversationId, props?.currentUserId]);

  // Handle input change with debounced typing indicator
  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    handleTyping(true);

    // Set new timeout to emit typing stop
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  }, [handleTyping]);

  // Initialize socket connection
  useEffect(() => {
    if (!props?.conversationId || !props?.currentUserId || !props?.otherUser?._id) {
      return;
    }

    let socket: Socket | null = null;

    const socketInitializer = async () => {
      try {
        // Make sure socket server is initialized
        const authResponse = await fetch('/api/users/me');
        if (!authResponse.ok) {
          throw new Error('Failed to authenticate');
        }
        const userData = await authResponse.json();
        
        const newSocket = socketIOClient(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
          path: '/api/socket',
          autoConnect: true,
          reconnection: true,
          transports: ['websocket'],
          query: {
            userId: userData._id
          }
        });

        newSocket.on('connect', () => {
          console.log('Connected to socket server');
          newSocket.emit('join-room', props.conversationId);
        });

        newSocket.on('new-message', (message: ChatMessage) => {
          setMessages(prev => [...prev, message]);
        });

        newSocket.on('user-typing', (data: { userId: string; typing: boolean }) => {
          if (data.userId === props.otherUser._id) {
            setIsTyping(data.typing);
          }
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from socket server');
        });

        socket = newSocket;
        socketRef.current = newSocket;
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    socketInitializer();

    return () => {
      if (socket) {
        socket.emit('leave-room', props.conversationId);
        socket.disconnect();
      }
    };
  }, [props]);

  // Initial message fetch
  useEffect(() => {
    if (props?.conversationId) {
      fetchMessages();
    }
  }, [fetchMessages, props?.conversationId]);

  // Socket event handlers for message status updates
  useEffect(() => {
    if (!socketRef.current || !props?.conversationId) return;

    socketRef.current.on('message-delivered', (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, status: 'delivered' as MessageStatus } : msg
      ));
    });

    socketRef.current.on('message-read', (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, status: 'read' as MessageStatus } : msg
      ));
    });

    return () => {
      socketRef.current?.off('message-delivered');
      socketRef.current?.off('message-read');
    };
  }, [props?.conversationId]);

  return {
    messages,
    isLoading: isLoading && !!props,
    error,
    isTyping,
    inputMessage,
    isSending,
    hasMore,
    setInputMessage: handleInputChange,
    sendMessage,
    loadMoreMessages,
  };
} 