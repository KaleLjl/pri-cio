‘我已经基本完成了对我聊天功能的相关重构 ,我的聊天功能主要分为三层,第一层是最上层的组件@Chat  第二层是hook层, @chat  这里包含了与组件直接相关的hook 第三层则是server与client层, 这一层抽象了像是socket,cache,api调用的具体的逻辑.  但我的这一重构目前还有几个问题. 问题1. 就是我的聊天功能有一个特殊的组件叫做“objectionDisccusion” 这个组件里的hook 我还并没有按照 hook-server-client的方式重构,并且其逻辑有许多与其他hook重叠的我还没重构. 第二则是所有component与hook的融合我还没开始进行. 请你了解我的需求 给我一个重构的方案’ 

## 整体重构的逻辑
- 组件层:使用组件相关的hook
- Hook层:写抽象后 与组件进行交互的Hook+具体的业务的逻辑
- service与client层:没有实际与组件进行交互 而是与后端进行交互的function


## Log:
- 对聊天/聊天历史页面相关的hook按照整体重构的逻辑进行重构
- 测试+Debug:现在可以发送信息.
- 测试+Debug:聊天背景颜色不显示,scoll bar消失
- 测试+Debug:Fetching不了之前的聊天信息
- 测试+Debug:发送信息的时候 是自己在跟自己聊天
- 把InitialChat的部分放在了Chat Context里
### TODO
- 测试+Debug:消息是否实时进行
- 测试+Debug:聊天状态是否实时传输
- 测试+Debug:未读已读是否确认
- 最后清理Hook与组件垃圾
- 把ChatUI的部分转移到ChatContext之中

- 把“议价组件”的hook融合到现有的架构
- 看看chatcontext有哪些部分,是否可以删除掉一些