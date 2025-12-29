import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ViewStyle,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useMatchmakingContext } from "@/providers/MatchmakingProvider";
import { MatchCard } from "@/components/matchmaking/MatchCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  NoGroupState,
  NoMoreGroupsState,
} from "@/components/matchmaking/MatchmakingStates";
import { GroupMember } from "@/hooks/useMatchmaking";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useUserBubble } from "@/hooks/useUserBubble";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Adaptive sizing
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);
const centerBubbleImageSize = centerBubbleDiameter * 0.44;
const centerBubbleOverlap = centerBubbleImageSize * 0.18;

export default function MatchScreen() {
  const router = useRouter();
  const { session } = useAuth();

  // Get real data from context
  const {
    matchingGroups,
    isLoading,
    isLoadingMore,
    error,
    likeGroup,
    passGroup,
    currentUserGroup,
    currentUserGroupStatus,
    hasMore,
    loadMore,
    refetch,
    refreshAll,
    // Swipe limit data
    swipeLimitInfo,
    isLoadingSwipeLimit,
    checkSwipeLimit,
  } = useMatchmakingContext();

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentMatches, setRecentMatches] = useState<string[]>([]);

  // Use custom hook for user bubble management
  const { userBubble, userBubbleLoading, refreshUserBubble } = useUserBubble(session);

  // Helper function to format reset time for small display
  const formatResetTime = (resetTimeISO: string) => {
    const resetTime = new Date(resetTimeISO);
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Resetting soon";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Resets in ${hours}h ${minutes}m`;
    } else {
      return `Resets in ${minutes}m`;
    }
  };



  // Safety check: Reset index if it goes out of bounds after group removal
  useEffect(() => {
    if (matchingGroups.length > 0 && currentGroupIndex >= matchingGroups.length) {
      setCurrentGroupIndex(0);
    }
  }, [matchingGroups.length, currentGroupIndex]);

  // Get current group from real data
  const currentGroup = matchingGroups[currentGroupIndex];

  // Focus effect for automatic refresh when returning to first tab
  useFocusEffect(
    React.useCallback(() => {
      // Refresh matchmaking data (detects active group changes)
      refreshAll();

      // Refresh user bubble data from hook
      refreshUserBubble();
    }, [refreshAll, refreshUserBubble])
  );

  // Unified animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle different states - moved to after all hooks are called
  const renderContent = () => {
    // User bubble loading
    if (userBubbleLoading) {
      return <LoadingState message="Loading your bubble..." />;
    }

    // User has no group OR group is still forming
    if (!userBubble || currentUserGroupStatus === 'forming') {
      return (
        <View style={styles.safeArea}>
          <NoGroupState onCreateGroup={() => router.push({
            pathname: "/(tabs)/profile",
            params: { activeTab: "myBubble" }
          })} />
        </View>
      );
    }

    // Matching groups loading
    if (isLoading) {
      return <LoadingState message="Finding your perfect matches..." />;
    }

    // Matching error
    if (error) {
      return (
        <ErrorState
          error={error}
          onRetry={() => {
            console.log("[MatchScreen] Retrying after error...");
            refetch();
          }}
        />
      );
    }

    // Check if daily swipe limit is reached
    if (swipeLimitInfo && !swipeLimitInfo.can_swipe) {
      return (
        <View style={styles.safeArea}>
          {/* Message Display */}
          <View style={styles.limitReachedContainer}>
            <Text style={styles.limitReachedMessage}>
              You've used all your swipes for today.{'\n'}
              Please wait for new Bubbles tomorrow!
            </Text>
          </View>

          {/* Disabled Swipe Controls */}
          <View style={styles.swipeControls}>
            <TouchableOpacity
              style={[styles.xButton, styles.disabledButton]}
              disabled={true}
            >
              <Feather name="x" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkButton, styles.disabledButton]}
              disabled={true}
            >
              <Feather name="heart" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // No matching groups
    if (matchingGroups.length === 0 && !isLoading) {
      // If user still has swipes, show "No more groups available"
      if (swipeLimitInfo && swipeLimitInfo.can_swipe) {
        return <NoMoreGroupsState />;
      }

      // Otherwise show the regular empty state (no swipes left or first time)
      return (
        <EmptyState
          message="No new matches available. Check back later!"
          onRefresh={() => {
            console.log("[MatchScreen] Refreshing empty state...");
            refetch();
          }}
        />
      );
    }

    // Main content when we have data
    return (
      <View style={styles.safeArea}>
        {/* MatchCard for the current group - Full Screen */}
        <Animated.View
          style={[
            styles.fullScreenCardContainer,
            animatedBubbleStyle,
          ]}
        >
          <MatchCard group={currentGroup} onUserPress={handleUserClick} />
        </Animated.View>

        {/* Swipe Counter and Limit Info - Hidden from UI */}
        {/* 
        {swipeLimitInfo && (
          <View style={styles.swipeCounterContainer}>
            <BlurView
              style={styles.swipeCounterBlur}
              intensity={Platform.OS === "ios" ? 60 : 80}
              tint="light"
            >
              <Text style={styles.swipeCounterText}>
                {swipeLimitInfo.remaining_swipes}/{swipeLimitInfo.daily_limit} swipes remaining
              </Text>
              {swipeLimitInfo.remaining_swipes === 0 && (
                <Text style={styles.resetTimeText}>
                  {formatResetTime(swipeLimitInfo.reset_time)}
                </Text>
              )}
            </BlurView>
          </View>
        )}
        */}

        {/* Swipe Controls */}
        <View style={styles.swipeControls}>
          <TouchableOpacity
            style={[
              styles.xButton,
              (swipeLimitInfo && !swipeLimitInfo.can_swipe) || isAnimating 
                ? styles.disabledButton 
                : null
            ]}
            onPress={() => handleSwipe("left")}
            disabled={isAnimating || (swipeLimitInfo && !swipeLimitInfo.can_swipe)}
          >
            <Feather name="x" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.checkButton,
              (swipeLimitInfo && !swipeLimitInfo.can_swipe) || isAnimating 
                ? styles.disabledButton 
                : null
            ]}
            onPress={() => handleSwipe("right")}
            disabled={isAnimating || (swipeLimitInfo && !swipeLimitInfo.can_swipe)}
          >
            <Feather name="heart" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Loading More Indicator */}
        {isLoadingMore && (
          <View style={styles.loadingMoreContainer}>
            <View style={styles.loadingMoreIndicator}>
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Handle user image click
  const handleUserClick = useCallback(
    (user: GroupMember) => {
      router.push({
        pathname: "/bubble/user/[userId]",
        params: {
          userId: user.id, // Use id instead of user_id
        },
      });
    },
    [router]
  );

  // Animate and switch bubble data
  const changeBubbleAndAnimateIn = (direction: "left" | "right") => {
    // Handle empty state when no more groups
    if (matchingGroups.length === 0) {
      return;
    }

    // Reset to 0 if current index is out of bounds (after group removal)
    let nextIndex = currentGroupIndex;
    if (currentGroupIndex >= matchingGroups.length) {
      nextIndex = 0;
    }

    setCurrentGroupIndex(nextIndex);

    // Optimized animation timing for real data
    const animationDuration = 350; // Slightly faster for better UX
    const entryX =
      direction === "left" ? screenWidth * 0.5 : -screenWidth * 0.5;
    translateX.value = entryX;
    translateY.value = -screenHeight * 0.3;
    scale.value = 0.6;

    // Animate IN to the center with optimized timing
    translateX.value = withTiming(0, { duration: animationDuration });
    translateY.value = withTiming(0, { duration: animationDuration });
    scale.value = withTiming(1, { duration: animationDuration });
    opacity.value = withTiming(
      1,
      { duration: animationDuration },
      (finished) => {
        if (finished) {
          runOnJS(setIsAnimating)(false);
        }
      }
    );
  };

  // Handler for X and Heart
  const handleSwipe = async (direction: "left" | "right") => {
    if (isAnimating || !currentGroup) return;

    // Check if swipes are available before attempting to swipe
    if (swipeLimitInfo && !swipeLimitInfo.can_swipe) {
      Alert.alert(
        "Daily Limit Reached 🚫",
        `You've used all ${swipeLimitInfo.daily_limit} swipes today. ${formatResetTime(swipeLimitInfo.reset_time)}.`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Add haptic feedback
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAnimating(true);

    try {
      if (direction === "right") {
        // Visual feedback for like action
        console.log(`[MatchScreen] Liking group: ${currentGroup.group_name}`);

        const response = await likeGroup(currentGroup.group_id);

        // Handle different response statuses
        if (response?.status === "limit_exceeded") {
          Alert.alert(
            "Daily Limit Reached 🚫",
            `You've used all your swipes today. ${response.swipe_info?.reset_time ? formatResetTime(response.swipe_info.reset_time) : 'Resets at midnight EST'}.`,
            [{ text: "OK", style: "default" }]
          );
          setIsAnimating(false);
          return;
        } else if (response?.status === "matched") {
          // Enhanced match notification with haptic feedback
          if (Platform.OS === "ios") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          setRecentMatches((prev) => [...prev, currentGroup.group_id]);
          Alert.alert(
            "It's a Match! 🎉",
            `You and ${currentGroup.group_name} liked each other!`,
            [
              {
                text: "Continue Swiping",
                style: "default",
              },
              {
                text: "View Matches",
                style: "default",
                onPress: () => {
                  // Navigate to chats screen
                  console.log(
                    "Navigate to matches/chats screen. Chat Room ID:",
                    response.chat_room_id
                  );
                  router.push('/(tabs)/chats');
                },
              },
            ]
          );
        } else if (response?.status === "error") {
          Alert.alert("Error", response.message || "Failed to like group");
          setIsAnimating(false);
          return;
        } else {
          // 'liked' status - normal like without match
          console.log(`[MatchScreen] Liked ${currentGroup.group_name} (no match yet)`);
        }
      } else {
        // Visual feedback for pass action
        console.log(`[MatchScreen] Passing group: ${currentGroup.group_name}`);
        
        const response = await passGroup(currentGroup.group_id);
        
        // Handle different response statuses for pass
        if (response?.status === "limit_exceeded") {
          Alert.alert(
            "Daily Limit Reached 🚫",
            `You've used all your swipes today. ${response.swipe_info?.reset_time ? formatResetTime(response.swipe_info.reset_time) : 'Resets at midnight EST'}.`,
            [{ text: "OK", style: "default" }]
          );
          setIsAnimating(false);
          return;
        } else if (response?.status === "error") {
          Alert.alert("Error", response.message || "Failed to pass group");
          setIsAnimating(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error in handleSwipe:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
      setIsAnimating(false);
      return;
    }

    // Animate OUT (only if swipe was successful)
    const targetX =
      direction === "left" ? -screenWidth * 0.5 : screenWidth * 0.5;
    translateX.value = withTiming(targetX, { duration: 400 });
    translateY.value = withTiming(screenHeight * 0.3, { duration: 400 });
    scale.value = withTiming(0.6, { duration: 400 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(changeBubbleAndAnimateIn)(direction);
      }
    });
  };

  // Pre-fetching logic
  useEffect(() => {
    if (currentGroupIndex >= matchingGroups.length * 0.7 && hasMore) {
      loadMore();
    }
  }, [currentGroupIndex, matchingGroups.length, hasMore, loadMore]);

  // Enhanced pre-fetching with better UX
  useEffect(() => {
    const shouldLoadMore =
      matchingGroups.length > 0 &&
      currentGroupIndex >= Math.max(1, matchingGroups.length * 0.6) &&
      hasMore &&
      !isLoading;

    if (shouldLoadMore) {
      console.log(
        `[MatchScreen] Pre-fetching more groups. Current: ${currentGroupIndex}/${matchingGroups.length}`
      );
      loadMore();
    }
  }, [currentGroupIndex, matchingGroups.length, hasMore, isLoading, loadMore]);

  // Unified animated style for the center bubble
  const animatedBubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    } as ViewStyle;
  });

  // Main return - call renderContent to handle all conditional rendering
  return renderContent();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  fullScreenCardContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  centerBubbleWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
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
  xButton: {
    position: "absolute",
    left: 32,
    bottom: 10,
    backgroundColor: "#8ec3ff",
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkButton: {
    position: "absolute",
    right: 32,
    bottom: 10,
    backgroundColor: "#8ec3ff",
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingMoreContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingVertical: 10,
    alignItems: "center",
    zIndex: 10,
  },
  loadingMoreIndicator: {
    backgroundColor: "#8ec3ff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  loadingMoreText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  swipeControls: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    zIndex: 10,
  },

  // Swipe counter styles
  swipeCounterContainer: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  swipeCounterBlur: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  swipeCounterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#303030",
  },
  resetTimeText: {
    fontSize: 12,
    color: "#7A7A7A",
    marginTop: 2,
  },
  disabledButton: {
    opacity: 0.4,
  },

  // Limit reached state styles
  limitReachedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  limitReachedMessage: {
    fontSize: 18,
    fontWeight: "500",
    color: "#303030",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 60,
  },
  countdownTimer: {
    fontSize: 120,
    fontWeight: "300",
    color: "#80B7FF",
    letterSpacing: 4,
    textAlign: "center",
    fontFamily: "System",
  },
});
