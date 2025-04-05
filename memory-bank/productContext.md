# Product Context

- **Problem Statement:** Users struggle to accurately price items they want to sell locally and find relevant items or buyers/sellers nearby. Existing marketplaces may lack intelligent pricing guidance or efficient local discovery.
- **Solution Overview:** PRICIO AI provides a web platform featuring:
  - **AI Price Estimation:** Users upload photos to get instant price suggestions.
  - **Location-Based Search:** Users can find items and other users within their vicinity.
  - **Community Marketplace:** Facilitates listing items and connecting local buyers and sellers.
  - **Real-time Updates:** Notifications for relevant activities.
  - Standard features like user profiles, chat, and history.
- **User Experience Goals:**
  - Provide quick and helpful AI-driven price estimates.
  - Make local discovery of items and users easy and intuitive.
  - Foster a simple and effective platform for local buying and selling.
    - Ensure seamless user onboarding and real-time interaction (chat, notifications).
- **Key Workflows (Refined based on Navigation & CreatePost):**
  - **Authentication:** User -> `/signin` or `/signup` -> Verification -> Signin -> Redirect to `/explore`.
  - **Price Estimation/Listing:**
    - User -> `/createpost` -> Select Currency -> Upload Photo(s).
    - Option 1: Manually enter Price/Description -> Save to History.
    - Option 2: Trigger AI Analysis (`/api/ai/chat`) -> Engage in Chat (`ChatAIModal`) to refine details -> AI suggests Price/Description -> Save to History.
    - (From History?) -> Publish Item (`/api/explore` POST) -> Item appears in `/explore`.
  - **Discovery:**
    - User -> `/explore` -> Browse/Search items -> Filter by Radius.
    - User -> `/explore` -> Click "Around" -> `/around` (Location-specific view).
  - **Interaction:** User -> `/explore` or `/around` -> Click Item/User Avatar -> `/chat/[userId]` -> Real-time messaging.
    - Chat includes a structured "Object Discussion" feature (`ObjectDiscussionData`) for negotiating specific items (price, location, time, status).
  - **Profile Management:** User -> (Access via `/api/editprofile`, UI likely linked from History/Avatar) -> Update details/image.
  - **Item Lifecycle & History:**
    - Item created/estimated -> Stored in `histories` collection (accessible via `/history` page?).
    - User publishes item -> Item copied/linked to `explore` collection (visible on `/explore` page).
    - User unpublishes item -> Item removed from `explore`, link removed from `histories`.
  - **History Review:**
    - User -> `/chathistory` (Messages link) -> Review past conversations.
    - User -> `/history` (Avatar link) -> Review items created/estimated (potentially including unpublished items).
  - **Sharing:** User -> (From Create Post/History?) -> Generate Share Card -> Get shareable link/image.
  - **Sign Out:** User -> Click Sign Out -> Session terminated -> Redirect to `/`.

_This file explains the 'why' behind the project, the problems it solves, how it should work from a user perspective, and the desired user experience. (Updated based on LandingContent, Navigation, explore API, CreatePost)._
