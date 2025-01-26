export const dictionary = {
  chat: {
    loading: {
      user: "加载用户中...",
      chat: "加载聊天中...",
    },
    error: {
      fetch: "加载聊天失败",
      self: "不能和自己聊天",
    },
    input: {
      placeholder: "输入消息...",
    },
    status: {
      sending: "发送中...",
      sent: "已发送",
      delivered: "已送达",
      read: "已读",
      error: "错误",
    },
    actions: {
      send: "发送",
      back: "返回",
    },
    typing: "正在输入...",
    noPosts: "暂无发布的物品",
  },
  // ... rest of the dictionary
} as const;

export type Dictionary = typeof dictionary; 