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
import { createSignedUrlForAvatar } from "@/utils/avatarUtils";

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
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);

  // URL 유효성 검사 함수
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      console.warn(`Invalid URL detected: ${url}`);
      return false;
    }
  };

  // 안전한 이미지 URL 가져오기 (Supabase Storage 최적화)
  const getSafeImageUrl = (userId: string, avatarUrl: string | null): string => {
    const fallbackUrl = "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User";
    
    console.log(`[getSafeImageUrl] User ${userId}:`, {
      hasSignedUrl: !!signedUrls[userId],
      signedUrl: signedUrls[userId],
      avatarUrl: avatarUrl,
      hasAvatarUrl: !!avatarUrl
    });
    
    // 1. Signed URL이 있고 유효한 경우
    const signedUrl = signedUrls[userId];
    if (signedUrl && isValidUrl(signedUrl)) {
      console.log(`[getSafeImageUrl] Using signed URL for user ${userId}`);
      return signedUrl;
    }
    
    // 2. Avatar URL이 있고 유효한 경우
    if (avatarUrl && isValidUrl(avatarUrl)) {
      console.log(`[getSafeImageUrl] Using avatar URL for user ${userId}`);
      return avatarUrl;
    }
    
    // 3. 모든 URL이 유효하지 않으면 fallback 사용
    console.log(`[getSafeImageUrl] Using fallback for user ${userId}`);
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

  // 디바운싱 효과
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 검색 실행
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

  const generateSignedUrls = async (users: SearchUser[]) => {
    const urls: { [key: string]: string } = {};

    console.log(`[generateSignedUrls] Processing ${users.length} users`);

    for (const user of users) {
      if (user.avatar_url) {
        try {
          console.log(`[generateSignedUrls] Processing user ${user.id} with avatar_url: ${user.avatar_url}`);
          
          // Use the existing avatarUtils function
          const signedUrl = await createSignedUrlForAvatar(user.avatar_url, 3600);
          
          if (signedUrl && isValidUrl(signedUrl)) {
            console.log(`[generateSignedUrls] Signed URL 생성 성공 for user ${user.id}`);
            urls[user.id] = signedUrl;
          } else {
            console.warn(`[generateSignedUrls] Signed URL 생성 실패, 원본 URL 사용 for user ${user.id}`);
            if (isValidUrl(user.avatar_url)) {
              urls[user.id] = user.avatar_url;
            } else {
              console.error(`[generateSignedUrls] 원본 avatar_url도 유효하지 않음 for user ${user.id}: ${user.avatar_url}`);
            }
          }
        } catch (error) {
          console.error(`[generateSignedUrls] Exception for user ${user.id}:`, error);
          if (user.avatar_url && isValidUrl(user.avatar_url)) {
            urls[user.id] = user.avatar_url;
          }
        }
      } else {
        console.log(`[generateSignedUrls] No avatar_url for user ${user.id}`);
      }
    }

    console.log(`[generateSignedUrls] 생성된 URLs:`, Object.keys(urls).length, urls);
    setSignedUrls(urls);
  };

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim() || !session?.user?.id || !groupId) {
      setSearchResults([]);
      return;
    }

    console.log(`[SearchScreen] 검색 시작: "${searchTerm}"`);
    console.log(`[SearchScreen] 제외할 유저 ID: ${session.user.id}`);
    console.log(`[SearchScreen] 제외할 그룹 ID: ${groupId}`);

    setIsSearching(true);
    try {
      // 1. 먼저 모든 유저를 검색 (초대 상태와 관계없이)
      const { data: allUsers, error: searchError } = await supabase.rpc(
        "search_users",
        {
          p_search_term: searchTerm.trim(),
          p_exclude_user_id: session.user.id,
          p_exclude_group_id: null, // 그룹 제외 없이 검색
        }
      );

      console.log(`[SearchScreen] 전체 검색 결과:`, { allUsers, searchError });

      if (searchError) throw searchError;

      // 2. 현재 그룹의 멤버 정보 가져오기 (간단한 RPC 사용)
      const { data: groupMembers, error: membersError } = await supabase.rpc(
        "get_group_member_statuses",
        {
          p_group_id: groupId,
        }
      );

      console.log(`[SearchScreen] 그룹 멤버 정보:`, {
        groupMembers,
        membersError,
      });

      if (membersError) throw membersError;

      // 3. 멤버 상태 매핑
      const memberStatusMap = new Map();
      groupMembers?.forEach((member) => {
        memberStatusMap.set(member.user_id, member.status);
      });

      // 4. 검색 결과에 초대 상태 추가
      const usersWithStatus =
        allUsers?.map((user) => ({
          ...user,
          displayName: user.username,
          invitationStatus: memberStatusMap.get(user.id) || null, // 'invited', 'joined', 'declined' 또는 null
        })) || [];

      console.log(`[SearchScreen] 상태가 추가된 검색 결과:`, usersWithStatus);
      
      // Log avatar URLs to debug format
      usersWithStatus.forEach(user => {
        console.log(`[SearchScreen] User ${user.id} (${user.username}) avatar_url:`, user.avatar_url);
      });

      setSearchResults(usersWithStatus);

      // Signed URL 생성
      if (usersWithStatus.length > 0) {
        generateSignedUrls(usersWithStatus);
      }
    } catch (error) {
      console.error("[SearchScreen] 검색 에러:", error);
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

    console.log(`[SearchScreen] 초대 전송 시도: ${userName} (ID: ${userId})`);
    console.log(`[SearchScreen] 그룹 ID: ${groupId}`);
    console.log(`[SearchScreen] 초대자 ID: ${session.user.id}`);

    try {
      const { data, error } = await supabase.rpc("send_invitation", {
        p_group_id: groupId,
        p_invited_user_id: userId,
        p_invited_by_user_id: session.user.id,
      });

      console.log(`[SearchScreen] RPC 응답:`, { data, error });

      if (error) {
        console.error(`[SearchScreen] 초대 전송 에러:`, error);
        throw error;
      }

      if (data) {
        console.log(`[SearchScreen] ==================== 초대 전송 응답 분석 ====================`);
        console.log(`[SearchScreen] Raw response:`, JSON.stringify(data, null, 2));
        console.log(`[SearchScreen] - success: ${data.success}`);
        console.log(`[SearchScreen] - already_exists: ${data.already_exists}`);
        console.log(`[SearchScreen] - inserted_count: ${data.inserted_count}`);
        console.log(`[SearchScreen] - verification_status: ${data.verification_status}`);
        console.log(`[SearchScreen] - parameters:`, data.parameters);
        console.log(`[SearchScreen] - error:`, data.error);

        // More permissive UI update logic - update UI if invitation was successful OR already exists
        if (data.success || data.already_exists) {
          console.log(`[SearchScreen] ✅ 초대 성공 또는 이미 존재: ${userName}`);
          console.log(`[SearchScreen] - success: ${data.success}, already_exists: ${data.already_exists}`);
          console.log(`[SearchScreen] - verification_status: ${data.verification_status}`);
          
          // Update UI to show invitation sent
          setSearchResults(prevResults => 
            prevResults.map(user => 
              user.id === userId 
                ? { ...user, invitationStatus: "invited" as const }
                : user
            )
          );
        } else {
          console.error(`[SearchScreen] ❌ 초대 전송 실패: ${userName}`, {
            success: data.success,
            already_exists: data.already_exists,
            verification_status: data.verification_status,
            inserted_count: data.inserted_count,
            error: data.error
          });
          Alert.alert("Error", `Failed to send invitation: ${data.error || "Unknown error"}`);
        }
      } else {
        console.log(
          `[SearchScreen] 초대 전송 실패: ${userName} - 이미 초대됨 또는 그룹이 가득참`
        );
        Alert.alert(
          "Error",
          "Failed to send invitation. User might already be invited or group is full."
        );
      }
    } catch (error) {
      console.error(`[SearchScreen] 초대 전송 중 예외 발생:`, error);
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

    console.log(`[SearchScreen] ==================== CANCEL BUTTON PRESSED ====================`);
    console.log(`[SearchScreen] Cancel button pressed for: ${userName}`);
    console.log(`[SearchScreen] userid: ${userId} for groupid: ${groupId}`);
    console.log(`[SearchScreen] Attempting to cancel invitation...`);
    console.log(`[SearchScreen] Parameter types - userId: ${typeof userId}, groupId: ${typeof groupId}`);
    
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isGroupIdValid = uuidRegex.test(groupId);
    const isUserIdValid = uuidRegex.test(userId);
    
    console.log(`[SearchScreen] UUID 검증 - groupId: ${isGroupIdValid}, userId: ${isUserIdValid}`);
    
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
    console.log(`[SearchScreen] ==================== RPC PARAMETERS ====================`);
    console.log(`[SearchScreen] Sending to RPC:`, JSON.stringify(rpcParams, null, 2));
    console.log(`[SearchScreen] p_group_id: "${groupId}" (type: ${typeof groupId}, length: ${groupId.length})`);
    console.log(`[SearchScreen] p_user_id: "${userId}" (type: ${typeof userId}, length: ${userId.length})`);
    console.log(`[SearchScreen] Direct test - these exact values found 1 record in SQL`);

    try {
      console.log(`[SearchScreen] Calling FORCE DELETE function...`);
      const forceParams = {
        p_group_id: groupId,
        p_user_id: userId,
      };
      const { data, error } = await supabase.rpc("force_delete_invitation", forceParams);

      console.log(`[SearchScreen] ==================== RPC 응답 ====================`);
      console.log(`[SearchScreen] Raw data:`, JSON.stringify(data, null, 2));
      console.log(`[SearchScreen] Raw error:`, JSON.stringify(error, null, 2));
      
      if (error) {
        console.error(`[SearchScreen] 에러 발생:`, {
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
        console.log(`[SearchScreen] ==================== FORCE DELETE 응답 ====================`);
        console.log(`[SearchScreen] - success: ${data.success}`);
        console.log(`[SearchScreen] - deleted_count: ${data.deleted_count}`);
        console.log(`[SearchScreen] - sql_executed: ${data.sql_executed}`);

        if (data.success) {
          console.log(`[SearchScreen] 🔥 FORCE DELETE 성공: ${userName} (${data.deleted_count}개 레코드 삭제됨)`);
          console.log(`[SearchScreen] 실행된 SQL: ${data.sql_executed}`);
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
          console.error(`[SearchScreen] ❌ FORCE DELETE도 실패: ${userName}`);
          console.error(`[SearchScreen] 실행된 SQL: ${data.sql_executed}`);
          Alert.alert("Error", `Even force delete failed for ${userName}. This shouldn't happen!`);
        }
      } else {
        console.log(`[SearchScreen] RPC returned null/undefined data`);
        Alert.alert("Error", "No response data from force delete");
      }
      
      console.log(`[SearchScreen] ==================== CANCEL INVITATION END ====================`);
    } catch (error) {
      console.error(`[SearchScreen] 예외 발생:`, error);
      console.error(`[SearchScreen] 예외 전체 객체:`, JSON.stringify(error, null, 2));
      Alert.alert("Error", `Exception during cancel: ${error}`);
    }
  };

  const renderUserRow = ({ item }: { item: SearchUser }) => {
    const isInvited = item.invitationStatus === "invited";
    const isJoined = item.invitationStatus === "joined";
    const isDeclined = item.invitationStatus === "declined";
    const canInvite = !item.invitationStatus; // 초대 상태가 없을 때만 초대 가능

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
              `유저 ${item.id} 이미지 로드 실패:`,
              error.nativeEvent,
              `사용된 URL: ${getSafeImageUrl(item.id, item.avatar_url)}`
            );
            // 이미지 로드 실패시 해당 유저의 signedUrl을 제거하여 다시 fallback 사용
            setSignedUrls(prev => {
              const updated = { ...prev };
              delete updated[item.id];
              return updated;
            });
          }}
          onLoad={() => {
            console.log(
              `유저 ${item.id} 이미지 로드 성공:`,
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

        {/* 초대 버튼 또는 상태 표시 */}
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
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => cancelInvitation(item.id, item.displayName)}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
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
          <View style={styles.profileIconContainer}>
            <Ionicons name="person-add-outline" size={24} color={colors.black} />
          </View>
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
        {/* 검색 입력 */}
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

        {/* 검색 결과 */}
        <FlatList
          data={searchResults}
          renderItem={renderUserRow}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={searchResults.length === 0 ? styles.listContainerEmpty : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
