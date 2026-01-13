import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

interface SearchUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  mbti: string;
  gender: string;
  displayName: string;
  invitationStatus: "invited" | "joined" | "declined" | null;
}

interface UseUserSearchParams {
  userId: string | undefined;
  groupId: string | undefined;
}

interface UseUserSearchReturn {
  searchResults: SearchUser[];
  setSearchResults: React.Dispatch<React.SetStateAction<SearchUser[]>>;
  isSearching: boolean;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  currentUserGender: string | null;
  checkGenderCompatibility: (targetUserGender: string) => boolean;
}

export function useUserSearch({
  userId,
  groupId,
}: UseUserSearchParams): UseUserSearchReturn {
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);

  // Fetch current user's gender
  useEffect(() => {
    const fetchCurrentUserGender = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("gender")
          .eq("id", userId)
          .single();

        if (error) throw error;
        setCurrentUserGender(data.gender);
      } catch (error) {
        console.error("[useUserSearch] Failed to fetch current user gender:", error);
      }
    };

    fetchCurrentUserGender();
  }, [userId]);

  // Debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Check gender compatibility
  const checkGenderCompatibility = (targetUserGender: string): boolean => {
    if (!currentUserGender || !targetUserGender) return true;
    if (currentUserGender === "everyone" || targetUserGender === "everyone") return true;
    return currentUserGender === targetUserGender;
  };

  // Search users function
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim() || !userId || !groupId) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // 1. First search all users (regardless of invitation status)
      const { data: allUsers, error: searchError } = await supabase.rpc(
        "search_users",
        {
          p_search_term: searchTerm.trim(),
          p_exclude_user_id: userId,
          p_exclude_group_id: null, // Search without excluding groups
        }
      );

      if (searchError) throw searchError;

      // 2. Get current group member information (using simple RPC)
      const { data: groupMembers, error: membersError } = await supabase.rpc(
        "get_group_member_statuses",
        {
          p_group_id: groupId,
        }
      );

      if (membersError) throw membersError;

      // 3. Member status mapping
      const memberStatusMap = new Map();
      groupMembers?.forEach((member) => {
        memberStatusMap.set(member.user_id, member.status);
      });

      // 4. Add invitation status to search results
      const usersWithStatus =
        allUsers?.map((user) => ({
          ...user,
          displayName: user.username,
          invitationStatus: memberStatusMap.get(user.id) || null, // 'invited', 'joined', 'declined' or null
        })) || [];

      setSearchResults(usersWithStatus);
    } catch (error) {
      console.error("[useUserSearch] Search error:", error);
      Alert.alert("Error", "Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  // Execute search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      searchUsers(debouncedSearchTerm);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm, userId, groupId]);

  return {
    searchResults,
    setSearchResults,
    isSearching,
    searchTerm,
    setSearchTerm,
    currentUserGender,
    checkGenderCompatibility,
  };
}
