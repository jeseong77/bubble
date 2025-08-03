# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server:**
```bash
npx expo start
```

**Platform-specific development:**
```bash
expo start --android    # Android emulator
expo start --ios        # iOS simulator  
expo start --web        # Web browser
```

**Testing and Quality:**
```bash
npm test               # Run Jest tests with watch mode
expo lint              # Run ESLint
```

**Build Commands:**
```bash
# Development build (with dev client)
eas build --profile development

# Preview build
eas build --profile preview

# Production build  
eas build --profile production
```

## Architecture Overview

This is a React Native Expo app built with TypeScript that implements a social matching/dating platform called "Bubble" where users form groups to match with other groups.

### Core Technologies
- **Framework:** React Native with Expo SDK 53
- **Router:** Expo Router (file-based routing)
- **Backend:** Supabase (PostgreSQL + real-time subscriptions)
- **State Management:** Zustand for UI state, React Context for auth/providers
- **Styling:** Emotion/native for styled components
- **Authentication:** Supabase Auth with Google/Apple OAuth

### Key Architecture Patterns

**Provider-Based Architecture:**
The app uses a nested provider pattern in `app/_layout.tsx`:
- `ThemeProvider` → `AuthProvider` → `RealtimeProvider` → `MatchmakingProvider`
- This ensures proper context availability and initialization order

**File-Based Routing Structure:**
```
app/
├── (tabs)/           # Bottom tab navigation (main app)
├── bubble/           # Bubble-related screens  
├── chats/            # Chat functionality
├── login/            # Authentication flow
├── onboarding/       # User onboarding process
└── settings.tsx      # App settings
```

**Database Integration:**
- Uses Supabase RPC functions for complex queries (see `database/rpc_functions.sql`)
- Real-time subscriptions for chat and matchmaking
- Custom hooks like `useMatchmaking.ts` encapsulate data fetching logic

### Key Components

**Authentication Flow:**
- `AuthProvider.tsx` manages Google/Apple OAuth and session state
- `useInitialRouteRedirect.ts` handles routing logic based on auth/onboarding status
- Profile setup completion tracking via AsyncStorage and database

**Matchmaking System:**
- Groups-based matching where users join "bubbles" (groups of 2-4 people)
- `MatchmakingProvider.tsx` and `useMatchmaking.ts` handle the swiping/matching logic
- Real-time updates via Supabase subscriptions

**Chat System:**
- Real-time messaging using Supabase subscriptions  
- `RealtimeProvider.tsx` manages WebSocket connections
- React Native Gifted Chat for UI components

### Development Notes

**TypeScript Configuration:**
- Uses Expo's base TypeScript config with path aliases (`@/*` → `./`)
- Strict mode disabled for easier React Native development

**Asset Management:**
- Custom Quicksand fonts loaded in root layout
- Images stored in `assets/` directory
- Icons use Expo Symbols and Vector Icons

**Database Schema:**
- Core tables: users, groups, group_members, matches, chat_rooms, chat_messages
- RPC functions handle complex matching algorithms and group operations
- Row Level Security (RLS) policies for data access control

**Environment Variables:**
- Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Uses fallback values for development

## Testing Strategy

- Jest with Expo preset for unit testing
- Component testing with React Test Renderer
- Manual testing on iOS simulator (EAS build profile includes simulator support)