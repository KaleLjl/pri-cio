'I have basically completed the restructuring of my chat functionality. My chat functionality is divided into three layers: the first layer is the top-level component @Chat, the second layer is the hook layer @chat which contains component-related hooks, and the third layer is the server and client layer, which abstracts specific logic like socket, cache, and API calls. However, my restructuring currently has several issues. Issue 1 is that I have a special component called "objectionDiscussion" whose hooks haven't been restructured according to the hook-server-client pattern, and its logic overlaps with other hooks that I haven't restructured yet. The second issue is that I haven't started integrating all components and hooks. Please understand my requirements and provide me with a restructuring plan.'
‘

## Overall Restructuring Logic
- Component Layer: Uses component-related hooks
- Hook Layer: Write abstracted hooks that interact with components + specific business logic
- Service and Client Layer: Functions that don't directly interact with components but interact with the backend

## Log:
- Restructured chat/chat history page-related hooks according to the overall restructuring logic
- Testing + Debug: Can now send messages
- Testing + Debug: Chat background color not showing, scroll bar disappeared
- Testing + Debug: Cannot fetch previous chat messages
- Testing + Debug: When sending messages, it's like talking to yourself
- Moved InitialChat part into Chat Context
- Properly setup the socket server
- Seted up the cache server but not properly yet
- Debug:Set the socket propelly with the server side, client side named allign with each other
- Debug: now the chat would real-time update(the reason is the react-query update config not setted propely)
### TODO
- Strtuctre the chat-realted hook to let me readable 
- Testing + Debug: Check if chat status is transmitted in real-time
- Testing + Debug: ChatHistory related issues
- Testing + Debug: Verify read/unread confirmation
- Delete all the unused debug log
- Final cleanup of hooks and component garbage
- Move ChatUI parts into ChatContext

- Integrate "negotiation component" hooks into existing architecture
- Review which parts of chatcontext exist and if some can be removed
- Debug: When two users initialize in the same browser and refresh, they modify each other's messages