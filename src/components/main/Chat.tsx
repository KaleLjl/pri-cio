'use client';
import { useRouter } from 'next/navigation';
import { ObjectDiscussionData, ChatProps } from '@/lib/types/chat';
import { useLanguage } from '@/lib/context/LanguageContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import Loading from '@/components/shared/Loading';
import { ExploreItem } from '@/lib/types/explore';
import { CURRENCIES } from '@/components/main/App';
import { useQueryClient } from '@tanstack/react-query';
import ObjectDiscussion from '@/components/shared/ObjectDiscussion';
import {
  useInitializeChat,
  useChatData,
  useSocketChat,
  useMessageActions,
  useChatUI,
  useObjectDiscussionUI,
} from '@/lib/hooks/chat';
import { format } from 'date-fns';

export default function Chat({ userId }: ChatProps) {
  const { dict } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use the initialization hook
  const {
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
  } = useInitializeChat({ userId });

  // Use the chat data hook
  const {
    messages,
    userPosts,
    isLoadingPosts,
    isTyping,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useChatData({
    userId,
    conversationId,
    otherUser,
  });

  // Use the socket chat hook
  const { handleTyping } = useSocketChat({
    conversationId,
    currentUserId,
    otherUserId: otherUser?._id,
  });

  // Use the message actions hook
  const {
    sendMessage,
    deleteMessages,
    isSending,
    isDeleting,
  } = useMessageActions({
    conversationId,
    currentUserId,
    otherUserId: otherUser?._id,
  });

  // Use the chat UI hook
  const {
    messagesEndRef,
    messagesContainerRef,
    loadMoreRef,
    inputMessage,
    showPosts,
    showMyPosts,
    myPosts,
    isLoadingMyPosts,
    loadingMore,
    setShowMyPosts,
    setShowPosts,
    handleScroll,
    handleTogglePosts,
    handlePostClick,
    handleMessageInput,
    handleMessageSubmit,
  } = useChatUI({
    messages,
    currentUserId,
    conversationId,
    handleTyping,
    fetchNextPage,
    hasNextPage,
  });

  // Use the object discussion UI hook
  const {
    selectedPost,
    editingContent,
    setSelectedPost,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    isCurrentUserSeller,
    isPostCompleted,
    isLastDiscussionMessage,
    setEditingContent,
  } = useObjectDiscussionUI({
    currentUserId: currentUserId || '',
    messages,
    sendMessage,
    queryClient,
    setShowPosts,
    dict,
  });

  const onSubmit = async (e: React.FormEvent) => {
    const message = await handleMessageSubmit(e);
    if (message) {
      await sendMessage(message);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="max-w-md w-full space-y-4 text-center px-4">
          <div className="text-xl text-red-500">{error}</div>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            {dict.chat.actions.back}
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing || !otherUser) {
    return <Loading text={dict.chat.loading.chat} />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="absolute inset-0 flex flex-col">
        {/* Chat Header - Fixed at top below navigation */}
        <div className="absolute top-16 left-0 right-0 z-20">
          <div className="container max-w-4xl mx-auto">
            <div className="flex flex-col mx-4">
              {/* User Info */}
              <div className="flex items-center space-x-4 p-4 bg-gray-800/95 backdrop-blur-sm rounded-t-lg shadow-lg">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                  aria-label={dict.chat.actions.back}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/50">
                  <ImageWithFallback
                    src={otherUser.avatarUrl || ''}
                    alt={otherUser.name || 'User'}
                    width={48}
                    height={48}
                    className="object-cover rounded-full"
                    isAvatar={true}
                    priority
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold">{otherUser.name || 'User'}</h1>
                  {isTyping && (
                    <p className="text-sm text-purple-400">{dict.chat.typing}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!isLoadingPosts && userPosts.length > 0 && (
                    <button
                      onClick={handleTogglePosts}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-sm text-white"
                      title={showPosts ? "Hide posts" : "Show posts"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform duration-200 ${showPosts ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (window.confirm(dict.chatHistory.deleteConfirm.message)) {
                        try {
                          await deleteMessages();
                          alert(dict.chatHistory.toast.deleteSuccess);
                        } catch (error) {
                          console.error("Failed to delete messages:", error);
                          alert(dict.chatHistory.toast.deleteError);
                        }
                      }
                    }}
                    className="p-2 hover:bg-red-600 rounded-lg transition-colors text-sm text-white"
                    title={dict.chatHistory.deleteConfirm.title}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* User's Posts */}
              {!isLoadingPosts && userPosts.length > 0 && showPosts && (
                <div className="bg-gray-800/70 backdrop-blur-sm p-4 rounded-b-lg shadow-lg border-t border-gray-700/50">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800">
                    <div className="flex space-x-4 pb-2">
                      {userPosts.map((post: ExploreItem) => (
                        <div
                          key={post._id}
                          className="flex-none w-32 bg-gray-700/30 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                          onClick={() => {
                            handlePostClick(post);
                            setSelectedPost(post);
                          }}
                        >
                          <div className="relative w-32 h-32">
                            <ImageWithFallback
                              src={post.imageUrl}
                              alt={post.description}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-2">
                            <p className="text-sm font-medium truncate">
                              {CURRENCIES.find(c => c.value === post.currency)?.symbol} {post.price}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {post.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container - Scrollable area */}
        <div className="absolute inset-0 pt-36 pb-6">
          <div className="container max-w-4xl mx-auto h-full">
            <div className="h-full mx-4 bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg flex flex-col">
              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
                onScroll={handleScroll}
              >
                {/* Load More Messages Indicator */}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  </div>
                )}
                <div ref={loadMoreRef} />
                
                {/* Messages List */}
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${
                        message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-4 ${
                          message.senderId === currentUserId
                            ? 'bg-purple-600/90 backdrop-blur-sm shadow-lg hover:bg-purple-500/90 transition-colors'
                            : 'bg-gray-700/90 backdrop-blur-sm shadow-lg hover:bg-gray-600/90 transition-colors'
                        }`}
                      >
                        {typeof message.content === 'string' ? (
                          <p className="text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                            {message.content}
                          </p>
                        ) : message.content.type === 'object_discussion' ? (
                          <div 
                            className={`space-y-3 max-w-sm cursor-pointer hover:opacity-90 transition-opacity ${
                              (message.content as ObjectDiscussionData).isCompleted || isPostCompleted(
                                (message.content as ObjectDiscussionData).postId,
                                messages
                              ) ? 'opacity-50' : ''
                            }`}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).tagName === 'BUTTON') {
                                return;
                              }
                              const currentContent = message.content as ObjectDiscussionData;
                              if (!currentContent.isCompleted && !isPostCompleted(currentContent.postId, messages)) {
                                handleObjectDiscussionClick(currentContent, message.senderId);
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="relative w-20 h-20 flex-shrink-0">
                                <div className="absolute -top-2 -left-2 z-10">
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                    isCurrentUserSeller((message.content as ObjectDiscussionData).postId, myPosts, userPosts) ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                                  }`}>
                                    {isCurrentUserSeller((message.content as ObjectDiscussionData).postId, myPosts, userPosts)
                                      ? dict.objectDiscussion?.sellerLabel 
                                      : dict.objectDiscussion?.buyerLabel}
                                  </span>
                                </div>
                                <ImageWithFallback
                                  src={(message.content as ObjectDiscussionData).imageUrl}
                                  alt={(message.content as ObjectDiscussionData).description}
                                  fill
                                  className={`object-cover rounded-lg ${
                                    (message.content as ObjectDiscussionData).isCompleted || isPostCompleted((message.content as ObjectDiscussionData).postId, messages) ? 'grayscale' : ''
                                  } ${
                                    isCurrentUserSeller((message.content as ObjectDiscussionData).postId, myPosts, userPosts) ? 'ring-2 ring-blue-500' : 'ring-2 ring-orange-500'
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                                  {(message.content as ObjectDiscussionData).description}
                                </p>
                                <div className="space-y-1.5 text-sm">
                                  <p className="flex items-center text-gray-300">
                                    <span className="text-gray-400 w-20">{dict.objectDiscussion?.price}:</span>
                                    <span className={`ml-1 truncate ${
                                      isCurrentUserSeller((message.content as ObjectDiscussionData).postId, myPosts, userPosts) ? 'text-blue-400' : 'text-orange-400'
                                    }`}>
                                      {CURRENCIES.find(c => c.value === (message.content as ObjectDiscussionData).currency)?.symbol}
                                      {(message.content as ObjectDiscussionData).suggestedPrice}
                                    </span>
                                    {(message.content as ObjectDiscussionData).suggestedPrice !== (message.content as ObjectDiscussionData).originalPrice && (
                                      <span className="ml-2 text-xs text-gray-400 truncate">
                                        (Original: {CURRENCIES.find(c => c.value === (message.content as ObjectDiscussionData).currency)?.symbol}
                                        {(message.content as ObjectDiscussionData).originalPrice})
                                      </span>
                                    )}
                                  </p>
                                  <p className="flex items-center text-gray-300">
                                    <span className="text-gray-400 w-20">{dict.objectDiscussion?.location}:</span>
                                    <span className="ml-1 truncate">{(message.content as ObjectDiscussionData).location}</span>
                                  </p>
                                  <p className="flex items-center text-gray-300">
                                    <span className="text-gray-400 w-20">{dict.objectDiscussion?.meetingTime}:</span>
                                    <span className="ml-1 truncate">
                                      {new Date((message.content as ObjectDiscussionData).meetingTime).toLocaleString()}
                                    </span>
                                  </p>
                                </div>
                                {message.senderId !== currentUserId && 
                                  !(message.content as ObjectDiscussionData).isCompleted && 
                                  !isPostCompleted((message.content as ObjectDiscussionData).postId, messages) &&
                                  isLastDiscussionMessage(message, messages) && (
                                  <div className="mt-3">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const currentContent = message.content as ObjectDiscussionData;
                                        handleDealComplete(currentContent, message.senderId);
                                      }}
                                      className={`px-3 py-1 text-sm text-white rounded-lg transition-colors ${
                                        isCurrentUserSeller((message.content as ObjectDiscussionData).postId, myPosts, userPosts) 
                                          ? 'bg-blue-500 hover:bg-blue-400' 
                                          : 'bg-orange-500 hover:bg-orange-400'
                                      }`}
                                    >
                                      {isCurrentUserSeller((message.content as ObjectDiscussionData).postId, myPosts, userPosts)
                                        ? dict.objectDiscussion?.sellerLabel 
                                        : dict.objectDiscussion?.buyerLabel}
                                    </button>
                                  </div>
                                )}
                                {((message.content as ObjectDiscussionData).isCompleted || isPostCompleted((message.content as ObjectDiscussionData).postId, messages)) && (
                                  <div className="mt-2">
                                    <span className="text-sm text-green-500">
                                      {dict.objectDiscussion?.completed || "Deal Completed"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <span className="text-xs text-gray-300">
                            {format(new Date(message.createdAt), 'HH:mm')}
                          </span>
                          {message.senderId === currentUserId && (
                            <span className="text-xs text-gray-300">
                              {message.status === 'sending' && dict.chat.status.sending}
                              {message.status === 'sent' && dict.chat.status.sent}
                              {message.status === 'delivered' && dict.chat.status.delivered}
                              {message.status === 'read' && dict.chat.status.read}
                              {message.status === 'error' && dict.chat.status.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Object Discussion */}
              {(selectedPost || editingContent) && (
                <ObjectDiscussion
                  post={selectedPost || {
                    _id: editingContent!.postId,
                    imageUrl: editingContent!.imageUrl,
                    description: editingContent!.description,
                    price: editingContent!.originalPrice,
                    currency: editingContent!.currency,
                    historyId: editingContent!.historyId,
                  } as ExploreItem}
                  initialValues={editingContent ? {
                    price: editingContent.suggestedPrice,
                    location: editingContent.location,
                    meetingTime: editingContent.meetingTime,
                  } : undefined}
                  onClose={() => {
                    setSelectedPost(null);
                    setEditingContent(null);
                  }}
                  onSubmit={handleDiscussionSubmit}
                />
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700/50">
                <form onSubmit={onSubmit} className="flex gap-2">
                  <div className="relative flex-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMyPosts(!showMyPosts)}
                      className="bg-gray-700/50 text-white px-3 rounded-lg hover:bg-gray-600/50 transition-all flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={handleMessageInput}
                      placeholder={dict.chat.input.placeholder}
                      className="flex-1 bg-gray-700/50 backdrop-blur-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                    />
                    {showMyPosts && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 max-h-96 overflow-y-auto">
                        <div className="p-4 space-y-4">
                          {isLoadingMyPosts ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                            </div>
                          ) : myPosts.length === 0 ? (
                            <p className="text-center text-gray-400 py-4">{dict.explore.noPostsFound}</p>
                          ) : (
                            myPosts.map((post) => (
                              <div
                                key={post._id}
                                className="flex items-start space-x-3 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all"
                                onClick={() => {
                                  handlePostClick(post);
                                  setShowMyPosts(false);
                                }}
                              >
                                <div className="relative w-16 h-16 flex-shrink-0">
                                  <ImageWithFallback
                                    src={post.imageUrl}
                                    alt={post.description}
                                    fill
                                    className="object-cover rounded-lg"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {CURRENCIES.find(c => c.value === post.currency)?.symbol} {post.price}
                                  </p>
                                  <p className="text-xs text-gray-400 line-clamp-2">
                                    {post.description}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      dict.chat.actions.send
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 