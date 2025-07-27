import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export interface MatchingGroup {
  group_id: string;
  group_name: string;
  group_gender: string;
  preferred_gender: string;
  match_score: number;
  members?: GroupMember[];
}

export interface GroupMember {
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

export const useMatchmaking = () => {
  const { session } = useAuth();
  const [matchingGroups, setMatchingGroups] = useState<MatchingGroup[]>([]);
  const [currentUserGroup, setCurrentUserGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [batchSize] = useState(5); // Start with 5 for early stage

  // Get current user's group
  const fetchCurrentUserGroup = useCallback(async () => {
    if (!session?.user) return null;

    try {
      const { data, error } = await supabase.rpc("get_my_bubbles", {
        p_user_id: session.user.id,
      });

      if (error) throw error;

      // Find the first 'full' group (ready for matching)
      const fullGroup = data?.find((bubble: any) => bubble.status === "full");
      if (fullGroup) {
        setCurrentUserGroup(fullGroup.id);
        return fullGroup.id;
      }

      return null;
    } catch (err) {
      console.error("Error fetching current user group:", err);
      setError("Failed to fetch your group");
      return null;
    }
  }, [session?.user]);

  // Fetch matching groups with pagination
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

        // Check if we have more data
        const hasMoreData = data && data.length === batchSize;
        setHasMore(hasMoreData);

        // Fetch members for each matching group
        const groupsWithMembers = await Promise.all(
          data.map(async (group: MatchingGroup) => {
            try {
              const { data: membersData, error: membersError } =
                await supabase.rpc("get_group_members_with_avatars", {
                  p_group_id: group.group_id,
                });

              if (membersError) {
                console.error(
                  "Error fetching members for group:",
                  group.group_id,
                  membersError
                );
                return { ...group, members: [] };
              }

              return { ...group, members: membersData || [] };
            } catch (err) {
              console.error("Error fetching members:", err);
              return { ...group, members: [] };
            }
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

  // Load more groups
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

  // Like a group
  const likeGroup = useCallback(
    async (targetGroupId: string) => {
      if (!currentUserGroup) return false;

      try {
        const { data, error } = await supabase.rpc("like_group", {
          p_from_group_id: currentUserGroup,
          p_to_group_id: targetGroupId,
        });

        if (error) throw error;

        // Remove the liked group from the list
        setMatchingGroups((prev) =>
          prev.filter((group) => group.group_id !== targetGroupId)
        );

        // Check if we need to load more
        if (matchingGroups.length <= 3 && hasMore) {
          await loadMore();
        }

        return data; // Returns true if mutual match was created
      } catch (err) {
        console.error("Error liking group:", err);
        return false;
      }
    },
    [currentUserGroup, matchingGroups.length, hasMore, loadMore]
  );

  // Pass a group (just remove from list)
  const passGroup = useCallback(
    (targetGroupId: string) => {
      setMatchingGroups((prev) =>
        prev.filter((group) => group.group_id !== targetGroupId)
      );

      // Check if we need to load more
      if (matchingGroups.length <= 3 && hasMore) {
        loadMore();
      }
    },
    [matchingGroups.length, hasMore, loadMore]
  );

  // Initialize
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
