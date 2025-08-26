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

### Key Components & User Flow

**Authentication Flow:**
- `AuthProvider.tsx` manages Google/Apple OAuth and session state
- `useInitialRouteRedirect.ts` handles routing logic based on auth/onboarding status
- Profile setup completion tracking via AsyncStorage and database

**Bubble System (Core Feature):**
- Groups-based social matching where users join "bubbles" (groups of 2-4 people)
- **Bubble Creation**: Users create bubbles via `CreateBubbleModal` → `form.tsx` (naming) → `search.tsx` (invitations)
- **Bubble Management**: Users can view, manage, and "pop" (destroy) their bubbles from profile screen
- **Bubble Destruction**: When any member "pops" a bubble, it's completely destroyed for ALL members
- `MatchmakingProvider.tsx` and `useMatchmaking.ts` handle the swiping/matching logic between bubbles
- Real-time updates via Supabase subscriptions

**Chat System:**
- Real-time messaging using Supabase subscriptions  
- `RealtimeProvider.tsx` manages WebSocket connections
- React Native Gifted Chat for UI components

**Complete App Flow:**
1. **Onboarding**: User signs up → completes profile setup with photos, details
2. **Bubble Creation**: User creates bubble → names it → invites friends → waits for acceptance
3. **Matchmaking**: Full bubbles can swipe on other bubbles → mutual likes create matches
4. **Chatting**: Matched bubbles can chat in group chat rooms
5. **Bubble Management**: Users can view their bubble, member status, and "pop" (destroy) bubbles

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

## Recent Changes & Fixes (August 2025)

### Bubble Creation Error Fix (August 9, 2025)
**Issue**: "Create Bubble" button was failing with error "❌ 그룹 ID가 반환되지 않음" - RPC function returning NULL.

**Root Cause Analysis**:
- `create_group` RPC function was silently failing and returning NULL
- CreateBubbleModal had test code interfering with "3-3" option (now fixed for all options)
- Missing validation for user existence and required data

**Files Modified**:
- `database/rpc_functions.sql` - Enhanced `create_group` RPC with detailed error reporting and validation
- `app/(tabs)/profile.tsx` - Added comprehensive debugging and validation before calling RPC
- `components/ui/CreateBubbleModal.tsx` - Removed test code that was breaking "3-3" option

**Changes Made**:

1. **Enhanced `create_group` RPC Function** (`database/rpc_functions.sql:334-369`):
   - Added user existence validation with detailed error messages
   - Added group creation validation
   - Enhanced exception handling with RAISE NOTICE for debugging
   - Fixed column name consistency (`creator_id` not `created_by`)

2. **ProfileScreen Debugging** (`app/(tabs)/profile.tsx:940-1004`):
   - Pre-flight user validation (checks if user exists in users table)
   - Gender validation (ensures user has gender set)
   - Detailed RPC error logging with all error properties
   - Parameter logging for debugging
   - Fixed parameter name: `creatorImagePath` → `creatorImageUrl`

3. **CreateBubbleModal Fix** (`components/ui/CreateBubbleModal.tsx:42-47`):
   - Removed test code that was calling `handleTestRpc()` for "3-3" option
   - All bubble sizes now use the same creation flow

**Debugging Features Added**:
- Console logging shows user validation, RPC parameters, and detailed error info
- Alert messages provide clear feedback about specific failures
- Identifies whether issue is user data, database constraints, or RPC function

**Database Updates Required**:
Run the updated `create_group` function in Supabase SQL Editor to apply error reporting enhancements.

**Expected Flow Now**:
1. User selects bubble size → Validates user exists and has complete profile data
2. Creates group via RPC → Returns group ID or detailed error message  
3. Navigates to form with group ID → User can set bubble name and invite members

### Previous Bubble Creation & Invitation Flow Fixes
**Issue**: Creator wasn't getting proper `joined_at` timestamp, group names weren't being set, and group status never changed from 'forming' to 'full'.

**Files Modified**:
- `database/rpc_functions.sql` - Updated `create_group` and `accept_invitation` RPC functions
- `app/bubble/form.tsx` - Fixed navigation flow after bubble naming

**RPC Functions Updated**:
1. **`create_group`**: Now properly sets creator's `joined_at` timestamp and `group_gender` based on creator's gender
2. **`accept_invitation`**: Now checks if group reaches max capacity and updates status to 'full' automatically

**Expected Flow**:
1. User creates bubble → Creator gets proper timestamp in group_members table
2. User names bubble → Navigates to search screen for friend invitations
3. User invites friends → Friends can accept via invitation system
4. When group reaches max size → Status automatically updates to 'full'
5. User returns to profile → Bubble appears in "My Bubble" list with correct status

**Database Updates Required**:
These RPC functions must be applied to Supabase database via SQL Editor:
- Updated `create_group` function (fixes creator timestamp + group_gender)
- Updated `accept_invitation` function (adds auto-status update to 'full')

**Navigation Flow**:
Profile → CreateBubbleModal → Form (name setting) → Search (friend invitation) → Invitation waiting → Back to Profile

### Bubble Popping/Destruction System Fix (August 11, 2025)
**Issue**: Users getting foreign key constraint error when trying to "pop" (destroy) bubbles: `"update or delete on table \"groups\" violates foreign key constraint \"users_active_group_id_fkey\""`

**Root Cause Analysis**:
- `leave_group` RPC function was completely missing from the database
- Code was trying to call non-existent RPC function, causing failures
- `form.tsx` was using direct SQL DELETE which violated foreign key constraints
- `users.active_group_id` references were not cleared before group deletion

**Files Modified**:
- `database/rpc_functions.sql` - Added complete `leave_group` RPC function (lines 495-565)
- `app/bubble/form.tsx` - Replaced direct DELETE with RPC call (lines 289-330)
- `app/(tabs)/profile.tsx` - Updated to handle new JSON response format (lines 882-913)

**Implementation Details**:

1. **New `leave_group` RPC Function** (`database/rpc_functions.sql:495-565`):
   - **Bubble Destruction Behavior**: ANY user popping a bubble destroys it for ALL members
   - **Proper Constraint Handling**: Clears all `users.active_group_id` references before deletion
   - **Complete Cleanup**: Removes all group members and deletes group entirely
   - **Detailed Response**: Returns JSON with success status, bubble name, popper name, and affected users
   - **Error Handling**: Comprehensive exception handling with detailed logging

2. **Enhanced User Experience**:
   - **Visual Feedback**: Shows "Bubble Popped! 💥" message with bubble name
   - **Proper Navigation**: Returns to profile with updated bubble list
   - **Error Messages**: Clear, specific error feedback for failures

3. **Notification Infrastructure**:
   - RPC function returns `affected_users` array for future push notifications
   - Logs who popped which bubble for notification system integration

**Expected Behavior**:
1. **Any user pops bubble** → Confirmation dialog appears
2. **User confirms** → `leave_group` RPC executes
3. **Complete destruction** → All members lose access, group deleted entirely
4. **Success feedback** → "Bubble Popped! 💥 [BubbleName] has been destroyed"
5. **UI updates** → Bubble disappears from all members' "My Bubble" lists
6. **Navigation** → User returns to profile with updated data

**Database Updates Required**:
Apply the new `leave_group` RPC function in Supabase SQL Editor to enable proper bubble destruction.

**Key Technical Achievement**:
Fixed the foreign key constraint violation by implementing proper deletion order:
1. Clear `users.active_group_id` references first
2. Remove all group memberships second  
3. Delete the group itself last
This ensures no orphaned foreign key references remain.

## Color Palette

The app uses the following official color palette. All UI components should reference these exact hex values:

### Primary Colors
- **Primary**: `#80B7FF`
- **Secondary**: `#80B7FF`

### Yellow Tones
- **chat_Yellow**: `#FFF1C5`
- **Point_Yellow**: `#CEE3FF`

### Neutral Colors
- **Black**: `#000000`
- **White**: `#FFFFFF`
- **Light Gray**: `#F4F4F4`
- **Medium Gray**: `#D9D9D9`
- **Dark Gray**: `#7A7A7A`

### UI Specific Colors
- **nav_bar_white**: `#FAFAFA`
- **bubble_font**: `#303030`

### Accent Colors
- **Navy**: `#FFD95C`
- **Navy_pin**: `#FFD95C` (with 70% opacity)
- **Facebook_blue**: `#5890FF`
- **Error**: `#EF4D24`

**Usage Notes:**
- All colors are defined in `/constants/Colors.ts`
- Access colors via `useAppTheme()` hook: `const { colors } = useAppTheme()`
- Maintain consistency between light and dark themes
- Use semantic color names (e.g., `colors.primary`) rather than direct hex values in components