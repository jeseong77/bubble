# 🎯 Matchmaking UI Integration TODO

## ✅ **Completed: Data Layer & Components**

- [x] `useMatchmaking` hook with pagination support
- [x] `avatarUtils` for signed URL generation
- [x] `MatchmakingProvider` context
- [x] `MatchCard` component
- [x] Loading/Error/Empty state components

## 🔄 **TODO: UI Integration Phase**

### **Phase 1: Update `app/(tabs)/index.tsx`**

#### **1.1 Replace Mock Data with Real Data**

```typescript
// TODO: Replace these imports
import { useMatchmakingContext } from "@/providers/MatchmakingProvider";
import { MatchCard } from "@/components/matchmaking/MatchCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  NoGroupState,
} from "@/components/matchmaking/MatchmakingStates";

// TODO: Replace mock data with real data
const {
  matchingGroups,
  isLoading,
  error,
  likeGroup,
  passGroup,
  currentUserGroup,
} = useMatchmakingContext();
```

#### **1.2 Update Component State Management**

```typescript
// TODO: Replace current state management
const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
const [isAnimating, setIsAnimating] = useState(false);

// TODO: Add proper state management for real data
const currentGroup = matchingGroups[currentGroupIndex];
```

#### **1.3 Update Animation Logic**

```typescript
// TODO: Update changeBubbleAndAnimateIn function
const changeBubbleAndAnimateIn = (direction: "left" | "right") => {
  // TODO: Handle real data cycling
  const nextIndex = (currentGroupIndex + 1) % matchingGroups.length;
  setCurrentGroupIndex(nextIndex);

  // TODO: Handle empty state when no more groups
  if (matchingGroups.length === 0) {
    // Show empty state
    return;
  }
};
```

#### **1.4 Update Swipe Handlers**

```typescript
// TODO: Update handleSwipe function
const handleSwipe = async (direction: "left" | "right") => {
  if (isAnimating || !currentGroup) return;

  setIsAnimating(true);

  if (direction === "right") {
    // TODO: Call likeGroup RPC
    const isMatch = await likeGroup(currentGroup.group_id);
    if (isMatch) {
      // TODO: Show match notification
      Alert.alert(
        "It's a Match! 🎉",
        "You and the other group liked each other!"
      );
    }
  } else {
    // TODO: Call passGroup
    passGroup(currentGroup.group_id);
  }

  // TODO: Animate to next group
  animateToNextGroup(direction);
};
```

#### **1.5 Update User Profile Navigation**

```typescript
// TODO: Update handleUserClick function
const handleUserClick = (user: GroupMember) => {
  router.push({
    pathname: "/bubble/user/[userId]",
    params: {
      userId: user.user_id,
      name: user.first_name,
      age: user.age.toString(),
      mbti: user.mbti,
      height: user.height,
      location: user.location,
      bio: user.bio,
      images: JSON.stringify([user.avatar_url]), // TODO: Handle multiple images
    },
  });
};
```

### **Phase 2: Add Provider to App Layout**

#### **2.1 Update `app/_layout.tsx`**

```typescript
// TODO: Add MatchmakingProvider to app layout
import { MatchmakingProvider } from "@/providers/MatchmakingProvider";

// TODO: Wrap the app with MatchmakingProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <MatchmakingProvider>{/* Rest of app */}</MatchmakingProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
```

### **Phase 3: Handle Edge Cases**

#### **3.1 Empty States**

```typescript
// TODO: Add empty state handling
if (!currentUserGroup) {
  return <NoGroupState onCreateGroup={() => router.push("/(tabs)/profile")} />;
}

if (matchingGroups.length === 0 && !isLoading) {
  return <EmptyState onRefresh={refetch} />;
}
```

#### **3.2 Loading States**

```typescript
// TODO: Add loading state handling
if (isLoading) {
  return <LoadingState />;
}

if (error) {
  return <ErrorState error={error} onRetry={refetch} />;
}
```

#### **3.3 Pre-fetching Logic**

```typescript
// TODO: Add pre-fetching when user reaches 70% through current batch
useEffect(() => {
  if (currentGroupIndex >= matchingGroups.length * 0.7 && hasMore) {
    loadMore();
  }
}, [currentGroupIndex, matchingGroups.length, hasMore, loadMore]);
```

### **Phase 4: Performance Optimizations**

#### **4.1 Image Pre-loading**

```typescript
// TODO: Pre-load images for next few groups
const preloadImages = async (groups: MatchingGroup[]) => {
  // TODO: Implement image pre-loading logic
};
```

#### **4.2 Animation Optimizations**

```typescript
// TODO: Optimize animations for real data
const animateToNextGroup = (direction: "left" | "right") => {
  // TODO: Ensure smooth animations with dynamic data
};
```

### **Phase 5: Real-time Updates**

#### **5.1 Match Notifications**

```typescript
// TODO: Add real-time match notifications
useEffect(() => {
  // TODO: Subscribe to matches table changes
  // TODO: Show toast notifications for new matches
}, []);
```

#### **5.2 Group Status Updates**

```typescript
// TODO: Handle group status changes
useEffect(() => {
  // TODO: Refresh data when group status changes
}, []);
```

## 🚀 **Implementation Priority**

### **High Priority (Core Functionality)**

1. Replace mock data with real data in `index.tsx`
2. Update swipe handlers to call RPCs
3. Add provider to app layout
4. Handle loading/error states

### **Medium Priority (UX Improvements)**

1. Add empty state handling
2. Implement pre-fetching logic
3. Add match notifications
4. Optimize animations

### **Low Priority (Polish)**

1. Image pre-loading
2. Real-time updates
3. Performance optimizations
4. Analytics tracking

## 🧪 **Testing Checklist**

- [ ] Test with real data from database
- [ ] Test like/pass functionality
- [ ] Test pagination and pre-fetching
- [ ] Test error handling
- [ ] Test empty states
- [ ] Test match notifications
- [ ] Test user profile navigation
- [ ] Test performance with large datasets

## 📝 **Notes**

- Start with small batch size (5) for early testing
- Monitor API call frequency and optimize as needed
- Ensure smooth animations with real data
- Handle edge cases gracefully
- Add proper error boundaries
