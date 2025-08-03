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
import { useRouter, useFocusEffect } from "expo-router";
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
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Adaptive sizing
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);
const userBubbleDiameter = Math.max(screenWidth * 0.32, 120);
const userBubbleImageSize = userBubbleDiameter * 0.54;
const overlapRatio = 0.32;
const centerBubbleImageSize = centerBubbleDiameter * 0.44;
const centerBubbleOverlap = centerBubbleImageSize * 0.18;

// 사용자 그룹 정보 타입
interface UserBubble {
  id: string;
  name: string;
  members: Array<{
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    signedUrl?: string;
  }>;
}

export default function MatchScreen() {
  const insets = useSafeAreaInsets();
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
    hasMore,
    loadMore,
    refetch,
  } = useMatchmakingContext();

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentMatches, setRecentMatches] = useState<string[]>([]);
  const [userBubble, setUserBubble] = useState<UserBubble | null>(null);
  const [userBubbleLoading, setUserBubbleLoading] = useState(true);

  // Get current group from real data
  const currentGroup = matchingGroups[currentGroupIndex];

  // 초기 로딩 시에만 데이터 가져오기 (useFocusEffect 제거)
  useEffect(() => {
    console.log("[MatchScreen] 🎯 Initial data loading...");

    // 사용자 그룹 정보 가져오기
    const fetchUserBubble = async () => {
      if (!session?.user) return;

      setUserBubbleLoading(true);
      try {
        console.log("[MatchScreen] 사용자 그룹 정보 가져오기 시작");

        // 먼저 Active 버블을 확인
        console.log("[MatchScreen] Active 버블 확인 중...");
        const { data: activeBubbleData, error: activeBubbleError } =
          await supabase.rpc("get_user_active_bubble", {
            p_user_id: session.user.id,
          });

        console.log("[MatchScreen] Active 버블 조회 결과:", activeBubbleData);
        console.log("[MatchScreen] Active 버블 에러:", activeBubbleError);

        let targetBubble: any = null;

        if (
          !activeBubbleError &&
          activeBubbleData &&
          activeBubbleData.length > 0
        ) {
          // Active 버블이 있으면 사용
          targetBubble = activeBubbleData[0];
          console.log("[MatchScreen] Active 버블 사용:", targetBubble);
        } else {
          // Active 버블이 없으면 get_my_bubbles에서 첫 번째 joined 그룹 사용
          console.log("[MatchScreen] Active 버블 없음, get_my_bubbles 사용");
          const { data, error } = await supabase.rpc("get_my_bubbles", {
            p_user_id: session.user.id,
          });

          if (error) {
            console.error("[MatchScreen] 사용자 버블 정보 조회 실패:", error);
            throw error;
          }

          console.log("[MatchScreen] get_my_bubbles 응답:", data);

          // joined 상태인 버블 중 첫 번째 것을 사용
          targetBubble = data?.find(
            (bubble: any) => bubble.user_status === "joined"
          );
        }

        if (targetBubble) {
          console.log("[MatchScreen] 사용자 그룹 발견:", targetBubble);

          // 멤버 정보 파싱 (새로운 구조에 맞게)
          let members: Array<{
            id: string;
            first_name: string;
            last_name: string;
            images: Array<{ image_url: string; position: number }>;
          }> = [];
          if (targetBubble.members) {
            try {
              members = Array.isArray(targetBubble.members)
                ? targetBubble.members
                : JSON.parse(targetBubble.members);
            } catch (parseError) {
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

          console.log("[MatchScreen] 사용자 그룹 데이터 설정:", userBubbleData);
          setUserBubble(userBubbleData);
        } else {
          console.log("[MatchScreen] 사용자가 속한 그룹이 없습니다");
          setUserBubble(null);
        }
      } catch (error) {
        console.error("[MatchScreen] 사용자 그룹 정보 가져오기 실패:", error);
        setUserBubble(null);
      } finally {
        setUserBubbleLoading(false);
      }
    };

    fetchUserBubble();
  }, [session?.user]); // session?.user가 변경될 때만 실행

  // 🔍 DEBUG: 매칭 그룹 데이터 로깅
  useEffect(() => {
    console.log("=== 🔍 MATCHING GROUPS IN INDEX ===");
    console.log("Total matching groups:", matchingGroups.length);
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
  }, [currentGroup, currentGroupIndex, matchingGroups.length]);

  // 🔍 DEBUG: 매칭 컨텍스트 상태 로깅
  useEffect(() => {
    console.log("=== 🔍 MATCHMAKING CONTEXT STATE ===");
    console.log("isLoading:", isLoading);
    console.log("error:", error);
    console.log("currentUserGroup:", currentUserGroup);
    console.log("matchingGroups length:", matchingGroups.length);
    console.log("currentGroupIndex:", currentGroupIndex);
    console.log("hasMore:", hasMore);
    console.log("isLoadingMore:", isLoadingMore);
  }, [
    isLoading,
    error,
    currentUserGroup,
    matchingGroups.length,
    currentGroupIndex,
    hasMore,
    isLoadingMore,
  ]);

  // Unified animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle different states - moved to after all hooks are called
  const renderContent = () => {
    console.log("=== 🎨 RENDER CONTENT DEBUG ===");
    console.log("userBubble:", userBubble);
    console.log("userBubbleLoading:", userBubbleLoading);
    console.log("isLoading:", isLoading);
    console.log("error:", error);
    console.log("matchingGroups.length:", matchingGroups.length);
    console.log("currentGroup:", currentGroup);

    // 사용자 버블 로딩 중
    if (userBubbleLoading) {
      console.log("⏳ User bubble loading - showing LoadingState");
      return <LoadingState message="Loading your bubble..." />;
    }

    // 사용자가 속한 그룹이 없음
    if (!userBubble) {
      console.log("❌ No user bubble - showing NoGroupState");
      return (
        <NoGroupState onCreateGroup={() => router.push("/(tabs)/profile")} />
      );
    }

    // 매칭 그룹 로딩 중
    if (isLoading) {
      console.log("⏳ Matching groups loading - showing LoadingState");
      return <LoadingState message="Finding your perfect matches..." />;
    }

    // 매칭 에러
    if (error) {
      console.log("❌ Error - showing ErrorState");
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

    // 매칭 그룹이 없음
    if (matchingGroups.length === 0 && !isLoading) {
      console.log("📭 No matching groups - showing EmptyState");
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

    console.log("✅ Showing main content with MatchCard");
    // Main content when we have data
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
        {userBubble && (
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
                {userBubble.members.map((user, idx) => (
                  <View
                    key={user.id}
                    style={{
                      marginLeft:
                        idx === 1 ? -userBubbleImageSize * overlapRatio : 0,
                      zIndex: idx === 0 ? 2 : 1,
                    }}
                  >
                    <Image
                      source={{ uri: user.signedUrl || user.avatar_url }}
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
        )}

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
            console.log("=== 🎯 PASSING TO MATCHCARD ===");
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
      </SafeAreaView>
    );
  };

  // Handle user image click
  const handleUserClick = useCallback(
    (user: GroupMember) => {
      console.log("=== 🖼️ USER CLICK HANDLER ===");
      console.log("User clicked:", user);
      console.log("User ID:", user.id);
      console.log("User name:", user.first_name);

      router.push({
        pathname: "/bubble/user/[userId]",
        params: {
          userId: user.id, // user_id 대신 id 사용
        },
      });
    },
    [router]
  );

  // Animate and switch bubble data
  const changeBubbleAndAnimateIn = (direction: "left" | "right") => {
    // Handle real data cycling
    const nextIndex = (currentGroupIndex + 1) % matchingGroups.length;
    setCurrentGroupIndex(nextIndex);

    // Handle empty state when no more groups
    if (matchingGroups.length === 0) {
      return;
    }

    // 🔍 DEBUG: 배열 범위 체크
    console.log("=== 🔄 CHANGE BUBBLE DEBUG ===");
    console.log("Current Index:", currentGroupIndex);
    console.log("Next Index:", nextIndex);
    console.log("Groups Length:", matchingGroups.length);
    console.log("Next Group:", matchingGroups[nextIndex]);

    // 배열 범위 체크 추가
    if (nextIndex >= matchingGroups.length) {
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

  // Handler for X and Heart
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

      // [수정 1] 새로운 likeGroup 함수를 호출하고 그 결과를 response 변수에 저장합니다.
      const response = await likeGroup(currentGroup.group_id);

      // [수정 2] 반환된 객체의 status 값으로 매칭 성공 여부를 확인합니다.
      if (response?.status === "matched") {
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
                // [수정 3] 채팅 목록 화면으로 이동하는 로직을 추가할 수 있습니다.
                // 예: router.push('/(tabs)/chats');
                console.log(
                  "Navigate to matches/chats screen. Chat Room ID:",
                  response.chat_room_id
                );
              },
            },
          ]
        );
      } else {
        // 'liked' 상태이거나 null일 경우 (매칭 안됨)
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

  // Main return - call renderContent to handle all conditional rendering
  return renderContent();
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

  swipeControls: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
});
