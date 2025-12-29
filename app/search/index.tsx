import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import CustomAppBar from "@/components/CustomAppBar";
import CustomView from "@/components/CustomView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAvatarUrl } from "@/utils/avatarUtils";
import InviteModal from "@/components/InviteModal";

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

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const insets = useSafeAreaInsets();

  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // URL validity check function
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };

  // Get safe image URL - simplified to use public URLs directly
  const getSafeImageUrl = (userId: string, avatarUrl: string | null): string => {
    const fallbackUrl = "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User";

    // Use avatar URL directly if available and valid, otherwise fallback
    if (avatarUrl && isValidUrl(avatarUrl)) {
      return avatarUrl;
    }

    return fallbackUrl;
  };

  // Fetch current user's gender
  useEffect(() => {
    const fetchCurrentUserGender = async () => {
      if (!session?.user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("users")
          .select("gender")
          .eq("id", session.user.id)
          .single();
          
        if (error) throw error;
        setCurrentUserGender(data.gender);
      } catch (error) {
        console.error("[SearchScreen] Failed to fetch current user gender:", error);
      }
    };
    
    fetchCurrentUserGender();
  }, [session?.user?.id]);

  // Debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Execute search
  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      searchUsers(debouncedSearchTerm);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  const checkGenderCompatibility = (targetUserGender: string): boolean => {
    if (!currentUserGender || !targetUserGender) return true;
    if (currentUserGender === "everyone" || targetUserGender === "everyone") return true;
    return currentUserGender === targetUserGender;
  };


  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim() || !session?.user?.id || !groupId) {
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
          p_exclude_user_id: session.user.id,
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

        groupMembers,
        membersError,
      });

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

      
      // Log avatar URLs to debug format
      usersWithStatus.forEach(user => {
      });

      setSearchResults(usersWithStatus);
    } catch (error) {
      console.error("[SearchScreen] Search error:", error);
      Alert.alert("Error", "Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const sendInvitation = async (userId: string, userName: string, userGender: string) => {
    if (!session?.user?.id || !groupId) return;

    if (!checkGenderCompatibility(userGender)) {
      Alert.alert("Sorry, You can only invite friends of the same gender :(");
      return;
    }


    try {
      const { data, error } = await supabase.rpc("send_invitation", {
        p_group_id: groupId,
        p_invited_user_id: userId,
        p_invited_by_user_id: session.user.id,
      });


      if (error) {
        console.error(`[SearchScreen] Invitation sending error:`, error);
        throw error;
      }

      if (data) {

        // More permissive UI update logic - update UI if invitation was successful OR already exists
        if (data.success || data.already_exists) {
          
          // Update UI to show invitation sent
          setSearchResults(prevResults =>
            prevResults.map(user =>
              user.id === userId
                ? { ...user, invitationStatus: "invited" as const }
                : user
            )
          );

          // Show success popup
          Alert.alert(
            "Invitation Sent!",
            `Invitation sent to ${userName}!`,
            [{ text: "OK", style: "default" }]
          );
        } else {
          console.error(`[SearchScreen] ❌ Invitation sending failed: ${userName}`, {
            success: data.success,
            already_exists: data.already_exists,
            verification_status: data.verification_status,
            inserted_count: data.inserted_count,
            error: data.error
          });
          Alert.alert("Error", `Failed to send invitation: ${data.error || "Unknown error"}`);
        }
      } else {
          `[SearchScreen] Invitation sending failed: ${userName} - Already invited or group is full`
        );
        Alert.alert(
          "Error",
          "Failed to send invitation. User might already be invited or group is full."
        );
      }
    } catch (error) {
      console.error(`[SearchScreen] Exception during invitation sending:`, error);
      Alert.alert("Error", "Failed to send invitation");
    }
  };

  const cancelInvitation = async (userId: string, userName: string) => {
    if (!session?.user?.id || !groupId) {
      console.error(`[SearchScreen] Missing session or groupId:`, { 
        hasSession: !!session?.user?.id, 
        groupId 
      });
      return;
    }

    
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isGroupIdValid = uuidRegex.test(groupId);
    const isUserIdValid = uuidRegex.test(userId);
    
    
    if (!isGroupIdValid || !isUserIdValid) {
      console.error(`[SearchScreen] Invalid UUID format`, { groupId, userId });
      Alert.alert("Error", "Invalid ID format");
      return;
    }

    // Log the exact parameters being sent (matching RPC function parameter names)
    const rpcParams = {
      p_group_id: groupId,
      p_user_id: userId,
    };

    try {
      const forceParams = {
        p_group_id: groupId,
        p_user_id: userId,
      };
      const { data, error } = await supabase.rpc("force_delete_invitation", forceParams);

      
      if (error) {
        console.error(`[SearchScreen] Error occurred:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        Alert.alert("Error", `Failed to cancel invitation: ${error.message}`);
        return;
      }

      // Handle force delete response
      if (data) {

        if (data.success) {
          // Update the user's invitation status back to null (no invitation)
          setSearchResults(prevResults => 
            prevResults.map(user => 
              user.id === userId 
                ? { ...user, invitationStatus: null }
                : user
            )
          );
          Alert.alert("Success!", `Invitation cancelled for ${userName}`);
        } else {
          console.error(`[SearchScreen] ❌ Even FORCE DELETE failed: ${userName}`);
          console.error(`[SearchScreen] Executed SQL: ${data.sql_executed}`);
          Alert.alert("Error", `Even force delete failed for ${userName}. This shouldn't happen!`);
        }
      } else {
        Alert.alert("Error", "No response data from force delete");
      }
      
    } catch (error) {
      console.error(`[SearchScreen] Exception occurred:`, error);
      console.error(`[SearchScreen] Complete exception object:`, JSON.stringify(error, null, 2));
      Alert.alert("Error", `Exception during cancel: ${error}`);
    }
  };

  const renderUserRow = ({ item }: { item: SearchUser }) => {
    const isInvited = item.invitationStatus === "invited";
    const isJoined = item.invitationStatus === "joined";
    const isDeclined = item.invitationStatus === "declined";
    const canInvite = !item.invitationStatus; // Can only invite when there's no invitation status

    return (
      <View
        style={[
          styles.userRow,
        ]}
      >
        <Image
          source={{ uri: getSafeImageUrl(item.id, item.avatar_url) }}
          style={[
            styles.userAvatar,
          ]}
          defaultSource={{ uri: "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User" }}
          onError={(error) => {
            console.error(
              `User ${item.id} image load failed:`,
              error.nativeEvent,
              `Used URL: ${getSafeImageUrl(item.id, item.avatar_url)}`
            );
            // Image load failed, but fallback will be handled automatically
          }}
          onLoad={() => {
              `User ${item.id} image load successful:`,
              getSafeImageUrl(item.id, item.avatar_url)
            );
          }}
        />
        <View style={styles.userInfo}>
          <Text
            style={[
              styles.userName,
              {
                color: colors.black,
              },
            ]}
          >
            {item.displayName}
          </Text>
          <Text
            style={[
              styles.userMbti,
              {
                color: colors.darkGray,
              },
            ]}
          >
            {item.mbti}
          </Text>
        </View>

        {/* Invite button or status display */}
        {canInvite ? (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => sendInvitation(item.id, item.displayName, item.gender)}
          >
            <Ionicons
              name="add"
              size={24}
              color={colors.darkGray}
            />
          </TouchableOpacity>
        ) : isInvited ? (
          <View style={styles.inviteButton}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.primary}
            />
          </View>
        ) : isJoined ? (
          <View style={styles.inviteButton}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.primary}
            />
          </View>
        ) : isDeclined ? (
          <View style={styles.inviteButton}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {isSearching ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : searchTerm.length > 0 ? (
        <Text style={[styles.emptyText, { color: colors.darkGray }]}>
          No users found
        </Text>
      ) : (
        <Text style={[styles.emptyText, { color: colors.darkGray }]}>
          Invite your friends{'\n'}to form your Bubble
        </Text>
      )}
    </View>
  );

  return (
    <CustomView style={styles.container}>
      <CustomAppBar
        leftComponent={
          <TouchableOpacity 
            style={styles.profileIconContainer}
            onPress={() => setInviteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={24} color={colors.black} />
          </TouchableOpacity>
        }
        centerComponent={
          <Text style={[styles.title, { color: colors.black }]}>
            Search ID
          </Text>
        }
        rightComponent={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.black} />
          </TouchableOpacity>
        }
        background={false}
        extendStatusBar
      />

      <View style={styles.content}>
        {/* Search input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.darkGray} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
            placeholder="Search your friend's UserID"
            placeholderTextColor={colors.darkGray}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={20} color={colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results */}
        <FlatList
          data={searchResults}
          renderItem={renderUserRow}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={searchResults.length === 0 ? styles.listContainerEmpty : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Invite Modal */}
      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        groupId={groupId || ""}
        groupName="My Bubble"
        bubbleSize="2:2"
      />
    </CustomView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F0FF",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  listContainerEmpty: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: "Quicksand-Bold",
    marginBottom: 4,
  },
  userMbti: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
  },
  inviteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: -50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    textAlign: "center",
  },
  closeButton: {
    padding: 8,
  },
  profileIconContainer: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
