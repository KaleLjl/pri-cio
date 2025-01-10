import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { default as socketIOClient } from 'socket.io-client';
import { ChatMessage, ChatUser } from '@/lib/types/chat';

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
  setInputMessage: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(props: UseChatProps | null): ChatHookResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch messages
  const fetchMessages = useCallback(async (page = 1) => {
    if (!props?.conversationId) return;
    
    try {
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&page=${page}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(prev => [...prev, ...data].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [props?.conversationId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!props?.conversationId) return;
    
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
      
      // Emit the message through socket
      socketRef.current?.emit('send-message', newMessage);
      
      // Update local messages
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [props?.conversationId]);

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

  return {
    messages,
    isLoading: isLoading && !!props,
    error,
    isTyping,
    inputMessage,
    setInputMessage: handleInputChange,
    sendMessage,
  };
} 