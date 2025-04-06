import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { ChatUser, MessagesResponse } from "@/lib/types/chat";
import { ExploreItem } from "@/lib/types/explore";

interface UseChatDataProps {
  userId: string;
  conversationId?: string;
  otherUser?: ChatUser | null;
}

// 添加帮助函数
const getPrimaryImage = (
  images: Array<{ id: string; url: string; isPrimary: boolean }>
) => {
  const primaryImage = images.find((img) => img.isPrimary) || images[0];
  return primaryImage?.url || "";
};

export function useChatData({
  userId,
  conversationId,
  otherUser,
}: UseChatDataProps) {
  // Fetch current user data
  const {
    data: currentUser,
    isLoading: isLoadingCurrentUser,
    error: currentUserError,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await fetch("/api/users/me");
      if (!response.ok) throw new Error("Failed to fetch current user");
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch messages
  // Removed redundant fetch for other user data - rely on otherUser prop
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useInfiniteQuery<MessagesResponse>({
    queryKey: ["chat-messages", conversationId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!conversationId) throw new Error("No conversation ID");

      const url = new URL("/api/chat/messages", window.location.origin);
      url.searchParams.append("conversationId", conversationId);
      if (pageParam) {
        url.searchParams.append("before", pageParam as string);
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch messages");

      return response.json();
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: MessagesResponse) => {
      if (!lastPage.hasMore) return undefined;
      const firstMessage = lastPage.messages[0];
      return firstMessage?._id;
    },
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: Infinity,
    refetchOnReconnect: true,
  });

  // Fetch user posts
  const {
    data: userPosts = [],
    isLoading: isLoadingPosts,
    error: postsError,
  } = useQuery({
    queryKey: ["explore-posts", otherUser?._id],
    queryFn: async () => {
      if (!otherUser?._id) throw new Error("No other user ID");
      const response = await fetch(`/api/explore?userId=${otherUser._id}`);
      if (!response.ok) throw new Error("Failed to fetch user posts");
      return response.json();
    },
    enabled: !!otherUser?._id,
  });

  // Get typing status from cache (managed via setQueryData elsewhere)
  const { data: isTyping = false } = useQuery<boolean>({
    queryKey: ["chat-typing-status", otherUser?._id],
    // Provide a dummy queryFn as it's only read from cache updated by setQueryData
    queryFn: async () => false, // Does not fetch, just satisfies requirement
    initialData: false,
    staleTime: Infinity, // Prevent automatic refetching
    gcTime: Infinity, // Keep data in cache while component is mounted
    enabled: !!otherUser?._id, // Ensure query is enabled only when otherUser ID exists
  });

  // 修改 uniqueMessages 的处理逻辑
  const messages = messagesData?.pages.flatMap((page) => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(
      messages.map((msg) => {
        if (
          typeof msg.content !== "string" &&
          msg.content.type === "object_discussion"
        ) {
          // 确保消息内容包含完整的图片数组
          const updatedContent = {
            ...msg.content,
            images: msg.content.images || [], // 保持原有的图片数组
            imageUrl: getPrimaryImage(msg.content.images || []), // 为了向后兼容
          };
          return [
            `${msg.content.postId}-${msg.createdAt}`,
            {
              ...msg,
              content: updatedContent,
            },
          ];
        }
        return [msg._id, msg];
      })
    ).values()
  ).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 确保 userPosts 数据也使用正确的图片格式
  const formattedUserPosts = userPosts.map((post: ExploreItem) => ({
    ...post,
    imageUrl: getPrimaryImage(post.images),
  }));

  return {
    // User data
    currentUser,
    // otherUserData removed
    isLoadingUsers: isLoadingCurrentUser, // Only depends on currentUser fetch now
    userError: currentUserError?.message || null, // Only depends on currentUser fetch now

    // Messages data
    messages: uniqueMessages,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    messagesError: messagesError?.message || null,
    fetchNextPage: async () => {
      await fetchNextPage();
    },

    // Posts data
    userPosts: formattedUserPosts,
    isLoadingPosts,
    postsError: postsError?.message || null,

    // Typing status
    isTyping,
  };
}
