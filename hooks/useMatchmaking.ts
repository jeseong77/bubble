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
  id: string; // 실제 데이터에 있는 id 필드 추가
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

      console.log("=== 🔍 GET_MY_BUBBLES RPC RESULT ===");
      console.log("Data:", data);
      console.log("Data length:", data?.length || 0);

      // Find the first 'joined' group (user is a member)
      const joinedGroup = data?.find((bubble: any) => bubble.user_status === "joined");
      if (joinedGroup) {
        console.log("Found joined group:", joinedGroup);
        setCurrentUserGroup(joinedGroup.id);
        return joinedGroup.id;
      }

      console.log("No joined group found");
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
            console.log(`=== 🎯 PROCESSING GROUP: ${group.group_name} ===`);
            console.log("Group ID:", group.group_id);
            
            try {
              const { data: bubbleData, error: bubbleError } =
                await supabase.rpc("get_bubble", {
                  p_group_id: group.group_id,
                });

              console.log(`=== 📦 GET_BUBBLE RPC RESULT ===`);
              console.log("Bubble Data:", bubbleData);
              console.log("Bubble Error:", bubbleError);
              console.log("Bubble Data Type:", typeof bubbleData);
              console.log("Bubble Data Length:", bubbleData?.length || 0);

              if (bubbleError) {
                console.error(
                  "Error fetching bubble info for group:",
                  group.group_id,
                  bubbleError
                );
                return { ...group, members: [] };
              }

              // Extract members from bubble data
              let members: GroupMember[] = [];
              if (bubbleData && bubbleData.length > 0) {
                const bubbleInfo = bubbleData[0];
                console.log("=== 📋 BUBBLE INFO ===");
                console.log("Bubble Info:", bubbleInfo);
                console.log("Members field:", bubbleInfo.members);
                console.log("Members field type:", typeof bubbleInfo.members);
                
                if (bubbleInfo.members) {
                  try {
                    members = Array.isArray(bubbleInfo.members)
                      ? bubbleInfo.members
                      : JSON.parse(bubbleInfo.members);
                    
                    console.log("=== ✅ PARSED MEMBERS ===");
                    console.log("Parsed members:", members);
                    console.log("Members count:", members.length);
                  } catch (parseError) {
                    console.error("Error parsing members:", parseError);
                    console.log("Raw members data:", bubbleInfo.members);
                    members = [];
                  }
                } else {
                  console.log("❌ No members field in bubble info");
                }
              } else {
                console.log("❌ No bubble data or empty array");
              }

              const result = { ...group, members };
              console.log(`=== ✅ FINAL GROUP RESULT ===`);
              console.log("Final group:", result);
              console.log("Members count:", result.members?.length || 0);
              
              return result;
            } catch (err) {
              console.error("Error fetching bubble info:", err);
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
