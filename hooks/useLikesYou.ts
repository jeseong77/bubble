import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useUIStore } from "@/stores/uiStore";

// --- TypeScript Interfaces ---

export interface IncomingLikeGroup {
  group_id: string;
  group_name: string;
  group_gender: string;
  preferred_gender: string;
  match_score: number;
  members?: GroupMember[];
}

// GroupMember interface (same as useMatchmaking)
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

// Like response interface (same as useMatchmaking)
export interface LikeResponse {
  status: "liked" | "matched";
  chat_room_id?: string;
}

// --- The Hook ---
export const useLikesYou = () => {
  const { session } = useAuth();
  const { setUnreadLikesCount, decrementUnreadLikes } = useUIStore();
  const [incomingLikes, setIncomingLikes] = useState<IncomingLikeGroup[]>([]);
  const [currentUserGroup, setCurrentUserGroup] = useState<string | null>(null);
  const [currentUserGroupStatus, setCurrentUserGroupStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [batchSize] = useState(5);

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
          // Group exists but is still forming - don't fetch likes
          console.log("[useLikesYou] User's active group is still forming, not fetching incoming likes");
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
          // Group exists but is still forming - don't fetch likes
          console.log("[useLikesYou] User's joined group is still forming, not fetching incoming likes");
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

  const fetchIncomingLikes = useCallback(
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
        const { data, error } = await supabase.rpc("get_incoming_likes", {
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
          setIncomingLikes((prev) => [...prev, ...groupsWithMembers]);
        } else {
          setIncomingLikes(groupsWithMembers);
          // Update unread count when fetching initial data (not when loading more)
          setUnreadLikesCount(groupsWithMembers.length + (hasMoreData ? batchSize : 0));
        }

        setCurrentOffset(offset + data.length);
      } catch (err) {
        console.error("Error fetching incoming likes:", err);
        setError("Failed to fetch incoming likes");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [batchSize]
  );

  const loadMore = useCallback(async () => {
    if (!currentUserGroup || isLoadingMore || !hasMore) return;
    await fetchIncomingLikes(currentUserGroup, currentOffset, true);
  }, [
    currentUserGroup,
    isLoadingMore,
    hasMore,
    currentOffset,
    fetchIncomingLikes,
  ]);

  // Like back function - calls existing like_group RPC
  const likeBack = useCallback(
    async (targetGroupId: string): Promise<LikeResponse | null> => {
      if (!currentUserGroup) return null;

      try {
        const { data, error } = await supabase.rpc("like_group", {
          p_from_group_id: currentUserGroup,
          p_to_group_id: targetGroupId,
        });

        if (error) throw error;

        // Remove the liked group from the list
        setIncomingLikes((prev) =>
          prev.filter((group) => group.group_id !== targetGroupId)
        );

        // Decrement unread count
        decrementUnreadLikes();

        // Load more if running low
        if (incomingLikes.length <= 3 && hasMore) {
          await loadMore();
        }

        return data as LikeResponse;
      } catch (err) {
        console.error("Error liking group back:", err);
        return null;
      }
    },
    [currentUserGroup, incomingLikes.length, hasMore, loadMore]
  );

  // Pass function - calls existing pass_group RPC
  const pass = useCallback(
    async (targetGroupId: string) => {
      if (!currentUserGroup) return;

      try {
        // Call the pass_group RPC to store the pass in database
        const { error } = await supabase.rpc("pass_group", {
          p_from_group_id: currentUserGroup,
          p_to_group_id: targetGroupId,
        });

        if (error) {
          console.error("Error recording pass:", error);
          // Continue with UI removal even if RPC fails
        }

        // Remove from UI immediately for user feedback
        setIncomingLikes((prev) =>
          prev.filter((group) => group.group_id !== targetGroupId)
        );

        // Decrement unread count
        decrementUnreadLikes();

        // Load more if running low on groups
        if (incomingLikes.length <= 3 && hasMore) {
          loadMore();
        }
      } catch (err) {
        console.error("Error in pass:", err);
        // Still remove from UI even if database operation fails
        setIncomingLikes((prev) =>
          prev.filter((group) => group.group_id !== targetGroupId)
        );
        // Decrement unread count even on error
        decrementUnreadLikes();
      }
    },
    [currentUserGroup, incomingLikes.length, hasMore, loadMore]
  );

  useEffect(() => {
    const initialize = async () => {
      const groupId = await fetchCurrentUserGroup();
      if (groupId) {
        await fetchIncomingLikes(groupId, 0, false);
      }
    };

    initialize();
  }, [fetchCurrentUserGroup, fetchIncomingLikes]);

  return {
    incomingLikes,
    currentUserGroup,
    currentUserGroupStatus,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    likeBack,
    pass,
    loadMore,
    refetch: () => {
      if (currentUserGroup) {
        setCurrentOffset(0);
        fetchIncomingLikes(currentUserGroup, 0, false);
      }
    },
  };
};