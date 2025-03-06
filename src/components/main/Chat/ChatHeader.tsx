import React from 'react';
import { useRouter } from 'next/navigation';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import { useChat } from '@/context/ChatContext';

const ChatHeader: React.FC = () => {
  const { 
    otherUser, 
    isTyping, 
    userPosts, 
    isLoadingPosts, 
    showPosts, 
    handleTogglePosts, 
    deleteMessages,
    dict,
    lang
  } = useChat();
  
  const router = useRouter();

  return (
    <div className="absolute top-16 left-0 right-0 z-20">
      <div className="container max-w-4xl mx-auto">
        <div className="flex flex-col mx-4">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-800/95 backdrop-blur-sm rounded-t-lg shadow-lg">
            <button
              onClick={() => router.push(`/${lang}/chathistory`)}
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
                src={otherUser?.avatarUrl || ''}
                alt={otherUser?.name || 'User'}
                width={48}
                height={48}
                className="object-cover rounded-full"
                isAvatar={true}
                priority
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{otherUser?.name || 'User'}</h1>
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
                      alert(error instanceof Error ? error.message : dict.chatHistory.toast.deleteError);
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
        </div>
      </div>
    </div>
  );
};

export default ChatHeader; 