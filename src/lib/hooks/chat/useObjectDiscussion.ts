import { useState } from 'react';
import { ObjectDiscussionData } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { useContext } from 'react';
import { SocketContext } from '@/lib/context/SocketContext';
import { v4 as uuidv4 } from 'uuid';
import { useMessageActions } from '@/lib/hooks/chat/useMessageActions';

interface UseObjectDiscussionProps {
  currentUserId: string;
  messages: Array<{ 
    content: any; 
    _id: string; 
    senderId: string; 
    receiverId: string;
    conversationId: string;
  }>;
}

export const useObjectDiscussion = ({
  currentUserId,
  messages,
}: UseObjectDiscussionProps) => {
  const socket = useContext(SocketContext);
  const [selectedPost, setSelectedPost] = useState<ExploreItem | null>(null);
  const [editingContent, setEditingContent] = useState<ObjectDiscussionData | null>(null);

  // 使用 useMessageActions
  const { sendMessage } = useMessageActions({
    conversationId: messages[0]?.conversationId,
    currentUserId,
    otherUserId: messages[0]?.senderId === currentUserId ? messages[0]?.receiverId : messages[0]?.senderId,
    handleMessageSubmit: async () => ''
  });

  // Check if the discussion data has been modified
  const isDiscussionModified = (
    currentContent: ObjectDiscussionData,
    messages: Array<{ content: any; _id: string }>,
  ) => {
    // Get the last discussion message for this post
    const lastDiscussion = messages
      .filter(
        (msg) =>
          typeof msg.content !== 'string' &&
          msg.content.type === 'object_discussion' &&
          msg.content.postId === currentContent.postId,
      )
      .pop();

    if (!lastDiscussion || typeof lastDiscussion.content === 'string') return true;

    const lastContent = lastDiscussion.content as ObjectDiscussionData;

    // Check if any of the negotiable fields have been modified
    return (
      currentContent.suggestedPrice !== lastContent.suggestedPrice ||
      currentContent.location !== lastContent.location ||
      currentContent.meetingTime !== lastContent.meetingTime
    );
  };

  // Check if this is the last discussion message for this post
  const isLastDiscussionMessage = (
    message: { content: any; _id: string },
    messages: Array<{ content: any; _id: string }>,
  ) => {
    if (typeof message.content === 'string') return false;
    const content = message.content as ObjectDiscussionData;

    const discussionMessages = messages.filter((msg) => {
      if (typeof msg.content === 'string') return false;
      const msgContent = msg.content as ObjectDiscussionData;
      return (
        msgContent.type === 'object_discussion' && msgContent.postId === content.postId
      );
    });

    return discussionMessages[discussionMessages.length - 1]._id === message._id;
  };

  // Check if any discussion for this post is completed
  const isPostCompleted = (
    postId: string,
    messages: Array<{ content: any }>,
  ): boolean => {
    const discussionMessages = messages.filter(
      (msg) =>
        typeof msg.content !== 'string' &&
        msg.content.type === 'object_discussion' &&
        msg.content.postId === postId,
    );

    if (discussionMessages.length === 0) {
      return false;
    }

    const lastMessage = discussionMessages[discussionMessages.length - 1];
    return (lastMessage.content as ObjectDiscussionData).status === 'completed';
  };

  // Update this function to determine if current user is the seller based on history
  const isCurrentUserSeller = (
    postId: string,
    myPosts: ExploreItem[],
    userPosts: ExploreItem[],
  ) => {
    // If the post is from my posts (bottom + button), current user is the seller
    if (myPosts.some((post) => post._id === postId)) {
      return true;
    }
    // If the post is from other user's posts (top posts list), current user is the buyer
    if (userPosts.some((post) => post._id === postId)) {
      return false;
    }
    // Default to false if we can't determine
    return false;
  };

  // Modify the check if a post is already in discussion
  const isPostInDiscussion = (postId: string) => {
    // 找到这个帖子的所有讨论消息
    const discussionMessages = messages.filter(msg =>
      typeof msg.content !== 'string' &&
      msg.content.type === 'object_discussion' &&
      msg.content.postId === postId
    );

    // 如果没有讨论消息，返回 false
    if (discussionMessages.length === 0) {
      return false;
    }

    // 按时间排序，找到最新的一组讨论（相同的 discussingId）
    const latestMessage = discussionMessages[discussionMessages.length - 1];
    const latestDiscussingId = (latestMessage.content as ObjectDiscussionData).discussingId;

    // 检查这组讨论是否处于 discussing 状态
    const latestDiscussion = discussionMessages.filter(
      msg => typeof msg.content !== 'string' && 
      (msg.content as ObjectDiscussionData).discussingId === latestDiscussingId
    );

    const lastMessageOfLatestDiscussion = latestDiscussion[latestDiscussion.length - 1];
    return (lastMessageOfLatestDiscussion.content as ObjectDiscussionData).status === 'discussing';
  };

  // 检查帖子是否已完成或取消
  const isPostFinalized = (
    postId: string,
    discussingId: string,
    messages: Array<{ content: any }>,
  ): boolean => {
    // 找到所有相同 discussingId 的消息
    const discussionMessages = messages.filter(
      (msg) =>
        typeof msg.content !== 'string' &&
        msg.content.type === 'object_discussion' &&
        msg.content.discussingId === discussingId
    );

    if (discussionMessages.length === 0) {
      return false;
    }

    // 获取最后一条消息的状态
    const lastMessage = discussionMessages[discussionMessages.length - 1];
    return (lastMessage.content as ObjectDiscussionData).status === 'completed' || 
           (lastMessage.content as ObjectDiscussionData).status === 'canceled';
  };

//因为discussion组件本质上也是一个消息,所以使用sendmessage的hook来提交
  const handleDiscussionSubmit = async (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => {
    if (editingContent) {
      const discussionData: ObjectDiscussionData = {
        ...editingContent,
        suggestedPrice: data.price,
        location: data.location,
        meetingTime: data.meetingTime,
        status: 'discussing'
      };

      // 使用 sendMessage 而不是直接使用 socket
      await sendMessage(discussionData);
      setEditingContent(null);
    } else if (selectedPost) {
      // 创建新讨论
      const discussionData: ObjectDiscussionData = {
        type: 'object_discussion',
        postId: selectedPost._id,
        imageUrl: selectedPost.imageUrl,
        description: selectedPost.description,
        originalPrice: selectedPost.price,
        suggestedPrice: data.price,
        currency: selectedPost.currency,
        location: data.location,
        meetingTime: data.meetingTime,
        status: 'discussing',
        historyId: selectedPost.historyId,
        discussingId: uuidv4() // 为新讨论生成唯一ID
      };

      socket.sendMessage({
        _id: uuidv4(),
        conversationId: messages[0].conversationId,
        content: discussionData,
        senderId: currentUserId,
        receiverId: messages[0].senderId === currentUserId ? messages[0].receiverId : messages[0].senderId,
        createdAt: new Date().toISOString(),
        status: 'sending'
      });
      setSelectedPost(null);
    }
  };

  const handleObjectDiscussionClick = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
    messages: Array<{ content: any; senderId: string; receiverId: string }>,
  ) => {
    // 如果不是 discussing 状态，不做任何操作
    if (currentContent.status !== 'discussing') return;

    // If the message is from the current user, do nothing
    if (senderId === currentUserId) return;

    // Set the content for editing
    setEditingContent(currentContent);
  };

  const handleDealComplete = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    if (currentContent.status !== 'discussing') return;

    try {
      // 保留 HTTP 请求，因为需要在数据库中更新交易状态
      if (currentContent.postId && currentContent.historyId) {
        const response = await fetch(`/api/chat/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            historyId: currentContent.historyId,
            exploreId: currentContent.postId,
            buyerId: senderId === currentUserId ? currentUserId : messages[0].senderId,
            sellerId: senderId === currentUserId ? messages[0].senderId : currentUserId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete deal');
        }
      }

      // 然后通过 socket 发送消息更新聊天状态
      socket.sendMessage({
        _id: uuidv4(),
        conversationId: messages[0].conversationId,
        content: { ...currentContent, status: 'completed' as const },
        senderId: currentUserId,
        receiverId: messages[0].senderId === currentUserId ? messages[0].receiverId : messages[0].senderId,
        createdAt: new Date().toISOString(),
        status: 'sending'
      });
    } catch (error) {
      console.error('Error completing deal:', error);
      throw error;
    }
  };

  const handleCancelDiscussion = async (
    currentContent: ObjectDiscussionData,
  ) => {
    socket.sendMessage({
      _id: uuidv4(),
      conversationId: messages[0].conversationId,
      content: { ...currentContent, status: 'canceled' as const },
      senderId: currentUserId,
      receiverId: messages[0].senderId === currentUserId ? messages[0].receiverId : messages[0].senderId,
      createdAt: new Date().toISOString(),
      status: 'sending'
    });
  };

  return {
    selectedPost,
    setSelectedPost,
    editingContent,
    setEditingContent,
    isDiscussionModified,
    isLastDiscussionMessage,
    isPostCompleted,
    isCurrentUserSeller,
    isPostInDiscussion,
    isPostFinalized,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    handleCancelDiscussion,
  };
}; 