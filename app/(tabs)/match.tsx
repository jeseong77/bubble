import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLikesYou, GroupMember } from "@/hooks/useLikesYou";
import { LikesYouContent } from "@/components/matchmaking/LikesYouContent";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  NoGroupState,
} from "@/components/matchmaking/MatchmakingStates";
import { useAuth } from "@/providers/AuthProvider";
import { useUserBubble, UserBubble } from "@/hooks/useUserBubble";
import { useLikesYouAnimation } from "@/hooks/useLikesYouAnimation";
import { EventBus } from "@/services/EventBus";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Adaptive sizing (same as main swipe screen)
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);
const userBubbleDiameter = Math.max(screenWidth * 0.32, 120);
const userBubbleImageSize = userBubbleDiameter * 0.54;
const overlapRatio = 0.32;
const centerBubbleImageSize = centerBubbleDiameter * 0.44;

export default function LikesYouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  // Get real data from custom hook (incoming likes instead of matching groups)
  const {
    incomingLikes,
    isLoading,
    isLoadingMore,
    error,
    likeBack,
    pass,
    currentUserGroup,
    currentUserGroupStatus,
    hasMore,
    loadMore,
    refetch,
  } = useLikesYou();

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Use custom hook for user bubble management
  const { userBubble, userBubbleLoading } = useUserBubble(session);

  // Get current group from real data (incoming likes instead of matching groups)
  const currentGroup = incomingLikes[currentGroupIndex];

  // Use swipe animation hook
  const { animatedBubbleStyle, handleSwipe } = useLikesYouAnimation({
    isAnimating,
    setIsAnimating,
    currentGroupIndex,
    setCurrentGroupIndex,
    incomingLikesLength: incomingLikes.length,
    currentGroupId: currentGroup?.group_id,
    currentGroupName: currentGroup?.group_name,
    likeBack,
    pass,
    onNavigateToChats: () => router.push('/(tabs)/chats'),
  });

  // Set up EventBus listeners for real-time updates
  useEffect(() => {
    const unsubscribeRefreshLikes = EventBus.onEvent('REFRESH_LIKES_COUNT', () => {
      refetch();
    });

    return () => {
      unsubscribeRefreshLikes();
    };
  }, [refetch]);

  // Handle user image click
  const handleUserClick = useCallback(
    (user: GroupMember) => {
      router.push({
        pathname: "/bubble/user/[userId]",
        params: {
          userId: user.id,
        },
      });
    },
    [router]
  );

  // Pre-fetching logic (using incomingLikes instead of matchingGroups)
  useEffect(() => {
    if (currentGroupIndex >= incomingLikes.length * 0.7 && hasMore) {
      loadMore();
    }
  }, [currentGroupIndex, incomingLikes.length, hasMore, loadMore]);

  // Enhanced pre-fetching with better UX
  useEffect(() => {
    const shouldLoadMore =
      incomingLikes.length > 0 &&
      currentGroupIndex >= Math.max(1, incomingLikes.length * 0.6) &&
      hasMore &&
      !isLoading;

    if (shouldLoadMore) {
      loadMore();
    }
  }, [currentGroupIndex, incomingLikes.length, hasMore, isLoading, loadMore]);

  // Handle different states (same as main screen but for incoming likes)
  const renderMainContent = () => {
    // User bubble loading
    if (userBubbleLoading) {
      return <LoadingState message="Loading your bubble..." />;
    }

    // User has no group OR group is still forming
    if (!userBubble || currentUserGroupStatus === 'forming') {
      return (
        <NoGroupState onCreateGroup={() => router.push("/(tabs)/profile")} />
      );
    }

    // Matching groups loading
    if (isLoading) {
      return <LoadingState message="Loading your admirers..." />;
    }

    // Matching error
    if (error) {
      return (
        <ErrorState
          error={error}
          onRetry={() => {
            refetch();
          }}
        />
      );
    }

    // No matching groups
    if (incomingLikes.length === 0 && !isLoading) {
      return (
        <EmptyState
          onRefresh={() => {
            refetch();
          }}
        />
      );
    }

    // Main content when we have data
    return (
      <LikesYouContent
        currentGroup={currentGroup}
        animatedBubbleStyle={animatedBubbleStyle}
        isAnimating={isAnimating}
        isLoadingMore={isLoadingMore}
        handleSwipe={handleSwipe}
        handleUserClick={handleUserClick}
      />
    );
  };

  // Main return - always show header with conditional content below
  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top }]}
      edges={["top"]}
    >
      <LinearGradient
        colors={["#ffffff", "#ffffff", "#ffffff"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Likes You Header - Always shown */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <Text style={styles.headerTitle}>Likes</Text>
      </View>

      {/* Main content area */}
      {renderMainContent()}
    </SafeAreaView>
  );
}

// Styles (exact same as main screen)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  userBubbleContainer: {
    position: "absolute",
    zIndex: 10,
    overflow: "visible",
  },
  userBubbleBlur: {
    width: userBubbleDiameter,
    height: userBubbleDiameter,
    borderRadius: userBubbleDiameter / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  userBubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  userBubbleName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
  },
  pinIconWrap: {
    position: "absolute",
    top: -0,
    right: -0,
    backgroundColor: "transparent",
    elevation: 50,
    pointerEvents: "box-none",
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8ec3ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 50,
    elevation: 50,
  },
  centerBubbleBlur: {
    width: centerBubbleDiameter,
    height: centerBubbleDiameter,
    borderRadius: centerBubbleDiameter / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  centerBubbleName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#303030",
    marginBottom: 18,
    marginTop: 12,
    textAlign: "center",
  },
  centerBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
  },
  centerBubbleImage: {
    width: centerBubbleImageSize,
    height: centerBubbleImageSize,
    borderRadius: centerBubbleImageSize / 2,
    borderWidth: 2.5,
    borderColor: "#fff",
    backgroundColor: "#eee",
    marginBottom: 8,
  },
  centerBubbleUserName: {
    fontSize: 20,
    color: "#303030",
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },

  // Header styles
  header: {
    width: "100%",
    position: "absolute",
    top: 59,
    height: 71,
    zIndex: 10,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 71,
    backgroundColor: "#fff",
    shadowColor: "#a6a6aa",
    shadowOffset: { width: 0, height: 0.33 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  headerTitle: {
    position: "absolute",
    top: 22,
    left: 21,
    fontSize: 32,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Quicksand",
    lineHeight: 32 * 1.193, // 119.3% line height
  },
});
