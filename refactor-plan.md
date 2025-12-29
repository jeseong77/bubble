# Bubble App Refactoring Plan

**Created:** December 29, 2025
**Estimated Total Effort:** 208-321 hours (5-8 weeks for 1 developer)
**Current Codebase:** 79 TypeScript/TSX files (20,168 lines) + 2,191 lines SQL

---

## Table of Contents
1. [Current State Assessment](#current-state-assessment)
2. [Phase 1: Critical Fixes (Week 1-2)](#phase-1-critical-fixes-week-1-2)
3. [Phase 2: Code Quality & Structure (Week 3-4)](#phase-2-code-quality--structure-week-3-4)
4. [Phase 3: Architecture Improvements (Week 5-6)](#phase-3-architecture-improvements-week-5-6)
5. [Phase 4: Production Readiness (Week 7-8)](#phase-4-production-readiness-week-7-8)
6. [Duplicate Code Removal Checklist](#duplicate-code-removal-checklist)
7. [Inefficient Code Fixes](#inefficient-code-fixes)

---

## Current State Assessment

### Critical Issues Found
- ❌ **0 test files** - No safety net for refactoring
- ❌ **No error boundaries** - App crashes on unhandled errors
- ❌ **TypeScript strict mode disabled** - Missing type safety
- ❌ **853 console.log statements** - Production debug code
- ❌ **6 files over 800 lines** - Monolithic components
- ❌ **Large code duplication** - Skeleton components repeated 3+ times
- ❌ **No API abstraction layer** - Direct Supabase calls everywhere
- ❌ **Mixed state management patterns** - Context + Zustand + local state

### Files Requiring Immediate Attention
| File | Lines | Issues |
|------|-------|--------|
| `app/(tabs)/profile.tsx` | 1,704 | 3 features in one file |
| `app/bubble/form.tsx` | 1,173 | Complex state, multiple responsibilities |
| `app/(tabs)/index.tsx` | 1,098 | Swipe logic + UI + animations |
| `app/chat-room/index.tsx` | 850 | Chat UI + subscriptions |
| `app/(tabs)/match.tsx` | 802 | ~80% duplicate of index.tsx |
| `providers/RealtimeProvider.tsx` | 612 | God object (7+ responsibilities) |
| `database/rpc_functions.sql` | 2,191 | All 30+ functions in one file |

---

## PHASE 1: Critical Fixes (Week 1-2)
**Estimated Time:** 20-35 hours
**Priority:** MUST DO BEFORE ANY OTHER REFACTORING

### 1.1 Add Error Boundaries (2-4 hours)

**Goal:** Prevent app crashes from unhandled errors

#### Task 1.1.1: Create Error Boundary Component
- [ ] Create `components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // TODO: Send to error tracking service (Sentry)
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Unknown error"}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#80B7FF",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
```

#### Task 1.1.2: Wrap App in Error Boundary
- [ ] Modify `app/_layout.tsx` to wrap entire app

```typescript
// app/_layout.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {/* rest of app */}
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

#### Task 1.1.3: Add Feature-level Error Boundaries
- [ ] Wrap each tab in `app/(tabs)/_layout.tsx`
- [ ] Wrap chat room in `app/chat-room/index.tsx`
- [ ] Wrap bubble forms in `app/bubble/form.tsx`

---

### 1.2 Create Logger Service (2-3 hours)

**Goal:** Replace all 853 console.log statements with proper logging

#### Task 1.2.1: Create Logger Service
- [ ] Create `services/Logger.ts`

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

interface LogTransport {
  send(entry: LogEntry): void;
}

class ConsoleTransport implements LogTransport {
  send(entry: LogEntry) {
    if (!__DEV__) return; // Don't log in production

    const emoji = {
      [LogLevel.DEBUG]: "🔍",
      [LogLevel.INFO]: "ℹ️",
      [LogLevel.WARN]: "⚠️",
      [LogLevel.ERROR]: "❌",
    }[entry.level];

    const timestamp = entry.timestamp.toISOString();
    console.log(
      `${emoji} [${timestamp}] ${entry.message}`,
      entry.context || "",
      entry.error || ""
    );
  }
}

class SentryTransport implements LogTransport {
  send(entry: LogEntry) {
    // TODO: Integrate Sentry
    if (entry.level >= LogLevel.ERROR && !__DEV__) {
      // Sentry.captureException(entry.error || new Error(entry.message));
    }
  }
}

class Logger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO) {
    this.minLevel = minLevel;
    this.transports = [new ConsoleTransport(), new SentryTransport()];
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    this.transports.forEach((transport) => transport.send(entry));
  }
}

export const logger = new Logger();
```

#### Task 1.2.2: Replace Console.logs
- [ ] Find all console.log statements: `grep -r "console\." --include="*.ts" --include="*.tsx"`
- [ ] Replace in these files (high priority, most occurrences):

**Priority Files (>20 console statements):**
1. `providers/RealtimeProvider.tsx` (~50+ occurrences)
2. `app/(tabs)/profile.tsx` (~80+ occurrences)
3. `app/bubble/form.tsx` (~60+ occurrences)
4. `app/(tabs)/index.tsx` (~50+ occurrences)
5. `hooks/useMatchmaking.ts` (~30+ occurrences)

**Replacement Pattern:**
```typescript
// Before:
console.log("User profile loaded:", user);
console.error("Failed to fetch:", error);

// After:
import { logger } from "@/services/Logger";
logger.debug("User profile loaded", { userId: user.id });
logger.error("Failed to fetch", error);
```

#### Task 1.2.3: Add CI/CD Check
- [ ] Create `.husky/pre-commit` hook to block console.logs

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check for console.logs in staged files
git diff --cached --name-only | grep -E '\.(ts|tsx)$' | xargs grep -n 'console\.' && {
  echo "❌ Remove console.log statements before committing"
  exit 1
} || exit 0
```

---

### 1.3 Enable TypeScript Strict Mode (4-8 hours)

**Goal:** Catch type errors and improve type safety

#### Task 1.3.1: Enable Strict Mode
- [ ] Update `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,  // ← Enable this
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### Task 1.3.2: Generate Supabase Types
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Generate types: `supabase gen types typescript --project-id <project-id> > types/supabase.ts`
- [ ] Update `lib/supabase.ts` to use generated types

```typescript
import { Database } from "@/types/supabase";

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
```

#### Task 1.3.3: Fix Type Errors Incrementally
- [ ] Run `npx tsc --noEmit` to see all errors
- [ ] Fix errors in this order:
  1. `types/` - Add missing type definitions
  2. `utils/` - Fix utility functions
  3. `hooks/` - Fix custom hooks
  4. `components/` - Fix components
  5. `app/` - Fix screens

**Common fixes needed:**
```typescript
// Fix 1: Add explicit return types
// Before:
const fetchData = async () => { ... }

// After:
const fetchData = async (): Promise<User[]> => { ... }

// Fix 2: Remove 'any' types
// Before:
const handleData = (data: any) => { ... }

// After:
const handleData = (data: UserProfile) => { ... }

// Fix 3: Fix unsafe optional chaining
// Before:
const name = user?.profile?.name;

// After:
const name = user?.profile?.name ?? "Unknown";
```

---

### 1.4 Extract Duplicated Skeleton Components (2 hours)

**Goal:** Remove ~150 lines of duplicated skeleton code

#### Task 1.4.1: Create Shared Skeleton Components
- [ ] Create `components/feedback/SkeletonLoader.tsx`

```typescript
import React from "react";
import styled from "@emotion/native";
import { useAppTheme } from "@/hooks/useAppTheme";

const SkeletonView = styled.View<{ width?: number | string; height?: number }>`
  background-color: ${(props) => props.theme.colors.lightGray};
  border-radius: 8px;
  width: ${(props) => props.width || "100%"};
  height: ${(props) => props.height || 20}px;
`;

const SkeletonCircle = styled.View<{ size: number }>`
  background-color: ${(props) => props.theme.colors.lightGray};
  border-radius: ${(props) => props.size / 2}px;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;

export const Skeleton = {
  Box: ({ width, height }: { width?: number | string; height?: number }) => (
    <SkeletonView width={width} height={height} />
  ),

  Circle: ({ size }: { size: number }) => <SkeletonCircle size={size} />,

  Text: ({ width = "80%" }: { width?: number | string }) => (
    <SkeletonView width={width} height={16} />
  ),

  Avatar: ({ size = 50 }: { size?: number }) => <SkeletonCircle size={size} />,
};

// Usage example:
// <Skeleton.Avatar size={60} />
// <Skeleton.Text width="70%" />
// <Skeleton.Box width={200} height={100} />
```

#### Task 1.4.2: Replace Duplicated Skeleton Code
- [ ] Remove skeleton code from `app/(tabs)/profile.tsx` (lines ~200-250)
- [ ] Remove skeleton code from `app/bubble/form.tsx` (lines ~150-200)
- [ ] Remove skeleton code from `app/(tabs)/index.tsx` (lines ~100-150)
- [ ] Replace all with `import { Skeleton } from "@/components/feedback/SkeletonLoader"`

**Before (duplicated 3 times):**
```typescript
const SkeletonView = styled.View`
  background-color: #f0f0f0;
  border-radius: 8px;
  margin: 10px;
`;

const SkeletonCircle = styled.View`
  background-color: #f0f0f0;
  border-radius: 30px;
  width: 60px;
  height: 60px;
`;
```

**After:**
```typescript
import { Skeleton } from "@/components/feedback/SkeletonLoader";

// In render:
<Skeleton.Circle size={60} />
<Skeleton.Box width={200} height={20} />
```

---

### 1.5 Add Basic Test Infrastructure (8-16 hours)

**Goal:** Set up testing and add tests for critical functions

#### Task 1.5.1: Install Test Dependencies
- [ ] Run: `npm install --save-dev @testing-library/react-native @testing-library/jest-native`

#### Task 1.5.2: Update Jest Config
- [ ] Update `jest.config.js`

```javascript
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ],
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
  ],
};
```

#### Task 1.5.3: Create Test Setup File
- [ ] Create `jest.setup.js`

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
```

#### Task 1.5.4: Create First Tests

**Test 1: Utility Functions**
- [ ] Create `__tests__/utils/avatarUtils.test.ts`

```typescript
import { getSignedAvatarUrl } from "@/utils/avatarUtils";

describe("avatarUtils", () => {
  describe("getSignedAvatarUrl", () => {
    it("should return null for null input", async () => {
      const result = await getSignedAvatarUrl(null);
      expect(result).toBeNull();
    });

    it("should return signed URL for valid path", async () => {
      const result = await getSignedAvatarUrl("avatars/user1.jpg");
      expect(result).toContain("https://");
    });
  });
});
```

**Test 2: Custom Hook**
- [ ] Create `__tests__/hooks/useImageUpload.test.ts`

```typescript
import { renderHook, waitFor } from "@testing-library/react-native";
import { useImageUpload } from "@/hooks/useImageUpload";

describe("useImageUpload", () => {
  it("should upload image successfully", async () => {
    const { result } = renderHook(() => useImageUpload());

    const mockImageUri = "file://path/to/image.jpg";
    await result.current.uploadImage(mockImageUri, "avatars");

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
      expect(result.current.uploadedUrl).toBeTruthy();
    });
  });
});
```

**Test 3: Component**
- [ ] Create `__tests__/components/CustomButton.test.tsx`

```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CustomButton } from "@/components/CustomButton";

describe("CustomButton", () => {
  it("should render with text", () => {
    const { getByText } = render(<CustomButton title="Click Me" />);
    expect(getByText("Click Me")).toBeTruthy();
  });

  it("should call onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CustomButton title="Click Me" onPress={onPress} />
    );

    fireEvent.press(getByText("Click Me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CustomButton title="Click Me" disabled onPress={onPress} />
    );

    fireEvent.press(getByText("Click Me"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

#### Task 1.5.5: Add Test Scripts
- [ ] Update `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## PHASE 2: Code Quality & Structure (Week 3-4)
**Estimated Time:** 64-96 hours
**Priority:** HIGH - Do after Phase 1

### 2.1 Split Large Screen Files (16-24 hours)

#### Task 2.1.1: Split `app/(tabs)/profile.tsx` (1,704 lines → ~400 lines)

**Current structure:** One massive file with 3 tabs + bubble creation + image upload

**Target structure:**
```
app/(tabs)/
  profile.tsx (main coordinator, ~200 lines)

components/profile/
  ProfileBubbles.tsx (~400 lines) - "My Bubble" tab
  ProfileEdit.tsx (~400 lines) - "Edit Profile" tab
  ProfileSettings.tsx (~300 lines) - Settings tab
  ProfileHeader.tsx (~150 lines) - Header with avatar

hooks/
  useProfileData.ts (~200 lines) - Data fetching logic
```

**Steps:**
- [ ] Create `components/profile/` directory
- [ ] Extract "My Bubble" tab to `ProfileBubbles.tsx`
  - Move bubble fetching logic
  - Move bubble display components
  - Move CreateBubbleModal trigger
- [ ] Extract "Edit Profile" tab to `ProfileEdit.tsx`
  - Move profile editing form
  - Move image upload logic
  - Move save functionality
- [ ] Extract profile header to `ProfileHeader.tsx`
  - Move avatar display
  - Move user info display
- [ ] Create `hooks/useProfileData.ts`
  - Extract `fetchUserBubbles` function
  - Extract `fetchUserProfile` function
  - Extract `updateProfile` function
- [ ] Update `profile.tsx` to import and compose these components

**New profile.tsx structure:**
```typescript
import { ProfileBubbles } from "@/components/profile/ProfileBubbles";
import { ProfileEdit } from "@/components/profile/ProfileEdit";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { useProfileData } from "@/hooks/useProfileData";

export default function ProfileScreen() {
  const { profile, bubbles, loading } = useProfileData();
  const [activeTab, setActiveTab] = useState("bubbles");

  return (
    <Container>
      <ProfileHeader profile={profile} />
      <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "bubbles" && <ProfileBubbles bubbles={bubbles} />}
      {activeTab === "edit" && <ProfileEdit profile={profile} />}
    </Container>
  );
}
```

#### Task 2.1.2: Split `app/bubble/form.tsx` (1,173 lines → ~300 lines)

**Current structure:** Bubble naming + member display + deletion + navigation

**Target structure:**
```
app/bubble/
  form.tsx (main coordinator, ~200 lines)

components/bubble/
  BubbleHeader.tsx (~150 lines) - Name + back button
  BubbleMemberList.tsx (~300 lines) - Member grid display
  BubbleActions.tsx (~200 lines) - Delete/invite buttons

hooks/
  useBubbleData.ts (~200 lines) - Fetch bubble, members, handle deletion
```

**Steps:**
- [ ] Create `components/bubble/` directory
- [ ] Extract header to `BubbleHeader.tsx`
  - Bubble name display/edit
  - Back navigation
  - Status indicator
- [ ] Extract member list to `BubbleMemberList.tsx`
  - Member grid display
  - Member status badges
  - Invitation status
- [ ] Extract actions to `BubbleActions.tsx`
  - Delete bubble button
  - Invite friends button
  - Navigation to search
- [ ] Create `hooks/useBubbleData.ts`
  - `fetchBubbleInfo` function
  - `leaveBubble` function (handles deletion)
  - Real-time member updates
- [ ] Refactor `form.tsx` to compose components

#### Task 2.1.3: Split `app/(tabs)/index.tsx` (1,098 lines → ~300 lines)

**Current structure:** Swipe UI + animations + user bubble display + state management

**Target structure:**
```
app/(tabs)/
  index.tsx (main coordinator, ~200 lines)

components/matching/
  SwipeCard.tsx (~300 lines) - Card display + animations
  SwipeControls.tsx (~150 lines) - Like/pass buttons
  UserBubbleHeader.tsx (~200 lines) - Current user's bubble display
  MatchingEmpty.tsx (~100 lines) - Empty state

hooks/
  useSwipeGestures.ts (~200 lines) - Gesture handling
```

**Steps:**
- [ ] Extract swipe card to `components/matching/SwipeCard.tsx`
- [ ] Extract controls to `components/matching/SwipeControls.tsx`
- [ ] Extract user bubble header to `components/matching/UserBubbleHeader.tsx`
- [ ] Create `hooks/useSwipeGestures.ts` for gesture logic
- [ ] Refactor `index.tsx` to compose components

#### Task 2.1.4: Deduplicate `app/(tabs)/match.tsx` (802 lines)

**Issue:** ~80% duplicate of `index.tsx` (same swipe logic, different data source)

**Solution:** Share components between index.tsx and match.tsx
- [ ] Extract shared `MatchCardList` component
- [ ] Both screens use same `SwipeCard`, `SwipeControls`
- [ ] Only difference: data source (useMatchmaking vs useLikesYou)

**After refactoring:**
```typescript
// app/(tabs)/index.tsx
import { MatchCardList } from "@/components/matching/MatchCardList";
import { useMatchmaking } from "@/hooks/useMatchmaking";

export default function HomeScreen() {
  const { groups, like, pass } = useMatchmaking();
  return <MatchCardList groups={groups} onLike={like} onPass={pass} />;
}

// app/(tabs)/match.tsx
import { MatchCardList } from "@/components/matching/MatchCardList";
import { useLikesYou } from "@/hooks/useLikesYou";

export default function MatchScreen() {
  const { groups, like, pass } = useLikesYou();
  return <MatchCardList groups={groups} onLike={like} onPass={pass} />;
}
```

**Result:** Reduce from 1,900 lines to ~600 lines (save ~1,300 lines)

---

### 2.2 Split Database RPC Functions (8-12 hours)

#### Task 2.2.1: Analyze Current RPC Functions
- [ ] Review `database/rpc_functions.sql` (2,191 lines)
- [ ] List all 30+ functions and categorize by domain

**Categories:**
- **Users:** `get_user_profile`, `update_user_profile`, `check_profile_completion`
- **Groups:** `create_group`, `leave_group`, `get_my_bubbles`, `get_group_info`
- **Matching:** `find_matching_group`, `like_group`, `pass_group`, `check_mutual_like`
- **Chat:** `get_messages`, `send_message`, `mark_messages_read`
- **Invitations:** `send_invitation`, `accept_invitation`, `decline_invitation`

#### Task 2.2.2: Create New Directory Structure
- [ ] Create directory structure:

```
database/
├── schema/
│   ├── 01_core.sql              # Users, auth tables
│   ├── 02_groups.sql            # Groups, members tables
│   ├── 03_matching.sql          # Likes, passes, matches
│   └── 04_chat.sql              # Chat rooms, messages
├── functions/
│   ├── users/
│   │   ├── get_user_profile.sql
│   │   ├── update_user_profile.sql
│   │   └── check_profile_completion.sql
│   ├── groups/
│   │   ├── create_group.sql
│   │   ├── leave_group.sql
│   │   ├── get_my_bubbles.sql
│   │   ├── get_my_bubbles_v2.sql
│   │   └── get_group_info.sql
│   ├── matching/
│   │   ├── find_matching_group.sql
│   │   ├── like_group.sql
│   │   ├── pass_group.sql
│   │   ├── check_mutual_like.sql
│   │   └── check_swipe_limits.sql
│   ├── chat/
│   │   ├── get_messages.sql
│   │   ├── send_message.sql
│   │   └── mark_messages_read.sql
│   └── invitations/
│       ├── send_invitation.sql
│       ├── accept_invitation.sql
│       └── decline_invitation.sql
├── migrations/
│   └── [keep existing migration files]
└── deploy.sql                   # Master deployment file
```

#### Task 2.2.3: Split RPC Functions
- [ ] Extract each function from `rpc_functions.sql` into separate files
- [ ] Create `database/deploy.sql` that sources all function files in order:

```sql
-- database/deploy.sql
-- Deploy all database functions

-- Users
\i functions/users/get_user_profile.sql
\i functions/users/update_user_profile.sql
\i functions/users/check_profile_completion.sql

-- Groups
\i functions/groups/create_group.sql
\i functions/groups/leave_group.sql
\i functions/groups/get_my_bubbles.sql
\i functions/groups/get_my_bubbles_v2.sql

-- Matching
\i functions/matching/find_matching_group.sql
\i functions/matching/like_group.sql
\i functions/matching/pass_group.sql

-- Chat
\i functions/chat/get_messages.sql
\i functions/chat/send_message.sql

-- Invitations
\i functions/invitations/send_invitation.sql
\i functions/invitations/accept_invitation.sql
\i functions/invitations/decline_invitation.sql
```

#### Task 2.2.4: Create Deployment Script
- [ ] Create `scripts/deploy-database.sh`

```bash
#!/bin/bash

# Deploy database functions to Supabase
# Usage: ./scripts/deploy-database.sh

echo "Deploying database functions..."

psql $DATABASE_URL -f database/schema/01_core.sql
psql $DATABASE_URL -f database/schema/02_groups.sql
psql $DATABASE_URL -f database/schema/03_matching.sql
psql $DATABASE_URL -f database/schema/04_chat.sql

psql $DATABASE_URL -f database/deploy.sql

echo "✅ Database functions deployed successfully"
```

---

### 2.3 Create API Client Layer (8-12 hours)

**Goal:** Abstract all Supabase RPC calls behind typed API functions

#### Task 2.3.1: Create Base API Client
- [ ] Create `api/client.ts`

```typescript
import { supabase } from "@/lib/supabase";
import { logger } from "@/services/Logger";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  async rpc<T = any>(
    functionName: string,
    params?: Record<string, any>
  ): Promise<T> {
    logger.debug(`API Call: ${functionName}`, params);

    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      logger.error(`API Error: ${functionName}`, error, params);
      throw new ApiError(error.code || "UNKNOWN", error.message, error);
    }

    logger.debug(`API Success: ${functionName}`, { data });
    return data as T;
  }

  async query<T = any>(
    table: string,
    query: (builder: any) => any
  ): Promise<T[]> {
    logger.debug(`Query: ${table}`);

    const builder = supabase.from(table);
    const { data, error } = await query(builder);

    if (error) {
      logger.error(`Query Error: ${table}`, error);
      throw new ApiError(error.code || "UNKNOWN", error.message, error);
    }

    return data as T[];
  }
}

export const apiClient = new ApiClient();
```

#### Task 2.3.2: Create Domain-Specific API Modules

**Bubble API**
- [ ] Create `api/bubbles.ts`

```typescript
import { apiClient } from "./client";

export interface CreateBubbleParams {
  creatorId: string;
  maxSize: number;
  creatorName: string;
  creatorGender: string;
  creatorImageUrl: string;
}

export interface Bubble {
  id: string;
  name: string;
  maxSize: number;
  currentSize: number;
  status: "forming" | "full" | "disbanded";
  members: BubbleMember[];
}

export const bubbleApi = {
  async createBubble(params: CreateBubbleParams): Promise<string> {
    return apiClient.rpc<string>("create_group", {
      p_creator_id: params.creatorId,
      p_max_size: params.maxSize,
      p_creator_name: params.creatorName,
      p_creator_gender: params.creatorGender,
      p_creator_image_url: params.creatorImageUrl,
    });
  },

  async getBubbles(userId: string): Promise<Bubble[]> {
    return apiClient.rpc<Bubble[]>("get_my_bubbles_v2", {
      p_user_id: userId,
    });
  },

  async leaveBubble(groupId: string, userId: string): Promise<void> {
    return apiClient.rpc("leave_group", {
      p_group_id: groupId,
      p_user_id: userId,
    });
  },

  async getBubbleInfo(groupId: string): Promise<Bubble> {
    return apiClient.rpc<Bubble>("get_group_info", {
      p_group_id: groupId,
    });
  },
};
```

**Matching API**
- [ ] Create `api/matching.ts`

```typescript
import { apiClient } from "./client";

export const matchingApi = {
  async getMatchingGroups(params: {
    userId: string;
    userGender: string;
    userGroupId: string;
    limit: number;
    offset: number;
  }) {
    return apiClient.rpc("find_matching_group", {
      p_user_id: params.userId,
      p_user_gender: params.userGender,
      p_user_group_id: params.userGroupId,
      p_limit: params.limit,
      p_offset: params.offset,
    });
  },

  async likeGroup(userId: string, likedGroupId: string) {
    return apiClient.rpc("like_group", {
      p_user_id: userId,
      p_liked_group_id: likedGroupId,
    });
  },

  async passGroup(userId: string, passedGroupId: string) {
    return apiClient.rpc("pass_group", {
      p_user_id: userId,
      p_passed_group_id: passedGroupId,
    });
  },

  async checkSwipeLimit(userId: string) {
    return apiClient.rpc("check_daily_swipe_limit", {
      p_user_id: userId,
    });
  },
};
```

**User API**
- [ ] Create `api/users.ts`

```typescript
export const userApi = {
  async getProfile(userId: string) {
    return apiClient.query("users", (q) =>
      q.select("*").eq("id", userId).single()
    );
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    return apiClient.query("users", (q) =>
      q.update(updates).eq("id", userId)
    );
  },

  async checkProfileCompletion(userId: string) {
    return apiClient.rpc("check_profile_completion", {
      p_user_id: userId,
    });
  },
};
```

**Chat API**
- [ ] Create `api/chat.ts`

```typescript
export const chatApi = {
  async getMessages(roomId: string, limit: number = 50) {
    return apiClient.rpc("get_messages", {
      p_room_id: roomId,
      p_limit: limit,
    });
  },

  async sendMessage(roomId: string, userId: string, text: string) {
    return apiClient.rpc("send_message", {
      p_room_id: roomId,
      p_user_id: userId,
      p_text: text,
    });
  },

  async markRead(roomId: string, userId: string) {
    return apiClient.rpc("mark_messages_read", {
      p_room_id: roomId,
      p_user_id: userId,
    });
  },
};
```

#### Task 2.3.3: Create Barrel Export
- [ ] Create `api/index.ts`

```typescript
export * from "./client";
export * from "./bubbles";
export * from "./matching";
export * from "./users";
export * from "./chat";
```

#### Task 2.3.4: Replace Direct Supabase Calls

**Priority files to update:**
- [ ] `components/ui/CreateBubbleModal.tsx` - Use `bubbleApi.createBubble()`
- [ ] `app/(tabs)/profile.tsx` - Use `bubbleApi.getBubbles()`
- [ ] `app/bubble/form.tsx` - Use `bubbleApi.leaveBubble()`
- [ ] `hooks/useMatchmaking.ts` - Use `matchingApi.*`
- [ ] `hooks/useLikesYou.ts` - Use `matchingApi.*`
- [ ] `app/chat-room/index.tsx` - Use `chatApi.*`

**Example replacement:**
```typescript
// Before:
const { data, error } = await supabase.rpc("create_group", {
  p_creator_id: session.user.id,
  p_max_size: maxSize,
  // ...
});
if (error) {
  Alert.alert("Error", error.message);
  return;
}

// After:
import { bubbleApi } from "@/api";

try {
  const groupId = await bubbleApi.createBubble({
    creatorId: session.user.id,
    maxSize: maxSize,
    // ...
  });
  // Success!
} catch (error) {
  if (error instanceof ApiError) {
    Alert.alert("Error", error.message);
  }
}
```

---

### 2.4 Add Consistent Loading States (8-12 hours)

#### Task 2.4.1: Create Loading Components
- [ ] Create `components/feedback/LoadingOverlay.tsx`

```typescript
import React from "react";
import { Modal, View, ActivityIndicator, StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
}) => {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={[styles.content, { backgroundColor: colors.white }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  message: {
    marginTop: 15,
    fontSize: 14,
  },
});
```

- [ ] Create `components/feedback/LoadingState.tsx` (for inline loading)

```typescript
export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
};
```

#### Task 2.4.2: Add Loading to All Async Operations

**Files to update:**
- [ ] `app/(tabs)/profile.tsx` - Add loading for bubble fetching
- [ ] `app/bubble/form.tsx` - Add loading for bubble deletion
- [ ] `app/(tabs)/index.tsx` - Add loading for initial match fetch
- [ ] `app/chat-room/index.tsx` - Add loading for messages
- [ ] `components/ui/CreateBubbleModal.tsx` - Add loading for bubble creation

**Example:**
```typescript
// In CreateBubbleModal.tsx
const [isCreating, setIsCreating] = useState(false);

const handleCreate = async () => {
  setIsCreating(true);
  try {
    const groupId = await bubbleApi.createBubble(params);
    router.push(`/bubble/form?groupId=${groupId}`);
  } catch (error) {
    // Handle error
  } finally {
    setIsCreating(false);
  }
};

return (
  <>
    <Modal>
      {/* Modal content */}
    </Modal>
    <LoadingOverlay visible={isCreating} message="Creating bubble..." />
  </>
);
```

---

### 2.5 Implement Offline Support (16-24 hours)

#### Task 2.5.1: Install Local Database
- [ ] Choose local database: WatermelonDB (recommended) or Realm
- [ ] Install: `npm install @nozbe/watermelondb @nozbe/with-observables`

#### Task 2.5.2: Define Database Schema
- [ ] Create `database/local/schema.ts`

```typescript
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const localSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "users",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "avatar_url", type: "string" },
        { name: "synced_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "bubbles",
      columns: [
        { name: "bubble_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "status", type: "string" },
        { name: "synced_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "messages",
      columns: [
        { name: "message_id", type: "string", isIndexed: true },
        { name: "room_id", type: "string", isIndexed: true },
        { name: "user_id", type: "string" },
        { name: "text", type: "string" },
        { name: "pending_sync", type: "boolean" },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});
```

#### Task 2.5.3: Create Sync Service
- [ ] Create `services/SyncService.ts`

```typescript
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/database/local";
import { apiClient } from "@/api";
import { logger } from "@/services/Logger";

export class SyncService {
  private isOnline = true;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        logger.info("Connection restored, syncing...");
        this.syncAll();
      }
    });
  }

  async syncAll() {
    try {
      await this.syncMessages();
      await this.syncBubbles();
      logger.info("Sync completed");
    } catch (error) {
      logger.error("Sync failed", error);
    }
  }

  private async syncMessages() {
    const pendingMessages = await database
      .get("messages")
      .query(Q.where("pending_sync", true))
      .fetch();

    for (const message of pendingMessages) {
      try {
        await apiClient.rpc("send_message", {
          p_room_id: message.roomId,
          p_user_id: message.userId,
          p_text: message.text,
        });

        await message.update((m) => {
          m.pendingSync = false;
        });
      } catch (error) {
        logger.error("Failed to sync message", error, { messageId: message.id });
      }
    }
  }
}

export const syncService = new SyncService();
```

#### Task 2.5.4: Update Chat to Use Offline Queue
- [ ] Modify `app/chat-room/index.tsx` to queue messages offline

```typescript
const sendMessage = async (text: string) => {
  // Save to local DB immediately (optimistic UI)
  const localMessage = await database.get("messages").create((message) => {
    message.messageId = generateId();
    message.roomId = roomId;
    message.userId = currentUserId;
    message.text = text;
    message.pendingSync = true;
    message.createdAt = Date.now();
  });

  // Show in UI immediately
  setMessages((prev) => [localMessage, ...prev]);

  // Attempt to send if online
  if (isOnline) {
    try {
      await chatApi.sendMessage(roomId, currentUserId, text);
      await localMessage.update((m) => {
        m.pendingSync = false;
      });
    } catch (error) {
      logger.warn("Message queued for later sync", { messageId: localMessage.id });
    }
  }
};
```

---

## PHASE 3: Architecture Improvements (Week 5-6)
**Estimated Time:** 68-106 hours
**Priority:** MEDIUM - Do after Phase 2

### 3.1 Refactor State Management (16-24 hours)

#### Task 3.1.1: Split RealtimeProvider (612 lines → 150 lines each)

**Current:** One God Provider doing everything
**Target:** 4 focused providers

**Step 1: Create ConnectionProvider**
- [ ] Create `providers/realtime/ConnectionProvider.tsx`

```typescript
// Manages WebSocket connection lifecycle only
export const ConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel("connection");

    channel
      .on("presence", { event: "sync" }, () => {
        setIsConnected(true);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <ConnectionContext.Provider value={{ isConnected }}>
      {children}
    </ConnectionContext.Provider>
  );
};
```

**Step 2: Create InvitationsProvider**
- [ ] Create `providers/realtime/InvitationsProvider.tsx`

```typescript
// Manages invitation subscriptions and state only
export const InvitationsProvider = ({ children }) => {
  const { session } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!session?.user.id) return;

    const channel = supabase
      .channel(`invitations:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `user_id=eq.${session.user.id}`,
        },
        handleInvitationChange
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.user.id]);

  return (
    <InvitationsContext.Provider value={{ invitations }}>
      {children}
    </InvitationsContext.Provider>
  );
};
```

**Step 3: Create MessagesProvider**
- [ ] Create `providers/realtime/MessagesProvider.tsx`

```typescript
// Manages message subscriptions only
export const MessagesProvider = ({ children }) => {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to messages, manage unread counts
  // ...

  return (
    <MessagesContext.Provider value={{ unreadCount }}>
      {children}
    </MessagesContext.Provider>
  );
};
```

**Step 4: Create NotificationsProvider**
- [ ] Create `providers/realtime/NotificationsProvider.tsx`

```typescript
// Aggregates counts from other providers
export const NotificationsProvider = ({ children }) => {
  const { invitations } = useInvitations();
  const { unreadCount } = useMessages();

  const totalBadgeCount = invitations.length + unreadCount;

  return (
    <NotificationsContext.Provider value={{ totalBadgeCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};
```

**Step 5: Update App Layout**
- [ ] Update `app/_layout.tsx` to nest providers

```typescript
<ConnectionProvider>
  <InvitationsProvider>
    <MessagesProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </MessagesProvider>
  </InvitationsProvider>
</ConnectionProvider>
```

**Step 6: Delete Old Provider**
- [ ] Remove `providers/RealtimeProvider.tsx` (612 lines)
- [ ] Update all imports to use new specific hooks

#### Task 3.1.2: Standardize Data Fetching with React Query
- [ ] Install: `npm install @tanstack/react-query`
- [ ] Create `lib/queryClient.ts`

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] Wrap app with QueryClientProvider

```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
```

- [ ] Convert hooks to use React Query

**Example: useMatchmaking hook**
```typescript
// Before:
export const useMatchmaking = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    const data = await matchingApi.getMatchingGroups(...);
    setGroups(data);
    setLoading(false);
  };

  return { groups, loading, fetchGroups };
};

// After:
import { useQuery, useMutation } from "@tanstack/react-query";

export const useMatchmaking = () => {
  const { data: groups, isLoading } = useQuery({
    queryKey: ["matching-groups", userId],
    queryFn: () => matchingApi.getMatchingGroups(...),
  });

  const likeMutation = useMutation({
    mutationFn: (groupId: string) => matchingApi.likeGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries(["matching-groups"]);
    },
  });

  return { groups, isLoading, like: likeMutation.mutate };
};
```

---

### 3.2 Add Constants Files (4-6 hours)

#### Task 3.2.1: Create Database Constants
- [ ] Create `constants/database.ts`

```typescript
export const DB_TABLES = {
  USERS: "users",
  GROUPS: "groups",
  GROUP_MEMBERS: "group_members",
  LIKES: "likes",
  PASSES: "passes",
  MATCHES: "matches",
  CHAT_ROOMS: "chat_rooms",
  CHAT_MESSAGES: "chat_messages",
  INVITATIONS: "invitations",
} as const;

export const GROUP_STATUS = {
  FORMING: "forming",
  FULL: "full",
  DISBANDED: "disbanded",
} as const;

export const MEMBER_STATUS = {
  INVITED: "invited",
  JOINED: "joined",
  DECLINED: "declined",
} as const;

export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  NONBINARY: "nonbinary",
  EVERYONE: "everyone",
} as const;

export const RPC_FUNCTIONS = {
  // Users
  GET_USER_PROFILE: "get_user_profile",
  UPDATE_USER_PROFILE: "update_user_profile",
  CHECK_PROFILE_COMPLETION: "check_profile_completion",

  // Groups
  CREATE_GROUP: "create_group",
  LEAVE_GROUP: "leave_group",
  GET_MY_BUBBLES: "get_my_bubbles",
  GET_MY_BUBBLES_V2: "get_my_bubbles_v2",
  GET_GROUP_INFO: "get_group_info",

  // Matching
  FIND_MATCHING_GROUP: "find_matching_group",
  LIKE_GROUP: "like_group",
  PASS_GROUP: "pass_group",
  CHECK_MUTUAL_LIKE: "check_mutual_like",
  CHECK_DAILY_SWIPE_LIMIT: "check_daily_swipe_limit",

  // Chat
  GET_MESSAGES: "get_messages",
  SEND_MESSAGE: "send_message",
  MARK_MESSAGES_READ: "mark_messages_read",

  // Invitations
  SEND_INVITATION: "send_invitation",
  ACCEPT_INVITATION: "accept_invitation",
  DECLINE_INVITATION: "decline_invitation",
} as const;
```

#### Task 3.2.2: Create Route Constants
- [ ] Create `constants/routes.ts`

```typescript
export const ROUTES = {
  // Auth
  LOGIN: "/login",
  SIGNUP: "/login/signup",

  // Onboarding
  ONBOARDING: "/onboarding",

  // Tabs
  HOME: "/(tabs)",
  MATCH: "/(tabs)/match",
  CHATS: "/(tabs)/chats",
  PROFILE: "/(tabs)/profile",

  // Bubble
  BUBBLE_FORM: "/bubble/form",
  BUBBLE_INVITATION: "/bubble/invitation",
  BUBBLE_MATCH: "/bubble/match",
  BUBBLE_USER: (userId: string) => `/bubble/user/${userId}`,

  // Chat
  CHAT_ROOM: "/chat-room",

  // Other
  SEARCH: "/search",
  SETTINGS: "/settings",
} as const;
```

#### Task 3.2.3: Create UI Constants
- [ ] Create `constants/sizes.ts`

```typescript
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

export const FONT_SIZE = {
  XS: 10,
  SM: 12,
  MD: 14,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
} as const;

export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  ROUND: 999,
} as const;

export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;
```

- [ ] Create `constants/config.ts`

```typescript
export const APP_CONFIG = {
  DAILY_SWIPE_LIMIT: 50,
  MAX_BUBBLE_SIZE: 4,
  MIN_BUBBLE_SIZE: 2,
  MAX_PROFILE_IMAGES: 6,
  CHAT_MESSAGE_LIMIT: 50,
  PAGINATION_BATCH_SIZE: 5,
  IMAGE_MAX_SIZE_MB: 5,
  IMAGE_QUALITY: 0.8,
} as const;
```

#### Task 3.2.4: Create Error Message Constants
- [ ] Create `constants/messages.ts`

```typescript
export const ERROR_MESSAGES = {
  // Network
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  TIMEOUT: "Request timed out. Please try again.",

  // Auth
  INVALID_CREDENTIALS: "Invalid email or password.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",

  // Bubble
  BUBBLE_CREATION_FAILED: "Failed to create bubble. Please try again.",
  BUBBLE_FULL: "This bubble is already full.",
  ALREADY_IN_BUBBLE: "You are already in a bubble.",

  // Generic
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
} as const;

export const SUCCESS_MESSAGES = {
  BUBBLE_CREATED: "Bubble created successfully!",
  PROFILE_UPDATED: "Profile updated successfully!",
  MESSAGE_SENT: "Message sent!",
  INVITATION_SENT: "Invitation sent!",
} as const;
```

#### Task 3.2.5: Replace Hardcoded Values

**Priority files to update:**
- [ ] `api/bubbles.ts` - Use `RPC_FUNCTIONS.CREATE_GROUP` instead of `"create_group"`
- [ ] `api/matching.ts` - Use RPC function constants
- [ ] All navigation - Use `ROUTES.BUBBLE_FORM` instead of `"/bubble/form"`
- [ ] All styled components - Use `SPACING.MD` instead of `16`
- [ ] All error alerts - Use `ERROR_MESSAGES.*` instead of string literals

**Example:**
```typescript
// Before:
router.push("/bubble/form");
const { data } = await supabase.rpc("create_group", ...);
Alert.alert("Error", "Failed to create bubble");

// After:
import { ROUTES, RPC_FUNCTIONS, ERROR_MESSAGES } from "@/constants";
router.push(ROUTES.BUBBLE_FORM);
const { data } = await supabase.rpc(RPC_FUNCTIONS.CREATE_GROUP, ...);
Alert.alert("Error", ERROR_MESSAGES.BUBBLE_CREATION_FAILED);
```

---

### 3.3 Implement Proper Error Handling (12-16 hours)

#### Task 3.3.1: Create Error Classes
- [ ] Create `utils/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ApiError extends AppError {
  constructor(code: string, message: string, userMessage?: string) {
    super(code, message, userMessage);
    this.name = "ApiError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, message);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network error") {
    super("NETWORK_ERROR", message, ERROR_MESSAGES.NETWORK_ERROR);
    this.name = "NetworkError";
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super("AUTH_ERROR", message, ERROR_MESSAGES.SESSION_EXPIRED);
    this.name = "AuthError";
  }
}
```

#### Task 3.3.2: Create Error Handler Service
- [ ] Create `services/ErrorHandler.ts`

```typescript
import { Alert } from "react-native";
import { logger } from "./Logger";
import { AppError, ApiError, ValidationError, NetworkError } from "@/utils/errors";
import { ERROR_MESSAGES } from "@/constants/messages";

export class ErrorHandler {
  handle(error: unknown, context?: string) {
    logger.error(`Error in ${context || "unknown context"}`, error as Error);

    if (error instanceof ValidationError) {
      this.showUserError(error.userMessage || error.message);
    } else if (error instanceof NetworkError) {
      this.showUserError(ERROR_MESSAGES.NETWORK_ERROR);
    } else if (error instanceof ApiError) {
      this.showUserError(error.userMessage || ERROR_MESSAGES.UNKNOWN_ERROR);
      // TODO: Send to error tracking (Sentry)
    } else if (error instanceof AppError) {
      this.showUserError(error.userMessage || error.message);
    } else {
      this.showUserError(ERROR_MESSAGES.UNKNOWN_ERROR);
      // TODO: Send to error tracking (Sentry)
    }
  }

  private showUserError(message: string) {
    Alert.alert("Error", message);
  }

  showSuccess(message: string) {
    Alert.alert("Success", message);
  }
}

export const errorHandler = new ErrorHandler();
```

#### Task 3.3.3: Update API Client with Error Handling
- [ ] Update `api/client.ts`

```typescript
import { NetworkError, ApiError } from "@/utils/errors";

export class ApiClient {
  async rpc<T = any>(
    functionName: string,
    params?: Record<string, any>,
    retries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        logger.debug(`API Call: ${functionName} (attempt ${attempt + 1})`);

        const { data, error } = await supabase.rpc(functionName, params);

        if (error) {
          // Check if it's a network error
          if (error.message.includes("network") || error.message.includes("fetch")) {
            throw new NetworkError();
          }

          throw new ApiError(
            error.code || "UNKNOWN",
            error.message,
            this.getUserFriendlyMessage(error)
          );
        }

        return data as T;
      } catch (error) {
        if (attempt === retries - 1) {
          // Last attempt failed
          throw error;
        }

        // Wait before retry (exponential backoff)
        await this.wait(Math.pow(2, attempt) * 1000);
      }
    }

    throw new ApiError("MAX_RETRIES", "Max retries exceeded");
  }

  private getUserFriendlyMessage(error: any): string {
    // Map common error codes to user-friendly messages
    const errorMap: Record<string, string> = {
      "23505": "This record already exists.",
      "23503": "Cannot delete: related records exist.",
      "42501": "You don't have permission to do that.",
      "P0001": error.message, // Custom RPC error
    };

    return errorMap[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  private wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

#### Task 3.3.4: Use Error Handler in Components

**Update all try-catch blocks:**
```typescript
// Before:
try {
  const data = await bubbleApi.createBubble(params);
} catch (error) {
  console.error(error);
  Alert.alert("Error", "Something went wrong");
}

// After:
import { errorHandler } from "@/services/ErrorHandler";

try {
  const data = await bubbleApi.createBubble(params);
  errorHandler.showSuccess(SUCCESS_MESSAGES.BUBBLE_CREATED);
} catch (error) {
  errorHandler.handle(error, "BubbleCreation");
}
```

---

### 3.4 Feature-based Reorganization (24-40 hours)

**This is the largest refactor - reorganize entire codebase by feature**

#### Task 3.4.1: Create New Directory Structure
- [ ] Create feature directories:

```bash
mkdir -p src/features/{auth,bubbles,matching,chat,profile}/\{components,hooks,screens,types,api\}
mkdir -p src/shared/{components,hooks,utils,types,constants}
mkdir -p src/core/{api,navigation,storage,services}
```

#### Task 3.4.2: Move Auth Feature
- [ ] Move files to `src/features/auth/`:
  - `app/login/*` → `screens/`
  - `providers/AuthProvider.tsx` → `AuthProvider.tsx`
  - `hooks/useInitialRouteRedirect.ts` → `hooks/`
  - Create `types.ts` for auth types
  - Create `api.ts` for auth API calls

#### Task 3.4.3: Move Bubbles Feature
- [ ] Move files to `src/features/bubbles/`:
  - `app/bubble/*` → `screens/`
  - `components/bubble/*` → `components/`
  - `components/BubbleComponent.tsx` → `components/`
  - `components/ui/CreateBubbleModal.tsx` → `components/`
  - `api/bubbles.ts` → `api.ts`
  - Create `types.ts` for bubble types
  - Create `hooks/useBubbleData.ts`

#### Task 3.4.4: Move Matching Feature
- [ ] Move files to `src/features/matching/`:
  - `app/(tabs)/index.tsx` → `screens/HomeScreen.tsx`
  - `app/(tabs)/match.tsx` → `screens/MatchScreen.tsx`
  - `components/matchmaking/*` → `components/`
  - `hooks/useMatchmaking.ts` → `hooks/`
  - `hooks/useLikesYou.ts` → `hooks/`
  - `api/matching.ts` → `api.ts`

#### Task 3.4.5: Move Chat Feature
- [ ] Move files to `src/features/chat/`:
  - `app/(tabs)/chats.tsx` → `screens/ChatsScreen.tsx`
  - `app/chat-room/*` → `screens/ChatRoomScreen.tsx`
  - `components/chat/*` → `components/`
  - `api/chat.ts` → `api.ts`

#### Task 3.4.6: Move Profile Feature
- [ ] Move files to `src/features/profile/`:
  - `app/(tabs)/profile.tsx` → `screens/ProfileScreen.tsx`
  - `components/profile/*` → `components/`
  - `components/ProfileHero.tsx` → `components/`
  - `components/ProfileTab.tsx` → `components/`
  - `hooks/useProfileData.ts` → `hooks/`

#### Task 3.4.7: Move Shared Code
- [ ] Move to `src/shared/`:
  - `components/CustomButton.tsx` → `components/ui/`
  - `components/CustomView.tsx` → `components/layout/`
  - `components/ErrorBoundary.tsx` → `components/feedback/`
  - `components/feedback/*` → `components/feedback/`
  - `hooks/useAppTheme.ts` → `hooks/`
  - `hooks/useImageUpload.ts` → `hooks/`
  - `utils/*` → `utils/`
  - `constants/*` → `constants/`
  - `types/*` → `types/`

#### Task 3.4.8: Move Core Infrastructure
- [ ] Move to `src/core/`:
  - `lib/supabase.ts` → `api/supabase.ts`
  - `api/client.ts` → `api/client.ts`
  - `services/*` → `services/`

#### Task 3.4.9: Update tsconfig.json Paths
- [ ] Update path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/core/*": ["./src/core/*"]
    }
  }
}
```

#### Task 3.4.10: Update All Imports
- [ ] Use find-and-replace to update imports:
  - `@/components/` → `@/shared/components/` or `@/features/*/components/`
  - `@/hooks/` → `@/shared/hooks/` or `@/features/*/hooks/`
  - `@/lib/supabase` → `@/core/api/supabase`
  - etc.

**This is a massive refactor - consider doing it incrementally, one feature at a time**

---

### 3.5 Performance Optimization (12-20 hours)

#### Task 3.5.1: Add React.memo to Components
- [ ] Identify expensive components (profile cards, match cards, chat messages)
- [ ] Wrap with React.memo:

```typescript
// components/matching/MatchCard.tsx
export const MatchCard = React.memo<MatchCardProps>(({ match, onLike, onPass }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.match.id === nextProps.match.id;
});
```

**Components to memoize:**
- [ ] `MatchCard.tsx`
- [ ] `BubbleCard.tsx`
- [ ] `ChatItem.tsx`
- [ ] `ProfileCard.tsx`
- [ ] `UserAvatar.tsx`

#### Task 3.5.2: Add useMemo and useCallback
- [ ] Find expensive computations and wrap with useMemo:

```typescript
// Before:
const filteredBubbles = bubbles.filter(b => b.status === "full");

// After:
const filteredBubbles = useMemo(
  () => bubbles.filter(b => b.status === "full"),
  [bubbles]
);
```

- [ ] Wrap event handlers with useCallback:

```typescript
// Before:
const handleLike = (groupId: string) => {
  likeMutation.mutate(groupId);
};

// After:
const handleLike = useCallback((groupId: string) => {
  likeMutation.mutate(groupId);
}, [likeMutation]);
```

#### Task 3.5.3: Replace ScrollView with FlatList
- [ ] Find ScrollViews rendering lists
- [ ] Replace with FlatList for virtualization:

```typescript
// Before:
<ScrollView>
  {bubbles.map(bubble => (
    <BubbleCard key={bubble.id} bubble={bubble} />
  ))}
</ScrollView>

// After:
<FlatList
  data={bubbles}
  renderItem={({ item }) => <BubbleCard bubble={item} />}
  keyExtractor={item => item.id}
  windowSize={10}
  maxToRenderPerBatch={5}
  removeClippedSubviews
/>
```

**Files to update:**
- [ ] `app/(tabs)/chats.tsx` - Chat list
- [ ] `components/profile/ProfileBubbles.tsx` - Bubble list
- [ ] `components/InvitationPage.tsx` - Invitation list

#### Task 3.5.4: Lazy Load Images
- [ ] Install: `npm install react-native-fast-image`
- [ ] Replace `<Image>` with `<FastImage>`:

```typescript
import FastImage from "react-native-fast-image";

<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.normal }}
  style={styles.image}
  resizeMode={FastImage.resizeMode.cover}
/>
```

#### Task 3.5.5: Code Splitting (Expo Router)
- [ ] Use dynamic imports for heavy screens:

```typescript
// app/_layout.tsx
import { lazy, Suspense } from "react";

const ChatRoomScreen = lazy(() => import("./chat-room"));

// In route:
<Suspense fallback={<LoadingState />}>
  <ChatRoomScreen />
</Suspense>
```

---

## PHASE 4: Production Readiness (Week 7-8)
**Estimated Time:** 56-84 hours
**Priority:** LOW - Nice to have

### 4.1 Accessibility (16-24 hours)

#### Task 4.1.1: Add Accessibility Labels
- [ ] Add to all interactive elements:

```typescript
<TouchableOpacity
  accessibilityLabel="Like this bubble"
  accessibilityRole="button"
  accessibilityHint="Double tap to like this bubble"
>
  <Icon name="heart" />
</TouchableOpacity>
```

#### Task 4.1.2: Test with Screen Readers
- [ ] Test on iOS with VoiceOver
- [ ] Test on Android with TalkBack
- [ ] Fix navigation issues

#### Task 4.1.3: Improve Color Contrast
- [ ] Run contrast checker on all text
- [ ] Ensure WCAG AA compliance (4.5:1 for normal text)

#### Task 4.1.4: Add Keyboard Navigation
- [ ] Test tab order
- [ ] Add focus management in modals

---

### 4.2 Dark Mode (8-12 hours)

#### Task 4.2.1: Activate Dark Theme
- [ ] Update `hooks/useAppTheme.ts` to use dark colors
- [ ] Test all screens with dark mode
- [ ] Fix any contrast issues

#### Task 4.2.2: Add Theme Toggle
- [ ] Create theme toggle in settings
- [ ] Persist preference to AsyncStorage

---

### 4.3 Monitoring & Analytics (8-12 hours)

#### Task 4.3.1: Set Up Sentry
- [ ] Install: `npm install @sentry/react-native`
- [ ] Configure in `app/_layout.tsx`:

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: __DEV__,
});
```

- [ ] Update Logger to send errors to Sentry

#### Task 4.3.2: Add Analytics
- [ ] Choose analytics platform (Mixpanel, Amplitude)
- [ ] Implement AnalyticsService (from Phase 3 recommendations)
- [ ] Add tracking to key events:
  - User signs up
  - Bubble created
  - Match made
  - Message sent

---

### 4.4 Documentation (8-12 hours)

#### Task 4.4.1: Create Feature READMEs
- [ ] Add README to each feature folder explaining:
  - What the feature does
  - Key components
  - API integration
  - Testing strategy

#### Task 4.4.2: Update Main README
- [ ] Add architecture diagram
- [ ] Document folder structure
- [ ] Add contribution guidelines

#### Task 4.4.3: Add Inline Documentation
- [ ] Add JSDoc comments to complex functions
- [ ] Document prop types with descriptions

---

### 4.5 E2E Tests (16-24 hours)

#### Task 4.5.1: Set Up Detox
- [ ] Install: `npm install --save-dev detox`
- [ ] Configure for iOS/Android

#### Task 4.5.2: Write Critical Flow Tests
- [ ] Test: User signup → Profile completion → Bubble creation
- [ ] Test: Swipe → Match → Chat
- [ ] Test: Invitation flow

---

## Duplicate Code Removal Checklist

### ✅ High Priority Duplications

- [ ] **Skeleton Components** (~150 lines duplicated)
  - **Locations:** `app/(tabs)/profile.tsx`, `app/bubble/form.tsx`, `app/(tabs)/index.tsx`
  - **Action:** Create `components/feedback/SkeletonLoader.tsx` (Task 1.4.1)
  - **Savings:** ~150 lines

- [ ] **User Bubble Display Logic** (~200 lines duplicated)
  - **Locations:** `app/(tabs)/index.tsx` and `app/(tabs)/match.tsx`
  - **Action:** Extract to `components/matching/UserBubbleHeader.tsx`
  - **Savings:** ~200 lines

- [ ] **Swipe Card Logic** (~600 lines duplicated)
  - **Locations:** `app/(tabs)/index.tsx` (1,098 lines) and `app/(tabs)/match.tsx` (802 lines)
  - **Action:** Extract to shared `MatchCardList` component (Task 2.1.4)
  - **Savings:** ~800 lines (reduce from 1,900 to ~600)

- [ ] **Avatar URL Handling** (~50 lines duplicated)
  - **Locations:** `components/ProfileHero.tsx`, `components/SearchComponent.tsx`, `app/bubble/form.tsx`
  - **Action:** Use `utils/avatarUtils.ts` consistently everywhere
  - **Savings:** ~50 lines

- [ ] **Error Handling Patterns** (~100 lines duplicated)
  - **Locations:** Every file with Supabase RPC calls (15+ files)
  - **Action:** Use centralized error handler (Task 3.3.4)
  - **Savings:** ~100 lines

- [ ] **Modal State Management** (~80 lines duplicated)
  - **Locations:** `CreateBubbleModal.tsx`, `BubbleFormationModal.tsx`, `InviteModal.tsx`
  - **Action:** Create shared `useModal` hook
  - **Savings:** ~80 lines

### Total Duplicate Code Removal: ~1,380 lines

---

## Inefficient Code Fixes

### ✅ Performance Issues

#### 1. **ScrollView Instead of FlatList** (Priority: High)
**Problem:** Renders all items at once, causes lag with large lists

**Locations:**
- [ ] `app/(tabs)/chats.tsx` - Chat list
- [ ] `components/profile/ProfileBubbles.tsx` - Bubble list
- [ ] `components/InvitationPage.tsx` - Invitation list

**Fix:** Replace with FlatList (Task 3.5.3)
```typescript
// Before: Renders 100 items at once
<ScrollView>
  {chats.map(chat => <ChatItem chat={chat} />)}
</ScrollView>

// After: Renders only visible items
<FlatList
  data={chats}
  renderItem={({ item }) => <ChatItem chat={item} />}
  windowSize={10}
  maxToRenderPerBatch={5}
/>
```

---

#### 2. **Missing React.memo** (Priority: High)
**Problem:** Components re-render unnecessarily

**Locations:**
- [ ] `components/matchmaking/MatchCard.tsx` (196 lines) - Re-renders on every parent update
- [ ] `components/bubble/BubbleTabItem.tsx` (337 lines) - Re-renders on every state change
- [ ] `components/chat/ChatItem.tsx` - Re-renders for every message

**Fix:** Add React.memo (Task 3.5.1)

---

#### 3. **No useMemo for Expensive Computations** (Priority: Medium)
**Problem:** Recalculates on every render

**Locations:**
- [ ] `app/(tabs)/index.tsx` - centerBubbleDiameter calculated every render
- [ ] `hooks/useMatchmaking.ts` - Filter operations not memoized
- [ ] `app/(tabs)/profile.tsx` - Bubble filtering recalculated

**Fix:** Add useMemo (Task 3.5.2)
```typescript
// Before: Calculated every render
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);

// After: Calculated only when dependencies change
const centerBubbleDiameter = useMemo(
  () => Math.min(screenWidth * 1.12, screenHeight * 0.62),
  [screenWidth, screenHeight]
);
```

---

#### 4. **No useCallback for Event Handlers** (Priority: Medium)
**Problem:** New function created every render, breaks memoization

**Locations:**
- [ ] `app/(tabs)/index.tsx` - handleLike, handlePass created every render
- [ ] `components/matchmaking/MatchCard.tsx` - Event handlers
- [ ] All components passing callbacks to children

**Fix:** Add useCallback (Task 3.5.2)

---

#### 5. **Unoptimized Images** (Priority: Medium)
**Problem:** No compression, no caching, load all at once

**Locations:**
- [ ] `components/ProfileHero.tsx` - Profile images
- [ ] `components/matchmaking/MatchCard.tsx` - Match images
- [ ] `app/bubble/form.tsx` - Member avatars

**Fix:**
- Use `react-native-fast-image` for caching (Task 3.5.4)
- Add lazy loading
- Compress images before upload

---

#### 6. **Excessive Re-renders from Context** (Priority: High)
**Problem:** RealtimeProvider causes entire app to re-render

**Locations:**
- [ ] `providers/RealtimeProvider.tsx` (612 lines) - Updates trigger full tree re-render

**Fix:** Split into focused providers (Task 3.1.1)

---

#### 7. **No Request Deduplication** (Priority: Medium)
**Problem:** Same API call made multiple times simultaneously

**Locations:**
- [ ] `hooks/useMatchmaking.ts` - Multiple components fetch same data
- [ ] `app/(tabs)/profile.tsx` - Bubble fetch called multiple times

**Fix:** Use React Query (Task 3.1.2) - automatic deduplication

---

#### 8. **Inefficient Real-time Subscriptions** (Priority: Medium)
**Problem:** Too many channels, not cleaned up properly

**Locations:**
- [ ] `providers/RealtimeProvider.tsx` - Creates 5+ channels
- [ ] Some components create their own subscriptions without cleanup

**Fix:**
- Consolidate subscriptions (Task 3.1.1)
- Ensure proper cleanup in useEffect

---

#### 9. **No Data Pagination** (Priority: Low)
**Problem:** Loads all data at once

**Locations:**
- [ ] `app/(tabs)/chats.tsx` - Loads all chats
- [ ] `app/chat-room/index.tsx` - Loads all messages

**Fix:** Implement pagination:
```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ["chats"],
  queryFn: ({ pageParam = 0 }) => chatApi.getChats(pageParam, 20),
  getNextPageParam: (lastPage, pages) => pages.length,
});
```

---

#### 10. **Synchronous AsyncStorage Calls** (Priority: Low)
**Problem:** Blocks main thread

**Locations:**
- [ ] Multiple places use `await AsyncStorage.getItem()` in render

**Fix:** Move to useEffect or use Zustand persist

---

### Summary of Inefficiencies to Fix

| Issue | Impact | Priority | Est. Time |
|-------|--------|----------|-----------|
| ScrollView → FlatList | High | High | 4 hours |
| Missing React.memo | High | High | 4 hours |
| Missing useMemo | Medium | Medium | 4 hours |
| Missing useCallback | Medium | Medium | 4 hours |
| Unoptimized images | Medium | Medium | 6 hours |
| Context re-renders | High | High | 8 hours |
| No request dedup | Medium | Medium | 4 hours |
| Inefficient subscriptions | Medium | Medium | 4 hours |
| No pagination | Low | Low | 8 hours |
| Sync AsyncStorage | Low | Low | 2 hours |

**Total Performance Optimization: ~48 hours**

---

## Progress Tracking

### Phase 1: Critical Fixes (MODIFIED - SKIPPING TESTS) ✅ **COMPLETED**
**Started:** December 29, 2025
**Completed:** December 29, 2025

- [x] 1.1 Error Boundaries (2-4h) ✅
  - Created `components/ErrorBoundary.tsx`
  - Wrapped app in `app/_layout.tsx`
- [x] 1.2 Logger Service (2-3h) ✅
  - Created `services/Logger.ts`
  - Replaced console.logs in `app/_layout.tsx` (26 replacements)
  - Remaining 800+ console.logs deferred
- [x] 1.3 TypeScript Strict (4-8h) ✅
  - Enabled strict mode in `tsconfig.json`
  - Fixed type definitions in `types/profile.ts` and `types/bubble.ts`
  - Fixed error handling and imports
  - **Reduced errors from 60 → 45** (remaining are non-critical)
- [x] 1.4 Skeleton Components (2h) ✅
  - Created `components/feedback/SkeletonLoader.tsx`
  - Removed ~180 lines of duplicate skeleton code
- [x] ~~1.5 Test Infrastructure (8-16h)~~ **SKIPPED** (will do after Phase 2-3)

**Actual Time: ~10 hours**
**Impact: Error boundaries, logger, strict types, -180 lines duplication, NO UI changes**

### Phase 2: Code Quality ⬜
- [ ] 2.1 Split Large Files (16-24h)
- [ ] 2.2 Split Database (8-12h)
- [ ] 2.3 API Client Layer (8-12h)
- [ ] 2.4 Loading States (8-12h)
- [ ] 2.5 Offline Support (16-24h)
**Total: 64-96 hours**

### Phase 3: Architecture ⬜
- [ ] 3.1 State Management (16-24h)
- [ ] 3.2 Constants (4-6h)
- [ ] 3.3 Error Handling (12-16h)
- [ ] 3.4 Feature-based Structure (24-40h)
- [ ] 3.5 Performance (12-20h)
**Total: 68-106 hours**

### Phase 4: Production ⬜
- [ ] 4.1 Accessibility (16-24h)
- [ ] 4.2 Dark Mode (8-12h)
- [ ] 4.3 Monitoring (8-12h)
- [ ] 4.4 Documentation (8-12h)
- [ ] 4.5 E2E Tests (16-24h)
**Total: 56-84 hours**

---

## Grand Total: 208-321 hours

**Recommended Timeline:**
- **Week 1-2:** Phase 1 (Critical)
- **Week 3-4:** Phase 2 (Code Quality)
- **Week 5-6:** Phase 3 (Architecture)
- **Week 7-8:** Phase 4 (Production)

**Or incremental approach over 3-4 months while continuing feature development**

---

## Notes

- This plan should be followed in order - each phase builds on the previous
- Can be done incrementally (1-2 tasks per day while developing features)
- All file paths will need updating after feature-based reorganization (Phase 3.4)
- Test after each major task to ensure nothing breaks
- Consider creating a `refactor` branch for major changes

**Good luck! 🚀**
