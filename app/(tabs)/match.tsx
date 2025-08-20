import React, { useState, useEffect, useCallback } from "react";
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
import { useLikesYou, GroupMember } from "@/hooks/useLikesYou";
import { MatchCard } from "@/components/matchmaking/MatchCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  NoGroupState,
} from "@/components/matchmaking/MatchmakingStates";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Adaptive sizing (same as main swipe screen)
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);
const userBubbleDiameter = Math.max(screenWidth * 0.32, 120);
const userBubbleImageSize = userBubbleDiameter * 0.54;
const overlapRatio = 0.32;
const centerBubbleImageSize = centerBubbleDiameter * 0.44;

// 사용자 그룹 정보 타입 (same as main screen)
interface UserBubble {
  id: string;
  name: string;
  members: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    signedUrl?: string;
  }[];
}

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
  const [userBubble, setUserBubble] = useState<UserBubble | null>(null);
  const [userBubbleLoading, setUserBubbleLoading] = useState(true);

  // Get current group from real data (incoming likes instead of matching groups)
  const currentGroup = incomingLikes[currentGroupIndex];

  // 초기 로딩 시에만 데이터 가져오기 (useFocusEffect 제거)
  useEffect(() => {
    console.log("[LikesYouScreen] 🎯 Initial data loading...");

    // 사용자 그룹 정보 가져오기 (same as main screen)
    const fetchUserBubble = async () => {
      if (!session?.user) return;

      setUserBubbleLoading(true);
      try {
        console.log("[LikesYouScreen] 사용자 그룹 정보 가져오기 시작");

        // 먼저 Active 버블을 확인
        console.log("[LikesYouScreen] Active 버블 확인 중...");
        const { data: activeBubbleData, error: activeBubbleError } =
          await supabase.rpc("get_user_active_bubble", {
            p_user_id: session.user.id,
          });

        console.log("[LikesYouScreen] Active 버블 조회 결과:", activeBubbleData);
        console.log("[LikesYouScreen] Active 버블 에러:", activeBubbleError);

        let targetBubble: any = null;

        if (
          !activeBubbleError &&
          activeBubbleData &&
          activeBubbleData.length > 0
        ) {
          // Active 버블이 있으면 사용
          targetBubble = activeBubbleData[0];
          console.log("[LikesYouScreen] Active 버블 사용:", targetBubble);
        } else {
          // Active 버블이 없으면 get_my_bubbles에서 첫 번째 joined 그룹 사용
          console.log("[LikesYouScreen] Active 버블 없음, get_my_bubbles 사용");
          const { data, error } = await supabase.rpc("get_my_bubbles", {
            p_user_id: session.user.id,
          });

          if (error) {
            console.error("[LikesYouScreen] 사용자 버블 정보 조회 실패:", error);
            throw error;
          }

          console.log("[LikesYouScreen] get_my_bubbles 응답:", data);

          // joined 상태인 버블 중 첫 번째 것을 사용
          targetBubble = data?.find(
            (bubble: any) => bubble.user_status === "joined"
          );
        }

        if (targetBubble) {
          console.log("[LikesYouScreen] 사용자 그룹 발견:", targetBubble);

          // 멤버 정보 파싱 (새로운 구조에 맞게)
          let members: {
            id: string;
            first_name: string;
            last_name: string;
            images: { image_url: string; position: number }[];
          }[] = [];
          if (targetBubble.members) {
            try {
              members = Array.isArray(targetBubble.members)
                ? targetBubble.members
                : JSON.parse(targetBubble.members);
            } catch {
              members = [];
            }
          }

          // 새로운 구조에 맞게 멤버 데이터 변환
          const membersWithUrls = members.map((member) => {
            // 첫 번째 이미지를 아바타로 사용
            const avatarUrl =
              member.images && member.images.length > 0
                ? member.images[0].image_url
                : null;

            return {
              id: member.id,
              first_name: member.first_name,
              last_name: member.last_name,
              avatar_url: avatarUrl,
              signedUrl: avatarUrl, // 이미 공개 URL이므로 그대로 사용
            };
          });

          const userBubbleData: UserBubble = {
            id: targetBubble.id,
            name: targetBubble.name,
            members: membersWithUrls,
          };

          console.log("[LikesYouScreen] 사용자 그룹 데이터 설정:", userBubbleData);
          setUserBubble(userBubbleData);
        } else {
          console.log("[LikesYouScreen] 사용자가 속한 그룹이 없습니다");
          setUserBubble(null);
        }
      } catch (error) {
        console.error("[LikesYouScreen] 사용자 그룹 정보 가져오기 실패:", error);
        setUserBubble(null);
      } finally {
        setUserBubbleLoading(false);
      }
    };

    fetchUserBubble();
  }, [session?.user]); // session?.user가 변경될 때만 실행

  // 🔍 DEBUG: 매칭 그룹 데이터 로깅
  useEffect(() => {
    console.log("=== 🔍 INCOMING LIKES IN LIKES YOU ===");
    console.log("Total incoming likes:", incomingLikes.length);
    console.log("Current group index:", currentGroupIndex);
    console.log("Current group:", currentGroup);

    if (currentGroup) {
      console.log("=== 📋 CURRENT GROUP DETAILS ===");
      console.log("Group ID:", currentGroup.group_id);
      console.log("Group Name:", currentGroup.group_name);
      console.log("Group Gender:", currentGroup.group_gender);
      console.log("Preferred Gender:", currentGroup.preferred_gender);
      console.log("Match Score:", currentGroup.match_score);
      console.log("Members Count:", currentGroup.members?.length || 0);

      if (currentGroup.members && currentGroup.members.length > 0) {
        console.log("=== 👥 MEMBERS DETAILS ===");
        currentGroup.members.forEach((member, index) => {
          console.log(`Member ${index + 1}:`);
          console.log("  - Name:", member.first_name, member.last_name);
          console.log("  - Age:", member.age);
          console.log("  - MBTI:", member.mbti);
          console.log("  - Avatar:", member.avatar_url);
        });
      } else {
        console.log("❌ No members data in current group!");
      }
    } else {
      console.log("❌ No current group available");
    }
  }, [currentGroup, currentGroupIndex, incomingLikes.length]);

  // 🔍 DEBUG: 매칭 컨텍스트 상태 로깅
  useEffect(() => {
    console.log("=== 🔍 LIKES YOU CONTEXT STATE ===");
    console.log("isLoading:", isLoading);
    console.log("error:", error);
    console.log("currentUserGroup:", currentUserGroup);
    console.log("incomingLikes length:", incomingLikes.length);
    console.log("currentGroupIndex:", currentGroupIndex);
    console.log("hasMore:", hasMore);
    console.log("isLoadingMore:", isLoadingMore);
  }, [
    isLoading,
    error,
    currentUserGroup,
    incomingLikes.length,
    currentGroupIndex,
    hasMore,
    isLoadingMore,
  ]);

  // Unified animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle user image click
  const handleUserClick = useCallback(
    (user: GroupMember) => {
      console.log("=== 🖼️ USER CLICK HANDLER (LIKES YOU) ===");
      console.log("User clicked:", user);
      console.log("User ID:", user.id);
      console.log("User name:", user.first_name);

      router.push({
        pathname: "/bubble/user/[userId]",
        params: {
          userId: user.id,
        },
      });
    },
    [router]
  );

  // Animate and switch bubble data
  const changeBubbleAndAnimateIn = (direction: "left" | "right") => {
    // Handle real data cycling (using incomingLikes instead of matchingGroups)
    const nextIndex = (currentGroupIndex + 1) % incomingLikes.length;
    setCurrentGroupIndex(nextIndex);

    // Handle empty state when no more groups
    if (incomingLikes.length === 0) {
      return;
    }

    // 🔍 DEBUG: 배열 범위 체크
    console.log("=== 🔄 CHANGE BUBBLE DEBUG (LIKES YOU) ===");
    console.log("Current Index:", currentGroupIndex);
    console.log("Next Index:", nextIndex);
    console.log("Groups Length:", incomingLikes.length);
    console.log("Next Group:", incomingLikes[nextIndex]);

    // 배열 범위 체크 추가
    if (nextIndex >= incomingLikes.length) {
      console.log("❌ Index out of bounds, resetting to 0");
      setCurrentGroupIndex(0);
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

  // Handler for X and Heart (using likeBack and pass instead of likeGroup and passGroup)
  const handleSwipe = async (direction: "left" | "right") => {
    if (isAnimating || !currentGroup) return;

    // Add haptic feedback
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAnimating(true);

    if (direction === "right") {
      // Like back action (instead of regular like)
      console.log(`[LikesYouScreen] Liking back group: ${currentGroup.group_name}`);

      const response = await likeBack(currentGroup.group_id);

      if (response?.status === "matched") {
        // Enhanced match notification with haptic feedback
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

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
                router.push("/(tabs)/chats");
                console.log(
                  "Navigate to matches/chats screen. Chat Room ID:",
                  response.chat_room_id
                );
              },
            },
          ]
        );
      } else {
        // 'liked' status (no match yet)
        console.log(
          `[LikesYouScreen] Liked back ${currentGroup.group_name} (no match yet)`
        );
      }
    } else {
      // Pass action
      console.log(`[LikesYouScreen] Passing group: ${currentGroup.group_name}`);
      await pass(currentGroup.group_id);
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
      console.log(
        `[LikesYouScreen] Pre-fetching more groups. Current: ${currentGroupIndex}/${incomingLikes.length}`
      );
      loadMore();
    }
  }, [currentGroupIndex, incomingLikes.length, hasMore, isLoading, loadMore]);

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

  // Handle different states (same as main screen but for incoming likes)
  const renderMainContent = () => {
    console.log("=== 🎨 LIKES YOU RENDER CONTENT DEBUG ===");
    console.log("userBubble:", userBubble);
    console.log("userBubbleLoading:", userBubbleLoading);
    console.log("isLoading:", isLoading);
    console.log("error:", error);
    console.log("incomingLikes.length:", incomingLikes.length);
    console.log("currentGroup:", currentGroup);

    // 사용자 버블 로딩 중
    if (userBubbleLoading) {
      console.log("⏳ User bubble loading - showing LoadingState");
      return <LoadingState message="Loading your bubble..." />;
    }

    // 사용자가 속한 그룹이 없음 OR 그룹이 아직 형성중
    if (!userBubble || currentUserGroupStatus === 'forming') {
      console.log("❌ No user bubble or forming group - showing NoGroupState");
      console.log("userBubble:", !!userBubble, "currentUserGroupStatus:", currentUserGroupStatus);
      return (
        <NoGroupState onCreateGroup={() => router.push("/(tabs)/profile")} />
      );
    }

    // 매칭 그룹 로딩 중
    if (isLoading) {
      console.log("⏳ Incoming likes loading - showing LoadingState");
      return <LoadingState message="Loading your admirers..." />;
    }

    // 매칭 에러
    if (error) {
      console.log("❌ Error - showing ErrorState");
      return (
        <ErrorState
          error={error}
          onRetry={() => {
            console.log("[LikesYouScreen] Retrying after error...");
            refetch();
          }}
        />
      );
    }

    // 매칭 그룹이 없음
    if (incomingLikes.length === 0 && !isLoading) {
      console.log("📭 No incoming likes - showing EmptyState");
      return (
        <EmptyState
          onRefresh={() => {
            console.log("[LikesYouScreen] Refreshing empty state...");
            refetch();
          }}
        />
      );
    }

    console.log("✅ Showing main content with MatchCard");
    // Main content when we have data - MatchCard and controls only
    return (
      <>
        {/* MatchCard for the current group */}
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
          {/* 🔍 DEBUG: MatchCard에 전달되는 데이터 로깅 */}
          {(() => {
            console.log("=== 🎯 PASSING TO MATCHCARD (LIKES YOU) ===");
            console.log("Current Group:", currentGroup);
            console.log("Has Members:", !!currentGroup?.members);
            console.log("Members Length:", currentGroup?.members?.length || 0);
            return null;
          })()}

          <MatchCard group={currentGroup} onUserPress={handleUserClick} />
        </Animated.View>

        {/* Swipe Controls */}
        <View style={styles.swipeControls}>
          <TouchableOpacity
            style={styles.xButton}
            onPress={() => handleSwipe("left")}
            disabled={isAnimating}
          >
            <Feather name="x" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={() => handleSwipe("right")}
            disabled={isAnimating}
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
      </>
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
        <Text style={styles.headerTitle}>Likes You</Text>
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

  swipeControls: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
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
