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
import { useFocusEffect } from "@react-navigation/native";
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

// User group information type
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
  const [userBubble, setUserBubble] = useState<UserBubble | null>(null);
  const [userBubbleLoading, setUserBubbleLoading] = useState(true);

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
      console.log(`[MatchScreen] 🔧 Index ${currentGroupIndex} out of bounds (length: ${matchingGroups.length}), resetting to 0`);
      setCurrentGroupIndex(0);
    }
  }, [matchingGroups.length, currentGroupIndex]);

  // Get current group from real data
  const currentGroup = matchingGroups[currentGroupIndex];

  // Fetch data only on initial loading (useFocusEffect removed)
  useEffect(() => {
    console.log("[MatchScreen] 🎯 Initial data loading...");

    // Get user's active group info (using same logic as Profile Screen)
    const fetchUserBubble = async () => {
      if (!session?.user) return;

      setUserBubbleLoading(true);
      try {
        console.log("[MatchScreen] 🔍 Starting to fetch active bubble info (using Profile Screen logic)");

        // Step 1: Get user's active_group_id from users table (same as profile screen)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("active_group_id")
          .eq("id", session.user.id)
          .single();

        let activeBubbleId: string | null = null;
        if (!userError && userData?.active_group_id) {
          activeBubbleId = userData.active_group_id;
          console.log("[MatchScreen] ✅ Found active_group_id:", activeBubbleId);
        } else {
          // Step 2: If no active bubble, get first joined bubble (same as profile screen fallback)
          console.log("[MatchScreen] ❌ No active_group_id, finding first joined bubble");
          const { data: basicBubbles, error: basicError } = await supabase
            .from('group_members')
            .select(`
              groups!inner(id, name, status, max_size, creator_id),
              status,
              invited_at
            `)
            .eq('user_id', session.user.id)
            .eq('status', 'joined')
            .order('invited_at', { ascending: false })
            .limit(1);

          if (!basicError && basicBubbles && basicBubbles.length > 0) {
            activeBubbleId = basicBubbles[0].groups.id;
            console.log("[MatchScreen] 🔄 Using first joined bubble as fallback:", activeBubbleId);
          }
        }

        if (!activeBubbleId) {
          console.log("[MatchScreen] ❌ No active bubble or joined bubbles found");
          setUserBubble(null);
          return;
        }

        // Step 3: Get complete bubble data using the SAME get_bubble RPC as profile screen
        console.log("[MatchScreen] 🎯 Fetching complete bubble data using get_bubble RPC");
        const { data: bubbleData, error: bubbleError } = await supabase.rpc("get_bubble", {
          p_group_id: activeBubbleId,
        });

        if (bubbleError || !bubbleData || bubbleData.length === 0) {
          console.error("[MatchScreen] ❌ get_bubble RPC failed:", bubbleError);
          setUserBubble(null);
          return;
        }

        const completeData = bubbleData[0];
        console.log("[MatchScreen] ✅ get_bubble RPC success:", {
          id: completeData.id,
          name: completeData.name,
          membersCount: completeData.members?.length || 0,
          members: completeData.members
        });

        // Step 4: Transform data using EXACT same logic as profile screen
        let members: { id: string; first_name: string; last_name: string; avatar_url: string | null }[] = [];
        if (completeData.members) {
          try {
            members = Array.isArray(completeData.members)
              ? completeData.members
              : JSON.parse(completeData.members);
          } catch (parseError) {
            console.error("[MatchScreen] Failed to parse member info:", parseError);
            members = [];
          }
        }

        console.log(`[MatchScreen] 🔍 Processing bubble "${completeData.name}" with ${members.length} members:`);
        members.forEach((member, idx) => {
          console.log(`[MatchScreen] - Member ${idx}: ${member.first_name} ${member.last_name} (${member.id})`);
        });

        // Transform to UserBubble structure (same as profile screen transformation)
        const transformedMembers = members.map((member) => {
          return {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            avatar_url: member.avatar_url,
            signedUrl: member.avatar_url, // Already public URL, use as is
          };
        });

        const userBubbleData: UserBubble = {
          id: completeData.id,
          name: completeData.name,
          members: transformedMembers,
        };

        console.log("[MatchScreen] 🎯 Setting final user group data:", {
          id: userBubbleData.id,
          name: userBubbleData.name,
          totalMembers: userBubbleData.members.length,
          memberDetails: userBubbleData.members.map(m => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            hasAvatar: !!m.avatar_url
          }))
        });
        setUserBubble(userBubbleData);

      } catch (error) {
        console.error("[MatchScreen] Failed to fetch user group info:", error);
        setUserBubble(null);
      } finally {
        setUserBubbleLoading(false);
      }
    };

    fetchUserBubble();
  }, [session?.user]); // Execute only when session?.user changes

  // User bubble refresh function (for state updates after bubble pop)
  const refreshUserBubble = async () => {
    if (!session?.user) return;

    setUserBubbleLoading(true);
    try {
      console.log("[MatchScreen] 🔄 Refreshing user bubble after pop...");

      // Step 1: Get user's active_group_id from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("active_group_id")
        .eq("id", session.user.id)
        .single();

      let activeBubbleId: string | null = null;
      if (!userError && userData?.active_group_id) {
        activeBubbleId = userData.active_group_id;
        console.log("[MatchScreen] ✅ Found active_group_id after refresh:", activeBubbleId);
      } else {
        // Step 2: If no active bubble, get first joined bubble
        console.log("[MatchScreen] ❌ No active_group_id after pop, checking for other bubbles");
        const { data: basicBubbles, error: basicError } = await supabase
          .from('group_members')
          .select(`
            groups!inner(id, name, status, max_size, creator_id),
            status,
            invited_at
          `)
          .eq('user_id', session.user.id)
          .eq('status', 'joined')
          .order('invited_at', { ascending: false })
          .limit(1);

        if (!basicError && basicBubbles && basicBubbles.length > 0) {
          activeBubbleId = basicBubbles[0].groups.id;
          console.log("[MatchScreen] 🔄 Using first joined bubble as fallback:", activeBubbleId);
        }
      }

      if (!activeBubbleId) {
        console.log("[MatchScreen] ✅ No bubbles found after pop - user has no active bubbles");
        setUserBubble(null);
        return;
      }

      // Step 3: Get complete bubble data using get_bubble RPC
      console.log("[MatchScreen] 🎯 Fetching updated bubble data");
      const { data: bubbleData, error: bubbleError } = await supabase.rpc("get_bubble", {
        p_group_id: activeBubbleId,
      });

      if (bubbleError || !bubbleData || bubbleData.length === 0) {
        console.error("[MatchScreen] ❌ get_bubble RPC failed during refresh:", bubbleError);
        setUserBubble(null);
        return;
      }

      const completeData = bubbleData[0];
      console.log("[MatchScreen] ✅ Bubble refresh successful:", completeData.name);

      // Transform data same as initial load
      let members: { id: string; first_name: string; last_name: string; avatar_url: string | null }[] = [];
      if (completeData.members) {
        try {
          members = Array.isArray(completeData.members)
            ? completeData.members
            : JSON.parse(completeData.members);
        } catch (parseError) {
          console.error("[MatchScreen] Failed to parse member info during refresh:", parseError);
          members = [];
        }
      }

      const transformedMembers = members.map((member) => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        avatar_url: member.avatar_url,
        signedUrl: member.avatar_url,
      }));

      const userBubbleData: UserBubble = {
        id: completeData.id,
        name: completeData.name,
        members: transformedMembers,
      };

      setUserBubble(userBubbleData);
      console.log("[MatchScreen] 🎯 User bubble refreshed successfully");

    } catch (error) {
      console.error("[MatchScreen] Error refreshing user bubble:", error);
      setUserBubble(null);
    } finally {
      setUserBubbleLoading(false);
    }
  };

  // Bubble pop function (same logic as profile screen)
  const handlePopBubble = async (bubbleId: string) => {
    if (!session?.user) return;
    
    Alert.alert(
      "Do you want to pop this bubble?",
      "Popped bubbles can't be restored.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pop",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[MatchScreen] Starting to leave group:", bubbleId);
              
              const { data, error } = await supabase.rpc("leave_group", {
                p_user_id: session.user.id,
                p_group_id: bubbleId,
              });
              
              if (error) {
                console.error("[MatchScreen] Failed to leave group:", error);
                Alert.alert("Error", "Failed to pop bubble.");
                return;
              }
              
              if (!data || !data.success) {
                console.error("[MatchScreen] Failed to pop bubble:", data?.message || "Unknown error");
                Alert.alert("Error", data?.message || "Failed to pop bubble.");
                return;
              }

              console.log(`[MatchScreen] Successfully popped bubble: "${data.group_name}" by ${data.popper_name}`);
              
              // Refresh bubble list
              await refreshUserBubble();
              
              Alert.alert(
                "Bubble Popped! 💥", 
                `"${data.group_name}" has been destroyed.`
              );
            } catch (error) {
              console.error("[MatchScreen] Error while leaving group:", error);
              Alert.alert("Error", "Failed to pop bubble.");
            }
          },
        },
      ]
    );
  };

  // Focus effect for automatic refresh when returning to first tab
  useFocusEffect(
    React.useCallback(() => {
      console.log("[MatchScreen] 🔄 Tab focused - refreshing all data...");
      
      // Refresh user bubble data (may have new active group)
      const refreshUserBubbleData = async () => {
        if (!session?.user) return;

        setUserBubbleLoading(true);
        try {
          console.log("[MatchScreen] 🔄 Refreshing user bubble on focus...");

          // Step 1: Get user's active_group_id from users table
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("active_group_id")
            .eq("id", session.user.id)
            .single();

          let activeBubbleId: string | null = null;
          if (!userError && userData?.active_group_id) {
            activeBubbleId = userData.active_group_id;
            console.log("[MatchScreen] ✅ Found active_group_id on focus:", activeBubbleId);
          } else {
            // Step 2: If no active bubble, get first joined bubble
            console.log("[MatchScreen] ❌ No active_group_id on focus, checking for other bubbles");
            const { data: basicBubbles, error: basicError } = await supabase
              .from('group_members')
              .select(`
                groups!inner(id, name, status, max_size, creator_id),
                status,
                invited_at
              `)
              .eq('user_id', session.user.id)
              .eq('status', 'joined')
              .order('invited_at', { ascending: false })
              .limit(1);

            if (!basicError && basicBubbles && basicBubbles.length > 0) {
              activeBubbleId = basicBubbles[0].groups.id;
              console.log("[MatchScreen] 🔄 Using first joined bubble on focus:", activeBubbleId);
            }
          }

          if (!activeBubbleId) {
            console.log("[MatchScreen] ✅ No bubbles found on focus - user has no active bubbles");
            setUserBubble(null);
            return;
          }

          // Step 3: Get complete bubble data using get_bubble RPC
          console.log("[MatchScreen] 🎯 Fetching bubble data on focus");
          const { data: bubbleData, error: bubbleError } = await supabase.rpc("get_bubble", {
            p_group_id: activeBubbleId,
          });

          if (bubbleError || !bubbleData || bubbleData.length === 0) {
            console.error("[MatchScreen] ❌ get_bubble RPC failed on focus:", bubbleError);
            setUserBubble(null);
            return;
          }

          const completeData = bubbleData[0];
          console.log("[MatchScreen] ✅ Bubble data refreshed on focus:", completeData.name);

          // Transform data same as initial load
          let members: { id: string; first_name: string; last_name: string; avatar_url: string | null }[] = [];
          if (completeData.members) {
            try {
              members = Array.isArray(completeData.members)
                ? completeData.members
                : JSON.parse(completeData.members);
            } catch (parseError) {
              console.error("[MatchScreen] Failed to parse member info on focus:", parseError);
              members = [];
            }
          }

          const transformedMembers = members.map((member) => ({
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            avatar_url: member.avatar_url,
            signedUrl: member.avatar_url,
          }));

          const userBubbleData: UserBubble = {
            id: completeData.id,
            name: completeData.name,
            members: transformedMembers,
          };

          setUserBubble(userBubbleData);
          console.log("[MatchScreen] 🎯 User bubble refreshed successfully on focus");

        } catch (error) {
          console.error("[MatchScreen] Error refreshing user bubble on focus:", error);
          setUserBubble(null);
        } finally {
          setUserBubbleLoading(false);
        }
      };
      
      // Refresh matchmaking data (detects active group changes)
      refreshAll();
      
      // Refresh user bubble data
      refreshUserBubbleData();
    }, [refreshAll, session?.user])
  );

  // 🔍 DEBUG: Logging matching group data
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

  // 🔍 DEBUG: Logging matchmaking context state
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

    // User bubble loading
    if (userBubbleLoading) {
      console.log("⏳ User bubble loading - showing LoadingState");
      return <LoadingState message="Loading your bubble..." />;
    }

    // User has no group OR group is still forming
    if (!userBubble || currentUserGroupStatus === 'forming') {
      console.log("❌ No user bubble or forming group - showing NoGroupState");
      console.log("userBubble:", !!userBubble, "currentUserGroupStatus:", currentUserGroupStatus);
      return (
        <SafeAreaView
          style={[styles.safeArea, { paddingTop: insets.top }]}
          edges={["top"]}
        >
          <LinearGradient
            colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
            style={StyleSheet.absoluteFill}
          />
          <NoGroupState onCreateGroup={() => router.push("/(tabs)/profile")} />
        </SafeAreaView>
      );
    }

    // Matching groups loading
    if (isLoading) {
      console.log("⏳ Matching groups loading - showing LoadingState");
      return <LoadingState message="Finding your perfect matches..." />;
    }

    // Matching error
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

    // Check if daily swipe limit is reached
    if (swipeLimitInfo && !swipeLimitInfo.can_swipe) {
      console.log("🚫 Daily swipe limit reached - showing limit reached state");
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
                        marginLeft: idx > 0 ? -userBubbleImageSize * overlapRatio : 0,
                        zIndex: userBubble.members.length - idx,
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
              <TouchableOpacity 
                style={styles.pinIconWrap}
                onPress={() => userBubble && handlePopBubble(userBubble.id)}
                activeOpacity={0.7}
              >
                <View style={styles.pinCircle}>
                  <Feather name="feather" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

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
        </SafeAreaView>
      );
    }

    // No matching groups
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
        {(() => {
          console.log("[MatchScreen] 🎨 Rendering user bubble:", {
            hasBubble: !!userBubble,
            bubbleName: userBubble?.name,
            memberCount: userBubble?.members?.length || 0,
            memberIds: userBubble?.members?.map(m => m.id) || []
          });
          return null;
        })()}
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
                {userBubble.members.map((user, idx) => {
                  console.log(`[MatchScreen] 🖼️ Rendering member ${idx}:`, {
                    id: user.id,
                    name: `${user.first_name} ${user.last_name}`,
                    avatarUrl: user.avatar_url,
                    signedUrl: user.signedUrl
                  });
                  
                  return (
                    <View
                      key={user.id}
                      style={{
                        marginLeft: idx > 0 ? -userBubbleImageSize * overlapRatio : 0,
                        zIndex: userBubble.members.length - idx, // Highest index gets highest z-index
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
                        onError={() => console.log(`[MatchScreen] ❌ Image load error for member ${idx}:`, user.signedUrl || user.avatar_url)}
                        onLoad={() => console.log(`[MatchScreen] ✅ Image loaded for member ${idx}`)}
                      />
                    </View>
                  );
                })}
              </View>
            </BlurView>
            <TouchableOpacity 
              style={styles.pinIconWrap}
              onPress={() => userBubble && handlePopBubble(userBubble.id)}
              activeOpacity={0.7}
              disabled={!userBubble || userBubbleLoading}
            >
              <View style={styles.pinCircle}>
                <Feather name="feather" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
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
          {/* 🔍 DEBUG: Logging data passed to MatchCard */}
          {(() => {
            console.log("=== 🎯 PASSING TO MATCHCARD ===");
            console.log("Current Group:", currentGroup);
            console.log("Has Members:", !!currentGroup?.members);
            console.log("Members Length:", currentGroup?.members?.length || 0);
            return null;
          })()}

          <MatchCard group={currentGroup} onUserPress={handleUserClick} />
        </Animated.View>

        {/* Swipe Counter and Limit Info */}
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
      console.log("❌ No more groups available");
      return;
    }

    // 🔍 DEBUG: Array bounds check
    console.log("=== 🔄 CHANGE BUBBLE DEBUG ===");
    console.log("Current Index before:", currentGroupIndex);
    console.log("Groups Length:", matchingGroups.length);

    // Reset to 0 if current index is out of bounds (after group removal)
    let nextIndex = currentGroupIndex;
    if (currentGroupIndex >= matchingGroups.length) {
      console.log("❌ Current index out of bounds, resetting to 0");
      nextIndex = 0;
    }

    console.log("Next Index:", nextIndex);
    console.log("Next Group:", matchingGroups[nextIndex]);

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
