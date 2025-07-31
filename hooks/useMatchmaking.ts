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
  status: "liked" | "matched";
  chat_room_id?: string; // 'matched' 상태일 때만 존재합니다.
}

// --- The Hook ---
export const useMatchmaking = () => {
  const { session } = useAuth();
  const [matchingGroups, setMatchingGroups] = useState<MatchingGroup[]>([]);
  const [currentUserGroup, setCurrentUserGroup] = useState<string | null>(null);
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
        return activeBubble.id;
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
        return joinedGroup.id;
      }
      return null;
    } catch (err) {
      console.error("Error fetching current user group:", err);
      setError("Failed to fetch your group");
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

        setMatchingGroups((prev) =>
          prev.filter((group) => group.group_id !== targetGroupId)
        );

        if (matchingGroups.length <= 3 && hasMore) {
          await loadMore();
        }

        // [수정 3] RPC 결과를 명시적 타입으로 변환하여 반환합니다.
        return data as LikeResponse;
      } catch (err) {
        console.error("Error liking group:", err);
        return null;
      }
    },
    [currentUserGroup, matchingGroups.length, hasMore, loadMore]
  );

  const passGroup = useCallback(
    (targetGroupId: string) => {
      setMatchingGroups((prev) =>
        prev.filter((group) => group.group_id !== targetGroupId)
      );

      if (matchingGroups.length <= 3 && hasMore) {
        loadMore();
      }
    },
    [matchingGroups.length, hasMore, loadMore]
  );

  useEffect(() => {
    const initialize = async () => {
      const groupId = await fetchCurrentUserGroup();
      if (groupId) {
        await fetchMatchingGroups(groupId, 0, false);
      }
    };

    initialize();
  }, [fetchCurrentUserGroup, fetchMatchingGroups]);

  return {
    matchingGroups,
    currentUserGroup,
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
      }
    },
  };
};
