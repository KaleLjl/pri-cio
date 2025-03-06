import React from 'react';
import { useChat } from '@/context/ChatContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import { CURRENCIES } from '@/components/main/CreatePost';
import { ExploreItem } from '@/lib/types/explore';

const MessageInput: React.FC = () => {
  const { 
    inputMessage, 
    handleMessageInput, 
    handleSubmit, 
    showMyPosts, 
    setShowMyPosts, 
    myPosts, 
    isLoadingMyPosts, 
    isSendingMessage, 
    dict,
    isPostInDiscussion,
    setSelectedPost,
    getPrimaryImage
  } = useChat();

  return (
    <div className="p-4 border-t border-gray-700/50">
      <form onSubmit={handleSubmit} className="flex gap-2">
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
                  myPosts.map((post: ExploreItem) => (
                    <div
                      key={post._id}
                      className="flex items-start space-x-3 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all relative"
                      onClick={() => {
                        if (isPostInDiscussion(post._id)) {
                          alert(dict.objectDiscussion?.alreadyInDiscussion || "This item is already in discussion.");
                          return;
                        }
                        setSelectedPost(post);
                        setShowMyPosts(false);
                      }}
                    >
                      {isPostInDiscussion(post._id) && (
                        <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                          {dict.objectDiscussion?.inDiscussion || "In Discussion"}
                        </div>
                      )}
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <ImageWithFallback
                          src={getPrimaryImage(post.images)}
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
          disabled={!inputMessage.trim() || isSendingMessage}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
        >
          {isSendingMessage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            dict.chat.actions.send
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput; 