# Active Context

- **Current Focus:** Detailed population of the Memory Bank through code analysis.
- **Recent Changes:** Analyzed key files (`package.json`, `auth.ts`, `page.tsx`, `LandingContent.tsx`, `api/ai/chat/route.ts`, `server/socket.ts`, `explore/page.tsx`, `Explore.tsx`, `useExplore.ts`, `layout.tsx`, `LayoutWrapper.tsx`, `Navigation.tsx`, type definitions, `mongodb.ts`, `api/explore/route.ts`, `createpost/page.tsx`, `CreatePost.tsx`) and updated all core Memory Bank files (`projectbrief.md`, `productContext.md`, `techContext.md`, `systemPatterns.md`, `progress.md`) with findings.
- **Next Steps:** User review of the populated Memory Bank files to verify accuracy, fill in remaining placeholders (e.g., Scope, Success Metrics, Current Status, Known Issues), and provide direction for further analysis or tasks.
- **Active Decisions/Considerations:** None currently. Awaiting user feedback.
- **Key Patterns/Preferences:** (Confirmed/Expanded during analysis)
  - Next.js App Router structure.
  - TypeScript throughout.
  - Heavy reliance on custom hooks for state management and feature logic (e.g., `useUpload...`, `useExplore`, `useHistory`, `useShareCard`).
  - Separation of concerns (components, lib, api, server).
  - Use of Tailwind CSS for styling, augmented by Headless UI and potentially Material UI.
  - React Query for server state management with specific caching strategies.
  - Socket.IO (dedicated server) for real-time features (chat, presence, explore updates).
  - MongoDB (`pri-cio` database) with specific collections (`explore`, `users`, `histories`).
  - OpenAI integration (GPT-4 Vision, GPT-4) for core AI features (price estimation).
  - Clear distinction between item creation/history (`histories` collection) and published items (`explore` collection).
  - Structured data types for core entities (`ExploreItem`, `ChatMessage`, `ObjectDiscussionData`, `UserProfile`).
- **Learnings/Insights:** The project is a feature-rich platform for AI-powered item price estimation and local marketplace interactions. Key features include location-based filtering, real-time chat with object discussion capabilities, a distinct history/publish lifecycle for items, and integration with external APIs (OpenAI, OpenCage). The codebase heavily utilizes custom hooks to manage complex UI state and logic.

_This file tracks the current state of work, recent changes, immediate next steps, active decisions, important patterns, and project insights. (Updated after detailed code analysis)._
