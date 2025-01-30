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
  history: {
    loading: "加载中...",
    error: "发生错误",
    noHistory: "暂无历史记录",
    editProfile: "编辑个人资料",
    savedItems: "已保存",
    postedItems: "已发布",
    dealingItems: "交易中",
    itemCount: "项",
    noDescription: "暂无描述",
    noDealingItems: "暂无交易项目",
    buyer: "买家",
    seller: "卖家",
    complete: "完成",
    cancel: "取消",
    actions: {
      post: "发布",
      posting: "发布中...",
      edit: "编辑",
      delete: "删除",
      deleting: "删除中...",
      unpublish: "取消发布",
      unpublishing: "取消发布中...",
    },
    toast: {
      success: "操作成功！",
      error: "发生错误",
    },
    locationModal: {
      title: "位置权限",
      message: "是否允许访问您的位置？",
      allow: "允许",
      deny: "拒绝",
    },
  },
  // ... rest of the dictionary
} as const;

export type Dictionary = typeof dictionary; 