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

  const sendInvitation = async (userId: string, userName: string) => {
    if (!session?.user?.id || !groupId) return;

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
        console.log(`[SearchScreen] - parameters:`, data.parameters);
        console.log(`[SearchScreen] - error:`, data.error);

        if (data.success) {
          console.log(`[SearchScreen] ✅ 초대 전송 성공: ${userName}`);
          // Update the user's invitation status immediately in the UI
          setSearchResults(prevResults => 
            prevResults.map(user => 
              user.id === userId 
                ? { ...user, invitationStatus: "invited" as const }
                : user
            )
          );
        } else if (data.already_exists) {
          console.log(`[SearchScreen] ⚠️ 이미 초대됨: ${userName}`);
          // Still update UI since they're already invited
          setSearchResults(prevResults => 
            prevResults.map(user => 
              user.id === userId 
                ? { ...user, invitationStatus: "invited" as const }
                : user
            )
          );
        } else {
          console.error(`[SearchScreen] ❌ 초대 전송 실패: ${userName}`, data.error);
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

    console.log(`[SearchScreen] ==================== CANCEL INVITATION START ====================`);
    console.log(`[SearchScreen] 초대 취소 시도: ${userName} (ID: ${userId})`);
    console.log(`[SearchScreen] 그룹 ID: ${groupId} (타입: ${typeof groupId})`);
    console.log(`[SearchScreen] 유저 ID: ${userId} (타입: ${typeof userId})`);
    console.log(`[SearchScreen] 현재 유저 ID: ${session.user.id}`);
    
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

    // Log the exact parameters being sent
    const rpcParams = {
      p_group_id: groupId,
      p_user_id: userId,
    };
    console.log(`[SearchScreen] RPC 파라미터:`, JSON.stringify(rpcParams, null, 2));

    try {
      const { data, error } = await supabase.rpc("cancel_invitation", rpcParams);

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
        
        // Check if it's a function not found error
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          Alert.alert("Error", "Cancel invitation function not found. Please update the database function.");
        } else {
          Alert.alert("Error", `Failed to cancel invitation: ${error.message}`);
        }
        return;
      }

      // Handle JSON response from enhanced RPC function
      if (data) {
        console.log(`[SearchScreen] ==================== RPC 응답 상세 분석 ====================`);
        console.log(`[SearchScreen] - success: ${data.success}`);
        console.log(`[SearchScreen] - deleted_count: ${data.deleted_count}`);
        console.log(`[SearchScreen] - exact_match_count: ${data.exact_match_count}`);
        console.log(`[SearchScreen] - invited_records_count: ${data.invited_records_count}`);
        console.log(`[SearchScreen] - found_record:`, data.found_record);
        console.log(`[SearchScreen] - total_user_invites: ${data.total_user_invites}`);
        console.log(`[SearchScreen] - sent_parameters:`, data.parameters);

        if (data.success) {
          console.log(`[SearchScreen] ✅ 초대 취소 성공: ${userName} (${data.deleted_count}개 레코드 삭제됨)`);
          // Update the user's invitation status back to null (no invitation)
          setSearchResults(prevResults => 
            prevResults.map(user => 
              user.id === userId 
                ? { ...user, invitationStatus: null }
                : user
            )
          );
        } else {
          console.error(`[SearchScreen] ❌ 초대 취소 실패 - 진단 정보:`);
          console.error(`[SearchScreen] - exact_match_count: ${data.exact_match_count} (그룹+유저 매치)`);
          console.error(`[SearchScreen] - invited_records_count: ${data.invited_records_count} (invited 상태 매치)`);
          console.error(`[SearchScreen] - found_record:`, data.found_record);
          console.error(`[SearchScreen] - total_user_invites: ${data.total_user_invites} (전체 초대)`);
          
          let diagnosticMessage = `Cancel failed for ${userName}:\n`;
          diagnosticMessage += `• Group+User match: ${data.exact_match_count}\n`;
          diagnosticMessage += `• Invited status match: ${data.invited_records_count}\n`;
          
          if (data.found_record) {
            diagnosticMessage += `• Found record status: "${data.found_record.status}"\n`;
          } else {
            diagnosticMessage += `• No matching record found\n`;
          }
          
          diagnosticMessage += `• User's total invites: ${data.total_user_invites}`;
          
          // Show different messages based on the diagnosis
          if (data.exact_match_count === 0) {
            Alert.alert("Debug Info", "No record found with this group_id and user_id combination");
          } else if (data.invited_records_count === 0) {
            Alert.alert("Debug Info", 
              `Record exists but status is "${data.found_record?.status}" (not "invited")`
            );
          } else {
            Alert.alert("Debug Info", diagnosticMessage);
          }
        }
      } else {
        console.log(`[SearchScreen] RPC returned null/undefined data`);
        Alert.alert("Error", "No response data from cancel invitation");
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
            onPress={() => sendInvitation(item.id, item.displayName)}
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
        background={true}
        blurIntensity={70}
        extendStatusBar
      />

      <View style={[styles.content, { paddingTop: insets.top + 56 }]}>
        {/* 검색 입력 */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.darkGray} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
            placeholder="Search by username"
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
          contentContainerStyle={styles.listContainer}
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
    fontSize: 22,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F0FF",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 15,
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
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    textAlign: "center",
  },
  closeButton: {
    padding: 8,
  },
});
