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

    for (const user of users) {
      if (user.avatar_url) {
        try {
          // Public URL에서 파일 경로 추출
          const urlParts = user.avatar_url.split("/user-images/");
          const filePath = urlParts.length > 1 ? urlParts[1] : null;

          if (filePath) {
            const { data, error } = await supabase.storage
              .from("user-images")
              .createSignedUrl(filePath, 60);

            if (!error && data) {
              urls[user.id] = data.signedUrl;
            }
          }
        } catch (error) {
          console.error(`유저 ${user.id}의 Signed URL 생성 실패:`, error);
        }
      }
    }

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
        console.log(`[SearchScreen] 초대 전송 성공: ${userName}`);
        Alert.alert("Success", `Invitation sent to ${userName}`, [
          { text: "OK", onPress: () => router.back() },
        ]);
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

  const renderUserRow = ({ item }: { item: SearchUser }) => {
    const isInvited = item.invitationStatus === "invited";
    const isJoined = item.invitationStatus === "joined";
    const isDeclined = item.invitationStatus === "declined";
    const canInvite = !item.invitationStatus; // 초대 상태가 없을 때만 초대 가능

    return (
      <View
        style={[
          styles.userRow,
          isInvited && { opacity: 0.6 }, // 초대된 유저는 투명도 적용
        ]}
      >
        <Image
          source={{
            uri:
              signedUrls[item.id] ||
              item.avatar_url ||
              "https://via.placeholder.com/50",
          }}
          style={[
            styles.userAvatar,
            isInvited && { opacity: 0.6 }, // 초대된 유저는 이미지도 투명도 적용
          ]}
          onError={(error) => {
            console.error(
              `유저 ${item.id} 이미지 로드 실패:`,
              error.nativeEvent
            );
          }}
          onLoad={() => {
            console.log(
              `유저 ${item.id} 이미지 로드 성공:`,
              signedUrls[item.id] || item.avatar_url
            );
          }}
        />
        <View style={styles.userInfo}>
          <Text
            style={[
              styles.userName,
              {
                color: isInvited ? colors.darkGray : colors.black,
              },
            ]}
          >
            {item.displayName}
          </Text>
          <Text
            style={[
              styles.userMbti,
              {
                color: isInvited ? colors.darkGray : colors.darkGray,
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
              name="add-circle-outline"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : isInvited ? (
          <View style={styles.inviteButton}>
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color={colors.darkGray}
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
