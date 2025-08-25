import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

// --- TypeScript Interfaces ---

export interface MatchingGroup {
  group_id: string;
  group_name: string;
  group_gender: string;
  preferred_gender: string;
  match_score: number;
  members?: GroupMember[];
}

// GroupMember 인터페이스의 모든 필드를 포함합니다.
export interface GroupMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  age: number;
  mbti: string;
  height: string;
  location: string;
  bio: string;
  avatar_url: string;
  joined_at: string;
}

// [수정 1] like_group RPC의 새로운 응답 타입을 정의합니다.
export interface LikeResponse {
  status: "liked" | "matched" | "limit_exceeded" | "error";
  chat_room_id?: string; // 'matched' 상태일 때만 존재합니다.
  message?: string; // Error message if status is error or limit_exceeded
  swipe_info?: SwipeLimitInfo; // Daily swipe limit information
}

export interface PassResponse {
  status: "passed" | "limit_exceeded" | "error";
  message?: string; // Error message if status is error or limit_exceeded
  swipe_info?: SwipeLimitInfo; // Daily swipe limit information
}

// Daily swipe limit information
export interface SwipeLimitInfo {
  remaining_swipes: number;
  used_swipes: number;
  daily_limit: number;
  can_swipe: boolean;
  reset_time: string; // ISO timestamp of next reset (midnight NYC)
  limit_reached?: boolean; // True if just reached limit
}

// --- The Hook ---
export const useMatchmaking = () => {
  const { session } = useAuth();
  const [matchingGroups, setMatchingGroups] = useState<MatchingGroup[]>([]);
  const [currentUserGroup, setCurrentUserGroup] = useState<string | null>(null);
  const [currentUserGroupStatus, setCurrentUserGroupStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [batchSize] = useState(5);
  
  // Daily swipe limit state
  const [swipeLimitInfo, setSwipeLimitInfo] = useState<SwipeLimitInfo | null>(null);
  const [isLoadingSwipeLimit, setIsLoadingSwipeLimit] = useState(false);

  // Function to check daily swipe limits
  const checkSwipeLimit = useCallback(async (groupId?: string) => {
    const targetGroupId = groupId || currentUserGroup;
    if (!targetGroupId) return null;

    setIsLoadingSwipeLimit(true);
    try {
      const { data, error } = await supabase.rpc("check_daily_swipe_limit", {
        p_group_id: targetGroupId,
      });

      if (error) {
        console.error("Error checking swipe limit:", error);
        return null;
      }

      const swipeInfo = data as SwipeLimitInfo;
      setSwipeLimitInfo(swipeInfo);
      return swipeInfo;
    } catch (err) {
      console.error("Error in checkSwipeLimit:", err);
      return null;
    } finally {
      setIsLoadingSwipeLimit(false);
    }
  }, [currentUserGroup]);

  const fetchCurrentUserGroup = useCallback(async () => {
    if (!session?.user) return null;
    try {
      const { data: activeBubbleData, error: activeBubbleError } =
        await supabase.rpc("get_user_active_bubble", {
          p_user_id: session.user.id,
        });

      if (
        !activeBubbleError &&
        activeBubbleData &&
        activeBubbleData.length > 0
      ) {
        const activeBubble = activeBubbleData[0];
        setCurrentUserGroup(activeBubble.id);
        setCurrentUserGroupStatus(activeBubble.status);
        
        // Only return group ID if it's full and ready for matching
        if (activeBubble.status === 'full') {
          return activeBubble.id;
        } else {
          // Group exists but is still forming - don't fetch matches
          console.log("[useMatchmaking] User's active group is still forming, not fetching matches");
          return null;
        }
      }

      const { data, error } = await supabase.rpc("get_my_bubbles", {
        p_user_id: session.user.id,
      });

      if (error) throw error;

      const joinedGroup = data?.find(
        (bubble: any) => bubble.user_status === "joined"
      );
      if (joinedGroup) {
        setCurrentUserGroup(joinedGroup.id);
        setCurrentUserGroupStatus(joinedGroup.status);
        
        // Only return group ID if it's full and ready for matching
        if (joinedGroup.status === 'full') {
          return joinedGroup.id;
        } else {
          // Group exists but is still forming - don't fetch matches
          console.log("[useMatchmaking] User's joined group is still forming, not fetching matches");
          return null;
        }
      }
      
      // No group found
      setCurrentUserGroup(null);
      setCurrentUserGroupStatus(null);
      return null;
    } catch (err) {
      console.error("Error fetching current user group:", err);
      setError("Failed to fetch your group");
      setCurrentUserGroup(null);
      setCurrentUserGroupStatus(null);
      return null;
    }
  }, [session?.user]);

  const fetchMatchingGroups = useCallback(
    async (
      groupId: string,
      offset: number = 0,
      isLoadMore: boolean = false
    ) => {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const { data, error } = await supabase.rpc("find_matching_group", {
          p_group_id: groupId,
          p_limit: batchSize,
          p_offset: offset,
        });

        if (error) throw error;

        const hasMoreData = data && data.length === batchSize;
        setHasMore(hasMoreData);

        const groupsWithMembers = await Promise.all(
          data.map(async (group: any) => {
            const { data: bubbleData, error: bubbleError } = await supabase.rpc(
              "get_bubble",
              {
                p_group_id: group.group_id,
              }
            );

            if (bubbleError) {
              console.error(
                "Error fetching bubble info for group:",
                group.group_id,
                bubbleError
              );
              return { ...group, members: [] };
            }

            const members =
              bubbleData && bubbleData.length > 0
                ? bubbleData[0].members || []
                : [];
            return { ...group, members };
          })
        );

        if (isLoadMore) {
          setMatchingGroups((prev) => [...prev, ...groupsWithMembers]);
        } else {
          setMatchingGroups(groupsWithMembers);
        }

        setCurrentOffset(offset + data.length);
      } catch (err) {
        console.error("Error fetching matching groups:", err);
        setError("Failed to fetch matching groups");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [batchSize]
  );

  const loadMore = useCallback(async () => {
    if (!currentUserGroup || isLoadingMore || !hasMore) return;
    await fetchMatchingGroups(currentUserGroup, currentOffset, true);
  }, [
    currentUserGroup,
    isLoadingMore,
    hasMore,
    currentOffset,
    fetchMatchingGroups,
  ]);

  // [수정 2] likeGroup 함수의 반환 타입을 새로운 응답 타입에 맞게 변경합니다.
  const likeGroup = useCallback(
    async (targetGroupId: string): Promise<LikeResponse | null> => {
      if (!currentUserGroup) return null;

      try {
        const { data, error } = await supabase.rpc("like_group", {
          p_from_group_id: currentUserGroup,
          p_to_group_id: targetGroupId,
        });

        if (error) throw error;

        const response = data as LikeResponse;

        // Update swipe limit info if provided
        if (response.swipe_info) {
          setSwipeLimitInfo(response.swipe_info);
        }

        // Only remove from UI if the swipe was successful (not limit exceeded)
        if (response.status !== 'limit_exceeded') {
          setMatchingGroups((prev) =>
            prev.filter((group) => group.group_id !== targetGroupId)
          );

          if (matchingGroups.length <= 3 && hasMore) {
            await loadMore();
          }
        }

        // [수정 3] RPC 결과를 명시적 타입으로 변환하여 반환합니다.
        return response;
      } catch (err) {
        console.error("Error liking group:", err);
        return null;
      }
    },
    [currentUserGroup, matchingGroups.length, hasMore, loadMore]
  );

  const passGroup = useCallback(
    async (targetGroupId: string): Promise<PassResponse | null> => {
      if (!currentUserGroup) return null;

      try {
        // Call the pass_group RPC to store the pass in database
        const { data, error } = await supabase.rpc("pass_group", {
          p_from_group_id: currentUserGroup,
          p_to_group_id: targetGroupId,
        });

        if (error) {
          console.error("Error recording pass:", error);
          return null;
        }

        const response = data as PassResponse;

        // Update swipe limit info if provided
        if (response.swipe_info) {
          setSwipeLimitInfo(response.swipe_info);
        }

        // Only remove from UI if the swipe was successful (not limit exceeded)
        if (response.status !== 'limit_exceeded') {
          // Remove from UI immediately for user feedback
          setMatchingGroups((prev) =>
            prev.filter((group) => group.group_id !== targetGroupId)
          );

          // Load more if running low on groups
          if (matchingGroups.length <= 3 && hasMore) {
            loadMore();
          }
        }

        return response;
      } catch (err) {
        console.error("Error in passGroup:", err);
        return null;
      }
    },
    [currentUserGroup, matchingGroups.length, hasMore, loadMore]
  );

  useEffect(() => {
    const initialize = async () => {
      const groupId = await fetchCurrentUserGroup();
      if (groupId) {
        // Check swipe limits and fetch matching groups in parallel
        await Promise.all([
          checkSwipeLimit(groupId),
          fetchMatchingGroups(groupId, 0, false)
        ]);
      }
    };

    initialize();
  }, [fetchCurrentUserGroup, fetchMatchingGroups, checkSwipeLimit]);

  // Full refresh method that re-detects active group and refreshes everything
  const refreshAll = useCallback(async () => {
    console.log("[useMatchmaking] 🔄 Full refresh - detecting active group changes...");
    
    // Reset state completely
    setCurrentOffset(0);
    setMatchingGroups([]);
    setHasMore(true);
    setError(null);
    setIsLoading(true);
    setSwipeLimitInfo(null); // Reset swipe limit info
    
    try {
      // Re-fetch current user group (may have changed)
      const groupId = await fetchCurrentUserGroup();
      console.log("[useMatchmaking] Active group after refresh:", groupId, "Previous:", currentUserGroup);
      
      // Fetch matching groups and swipe limits for the (possibly new) active group
      if (groupId) {
        await Promise.all([
          checkSwipeLimit(groupId),
          fetchMatchingGroups(groupId, 0, false)
        ]);
      } else {
        // No active group - clear everything
        setIsLoading(false);
        console.log("[useMatchmaking] No active group found - clearing matchmaking data");
      }
    } catch (error) {
      console.error("[useMatchmaking] Error in refreshAll:", error);
      setError("Failed to refresh matchmaking data");
      setIsLoading(false);
    }
  }, [fetchCurrentUserGroup, fetchMatchingGroups, checkSwipeLimit, currentUserGroup]);

  return {
    matchingGroups,
    currentUserGroup,
    currentUserGroupStatus,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    likeGroup,
    passGroup,
    loadMore,
    refetch: () => {
      if (currentUserGroup) {
        setCurrentOffset(0);
        fetchMatchingGroups(currentUserGroup, 0, false);
        checkSwipeLimit(currentUserGroup); // Also refresh swipe limits
      }
    },
    refreshAll,
    // Swipe limit related functions and state
    swipeLimitInfo,
    isLoadingSwipeLimit,
    checkSwipeLimit,
  };
};
