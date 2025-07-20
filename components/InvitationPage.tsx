import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import CustomAppBar from "@/components/CustomAppBar";
import CustomView from "@/components/CustomView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BubbleTabItemData } from "@/components/bubble/BubbleTabItem";

interface InvitationBubble extends BubbleTabItemData {
  user_status: string;
  invited_at: string;
}

// Custom Invitation Item Component
const InvitationItem: React.FC<{
  bubble: InvitationBubble;
  onAccept: (bubbleId: string) => void;
  onDecline: (bubbleId: string) => void;
  onPress: () => void;
}> = ({ bubble, onAccept, onDecline, onPress }) => {
  const { members, name, status } = bubble;
  const [currentUserSignedUrl, setCurrentUserSignedUrl] = useState<
    string | null
  >(null);
  const [otherMemberSignedUrl, setOtherMemberSignedUrl] = useState<
    string | null
  >(null);
  const [currentUserImageError, setCurrentUserImageError] = useState(false);
  const [otherMemberImageError, setOtherMemberImageError] = useState(false);

  // members가 배열이 아닐 경우를 대비한 방어 코드
  if (!Array.isArray(members)) {
    return null;
  }

  // 현재 유저의 이미지 (첫 번째 멤버)
  const currentUser = members[0];

  // 다른 멤버들 (두 번째부터)
  const otherMembers = members.slice(1);
  const otherMember = otherMembers[0]; // 첫 번째 다른 멤버

  // Signed URL을 생성하는 공통 함수
  const createSignedUrlForMember = async (
    avatarUrl: string | null | undefined
  ): Promise<string | null> => {
    if (!avatarUrl) return null;

    try {
      // Public URL에서 파일 경로 추출
      const urlParts = avatarUrl.split("/user-images/");
      const filePath = urlParts.length > 1 ? urlParts[1] : null;

      if (!filePath) {
        console.log(
          "[InvitationItem] 파일 경로를 추출할 수 없습니다:",
          avatarUrl
        );
        return null;
      }

      console.log("[InvitationItem] Signed URL 생성 시작:", filePath);
      const { data, error } = await supabase.storage
        .from("user-images")
        .createSignedUrl(filePath, 3600); // 1시간 유효

      if (error) {
        console.error("[InvitationItem] Signed URL 생성 실패:", error);
        return null;
      }

      console.log("[InvitationItem] Signed URL 생성 성공:", data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error("[InvitationItem] Signed URL 생성 중 예외:", error);
      return null;
    }
  };

  // 현재 유저와 다른 멤버의 Signed URL을 가져옵니다.
  useEffect(() => {
    const loadSignedUrls = async () => {
      // 현재 유저의 Signed URL 생성
      const currentUserUrl = await createSignedUrlForMember(
        currentUser?.avatar_url
      );
      setCurrentUserSignedUrl(currentUserUrl);

      // 다른 멤버의 Signed URL 생성
      if (otherMember) {
        const otherMemberUrl = await createSignedUrlForMember(
          otherMember.avatar_url
        );
        setOtherMemberSignedUrl(otherMemberUrl);
      }
    };

    loadSignedUrls();
  }, [currentUser?.avatar_url, otherMember?.avatar_url]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.invitationItemContainer}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {/* 현재 유저 아바타 */}
            {!currentUserImageError && currentUserSignedUrl ? (
              <Image
                source={{ uri: currentUserSignedUrl }}
                style={styles.avatar}
                onError={(error) => {
                  console.error(
                    "InvitationItem current user avatar load error:",
                    error.nativeEvent
                  );
                  setCurrentUserImageError(true);
                }}
                onLoad={() => {
                  console.log(
                    "InvitationItem current user avatar loaded successfully:",
                    currentUserSignedUrl
                  );
                }}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={24} color="#999" />
              </View>
            )}
          </View>

          {/* 다른 멤버들 또는 초대 대기 상태 (오른쪽) */}
          <View style={[styles.avatarWrapper, { marginLeft: -20, zIndex: 0 }]}>
            {otherMembers.length > 0 ? (
              // 다른 멤버가 있는 경우
              <View>
                {!otherMemberImageError && otherMemberSignedUrl ? (
                  <Image
                    source={{ uri: otherMemberSignedUrl }}
                    style={styles.avatar}
                    onError={(error) => {
                      console.error(
                        "InvitationItem other member avatar load error:",
                        error.nativeEvent
                      );
                      setOtherMemberImageError(true);
                    }}
                    onLoad={() => {
                      console.log(
                        "InvitationItem other member avatar loaded successfully:",
                        otherMemberSignedUrl
                      );
                    }}
                  />
                ) : (
                  <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Ionicons name="person" size={24} color="#999" />
                  </View>
                )}
              </View>
            ) : (
              // 다른 멤버가 없거나 초대를 받지 않은 경우 "..." 표시
              <View style={[styles.avatar, styles.invitePlaceholder]}>
                <Text style={styles.inviteText}>...</Text>
              </View>
            )}
          </View>
        </View>

        {/* 중앙 정렬된 타이틀 */}
        <View style={styles.textContainer}>
          <Text style={styles.bubbleTitle}>{name || "Unnamed Bubble"}</Text>
        </View>

        {/* Accept/Decline buttons replacing chevron */}
        <View style={styles.invitationActionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={(e) => {
              e.stopPropagation();
              onAccept(bubble.id);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={(e) => {
              e.stopPropagation();
              onDecline(bubble.id);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function InvitationPage() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [invitedBubbles, setInvitedBubbles] = useState<InvitationBubble[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvitedBubbles = async () => {
      if (!session?.user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_my_bubbles", {
          p_user_id: session.user.id,
        });

        if (error) throw error;

        // Filter only invited status bubbles
        const invited = (data || [])
          .filter((bubble: any) => bubble.user_status === "invited")
          .map((bubble: any) => ({
            id: bubble.id,
            name: bubble.name,
            status: bubble.status,
            members: bubble.members || [],
            user_status: bubble.user_status,
            invited_at: bubble.invited_at,
          }));

        console.log("[InvitationPage] Invited bubbles:", invited);
        setInvitedBubbles(invited);
      } catch (error) {
        console.error("Error fetching invited bubbles:", error);
        setInvitedBubbles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitedBubbles();
  }, [session]);

  const handleAcceptInvitation = (bubbleId: string) => {
    console.log("Accept invitation for bubble:", bubbleId);
    // TODO: Implement accept logic
  };

  const handleDeclineInvitation = (bubbleId: string) => {
    console.log("Decline invitation for bubble:", bubbleId);
    // TODO: Implement decline logic
  };

  const renderInvitationItem = ({ item }: { item: InvitationBubble }) => {
    return (
      <InvitationItem
        bubble={item}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        onPress={() => {
          // Navigate to bubble details or form
          router.push({
            pathname: "/bubble/form",
            params: {
              groupId: item.id,
              isExistingBubble: "true",
            },
          });
        }}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="mail-outline" size={64} color={colors.darkGray} />
      <Text style={[styles.emptyText, { color: colors.darkGray }]}>
        No pending invitations
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.darkGray }]}>
        You'll see invitations here when you receive them
      </Text>
    </View>
  );

  return (
    <CustomView style={styles.container}>
      <CustomAppBar
        leftComponent={
          <Text style={[styles.title, { color: colors.black }]}>
            Invitations
          </Text>
        }
        background={true}
        blurIntensity={70}
        extendStatusBar
      />

      <View style={[styles.content, { paddingTop: insets.top + 56 }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={invitedBubbles}
            renderItem={renderInvitationItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  listContainer: {
    flexGrow: 1,
  },
  // InvitationItem styles (copied from BubbleTabItem with modifications)
  invitationItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E0E0E0",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  avatarWrapper: {
    position: "relative",
    zIndex: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  placeholderAvatar: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  invitePlaceholder: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  inviteText: {
    fontSize: 18,
    color: "#999",
    fontWeight: "bold",
  },
  textContainer: {
    marginLeft: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Quicksand-Bold",
    textAlign: "center",
  },
  // Action buttons replacing chevron
  invitationActionButtons: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButton: {
    backgroundColor: "#5A99E5",
  },
  declineButton: {
    backgroundColor: "#FF6B6B",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Quicksand-Bold",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    marginTop: 8,
    textAlign: "center",
    opacity: 0.7,
  },
});
