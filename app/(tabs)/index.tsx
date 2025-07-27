import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  ViewStyle,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useMatchmakingContext } from "@/providers/MatchmakingProvider";
import { MatchCard } from "@/components/matchmaking/MatchCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  NoGroupState,
} from "@/components/matchmaking/MatchmakingStates";
import { GroupMember } from "@/hooks/useMatchmaking";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Adaptive sizing
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);
const userBubbleDiameter = Math.max(screenWidth * 0.32, 120);
const userBubbleImageSize = userBubbleDiameter * 0.54;
const overlapRatio = 0.32;
const centerBubbleImageSize = centerBubbleDiameter * 0.44;
const centerBubbleOverlap = centerBubbleImageSize * 0.18;

// Mock data for user's own bubble (this will be replaced with real data later)
const userBubble = {
  name: "Chill Bros",
  users: [
    {
      name: "John",
      age: 25,
      image: { uri: "https://picsum.photos/seed/john_01/200/200" },
    },
    {
      name: "Mike",
      age: 26,
      image: { uri: "https://picsum.photos/seed/mike_02/200/200" },
    },
  ],
};

export default function MatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Get real data from context
  const {
    matchingGroups,
    isLoading,
    isLoadingMore,
    error,
    likeGroup,
    passGroup,
    currentUserGroup,
    hasMore,
    loadMore,
    refetch,
  } = useMatchmakingContext();

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentMatches, setRecentMatches] = useState<string[]>([]); // Track recent matches for better UX

  // Get current group from real data
  const currentGroup = matchingGroups[currentGroupIndex];

  // Unified animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle different states
  if (!currentUserGroup) {
    return (
      <NoGroupState onCreateGroup={() => router.push("/(tabs)/profile")} />
    );
  }

  if (isLoading) {
    return <LoadingState message="Finding your perfect matches..." />;
  }

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

  if (matchingGroups.length === 0 && !isLoading) {
    return (
      <EmptyState
        message="No more matches available right now. Check back later!"
        onRefresh={() => {
          console.log("[MatchScreen] Refreshing empty state...");
          refetch();
        }}
      />
    );
  }

  // Handle user image click
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

  // Animate and switch bubble data
  const changeBubbleAndAnimateIn = (direction: "left" | "right") => {
    // Handle real data cycling
    const nextIndex = (currentGroupIndex + 1) % matchingGroups.length;
    setCurrentGroupIndex(nextIndex);

    // Handle empty state when no more groups
    if (matchingGroups.length === 0) {
      return;
    }

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

    // Add haptic feedback
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAnimating(true);

    if (direction === "right") {
      // Visual feedback for like action
      console.log(`[MatchScreen] Liking group: ${currentGroup.group_name}`);

      // Call likeGroup RPC
      const isMatch = await likeGroup(currentGroup.group_id);
      if (isMatch) {
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
                // TODO: Navigate to matches screen
                console.log("Navigate to matches screen");
              },
            },
          ]
        );
      } else {
        console.log(
          `[MatchScreen] Liked ${currentGroup.group_name} (no match yet)`
        );
      }
    } else {
      // Visual feedback for pass action
      console.log(`[MatchScreen] Passing group: ${currentGroup.group_name}`);
      passGroup(currentGroup.group_id);
    }

    // Animate OUT
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top }]}
      edges={["top"]}
    >
      <LinearGradient
        colors={["#e3f0ff", "#cbe2ff", "#e3f0ff"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* User's bubble at top left */}
      <View
        style={[
          styles.userBubbleContainer,
          {
            left: Math.max(
              0,
              (screenWidth - centerBubbleDiameter) / 2 -
                userBubbleDiameter * 0.18
            ),
            top: insets.top + 24,
            width: userBubbleDiameter,
            height: userBubbleDiameter + 24,
          },
        ]}
      >
        <BlurView
          style={styles.userBubbleBlur}
          intensity={Platform.OS === "ios" ? 60 : 80}
          tint="light"
        >
          <Text style={styles.userBubbleName}>{userBubble.name}</Text>
          <View style={styles.userBubbleRow}>
            {userBubble.users.map((user, idx) => (
              <View
                key={user.name}
                style={{
                  marginLeft:
                    idx === 1 ? -userBubbleImageSize * overlapRatio : 0,
                  zIndex: idx === 0 ? 2 : 1,
                }}
              >
                <Image
                  source={user.image}
                  style={{
                    width: userBubbleImageSize,
                    height: userBubbleImageSize,
                    borderRadius: userBubbleImageSize / 2,
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                />
              </View>
            ))}
          </View>
        </BlurView>
        <View style={styles.pinIconWrap}>
          <View style={styles.pinCircle}>
            <Feather name="feather" size={18} color="#fff" />
          </View>
        </View>
      </View>

      {/* Single, Unified Center Bubble */}
      <Animated.View
        style={[
          styles.centerBubbleWrap,
          {
            top: screenHeight * 0.17 + insets.top,
            left: (screenWidth - centerBubbleDiameter) / 2,
            width: centerBubbleDiameter,
            height: centerBubbleDiameter,
          },
          animatedBubbleStyle,
        ]}
      >
        <BlurView
          style={styles.centerBubbleBlur}
          intensity={Platform.OS === "ios" ? 60 : 80}
          tint="light"
        >
          <Text style={styles.centerBubbleName}>{currentGroup.group_name}</Text>
          <View style={styles.centerBubbleRow}>
            {currentGroup.members?.map((user, idx) => (
              <TouchableOpacity
                key={user.user_id}
                style={{
                  marginLeft: idx === 1 ? -centerBubbleOverlap : 0,
                  zIndex: idx === 0 ? 2 : 1,
                  alignItems: "center",
                }}
                onPress={() => handleUserClick(user)}
                activeOpacity={0.7}
              >
                <Text style={styles.centerBubbleUserName}>
                  {user.first_name} {user.age}
                </Text>
                <Image
                  source={{ uri: user.avatar_url || undefined }}
                  style={styles.centerBubbleImage}
                />
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      </Animated.View>

      {/* X and Check buttons */}
      <TouchableOpacity
        style={styles.xButton}
        onPress={() => handleSwipe("left")}
      >
        <Feather name="x" size={36} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.checkButton}
        onPress={() => handleSwipe("right")}
      >
        <Feather name="heart" size={36} color="#fff" />
      </TouchableOpacity>

      {/* Loading indicator for more data */}
      {isLoadingMore && (
        <View style={styles.loadingMoreContainer}>
          <View style={styles.loadingMoreIndicator}>
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        </View>
      )}

      {/* Progress indicator */}
      {matchingGroups.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((currentGroupIndex + 1) / matchingGroups.length) * 100
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentGroupIndex + 1} of {matchingGroups.length}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Styles (unchanged from original)
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
    bottom: 48,
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
    bottom: 48,
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
  progressContainer: {
    position: "absolute",
    bottom: 100, // Adjust as needed
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  progressBar: {
    width: "80%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#8ec3ff",
  },
  progressText: {
    fontSize: 14,
    color: "#555",
  },
});
