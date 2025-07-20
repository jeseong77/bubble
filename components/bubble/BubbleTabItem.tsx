import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

// 버블 멤버 타입 정의
export type BubbleTabMember = {
  id: string;
  avatar_url: string | null;
};

// 버블 아이템 타입 정의
export type BubbleTabItemData = {
  id: string;
  name: string | null;
  status: string;
  members: BubbleTabMember[];
};

// Props 타입 정의
interface BubbleTabItemProps {
  bubble: BubbleTabItemData;
  onPress: () => void;
}

const BubbleTabItem: React.FC<BubbleTabItemProps> = ({ bubble, onPress }) => {
  const { members, name, status } = bubble;
  const [currentUserSignedUrl, setCurrentUserSignedUrl] = useState<
    string | null
  >(null);

  // members가 배열이 아닐 경우를 대비한 방어 코드
  if (!Array.isArray(members)) {
    return null;
  }

  // 현재 유저의 이미지 (첫 번째 멤버)
  const currentUser = members[0];

  // 다른 멤버들 (두 번째부터)
  const otherMembers = members.slice(1);

  // Public URL을 파일 경로로 변환하고 Signed URL 생성
  useEffect(() => {
    const getSignedUrl = async () => {
      if (!currentUser?.avatar_url) {
        console.log("[BubbleTabItem] 현재 유저의 avatar_url이 없습니다.");
        return;
      }

      try {
        // Public URL에서 파일 경로 추출
        // 예: https://.../user-images/folder/image.jpg -> folder/image.jpg
        const urlParts = currentUser.avatar_url.split("/user-images/");
        const filePath = urlParts.length > 1 ? urlParts[1] : null;

        if (!filePath) {
          console.log(
            "[BubbleTabItem] 파일 경로를 추출할 수 없습니다:",
            currentUser.avatar_url
          );
          return;
        }

        console.log("[BubbleTabItem] Signed URL 생성 시작:", filePath);
        const { data, error } = await supabase.storage
          .from("user-images")
          .createSignedUrl(filePath, 60);

        if (error) {
          console.error("[BubbleTabItem] Signed URL 생성 실패:", error);
          return;
        }

        console.log("[BubbleTabItem] Signed URL 생성 성공:", data.signedUrl);
        setCurrentUserSignedUrl(data.signedUrl);
      } catch (error) {
        console.error("[BubbleTabItem] Signed URL 생성 중 예외:", error);
      }
    };

    getSignedUrl();
  }, [currentUser?.avatar_url]);

  // 서버에서 받은 데이터 로깅
  console.log("[BubbleTabItem] 🔍 버블 데이터 분석:");
  console.log("[BubbleTabItem] - 버블 이름:", name);
  console.log("[BubbleTabItem] - 버블 상태:", status);
  console.log("[BubbleTabItem] - 멤버 수:", members.length);

  if (currentUser) {
    console.log("[BubbleTabItem] - 현재 유저 ID:", currentUser.id);
    console.log(
      "[BubbleTabItem] - 현재 유저 avatar_url:",
      currentUser.avatar_url
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          {/* 현재 유저의 이미지 (왼쪽) */}
          <View style={styles.avatarWrapper}>
            {currentUserSignedUrl ? (
              <Image
                source={{ uri: currentUserSignedUrl }}
                style={styles.avatar}
                onError={(error) => {
                  console.error(
                    "BubbleTabItem current user avatar load error:",
                    error.nativeEvent
                  );
                }}
                onLoad={() => {
                  console.log(
                    "BubbleTabItem current user avatar loaded successfully:",
                    currentUserSignedUrl
                  );
                }}
              />
            ) : currentUser?.avatar_url ? (
              <Image
                source={{ uri: currentUser.avatar_url }}
                style={styles.avatar}
                onError={(error) => {
                  console.error(
                    "BubbleTabItem current user avatar fallback load error:",
                    error.nativeEvent
                  );
                }}
                onLoad={() => {
                  console.log(
                    "BubbleTabItem current user avatar fallback loaded successfully:",
                    currentUser.avatar_url
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
              otherMembers.slice(0, 1).map((member) => (
                <View key={member.id}>
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={styles.avatar}
                      onError={(error) => {
                        console.error(
                          "BubbleTabItem other member avatar load error:",
                          error.nativeEvent
                        );
                      }}
                      onLoad={() => {
                        console.log(
                          "BubbleTabItem other member avatar loaded successfully:",
                          member.avatar_url
                        );
                      }}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                      <Ionicons name="person" size={24} color="#999" />
                    </View>
                  )}
                </View>
              ))
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
          <Text style={styles.title}>{name || "Unnamed Bubble"}</Text>
        </View>

        {/* 오른쪽 화살표 아이콘 */}
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={24} color="#C0C0C0" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Quicksand-Bold",
    textAlign: "center",
  },
  chevronContainer: {
    marginLeft: "auto",
    paddingRight: 12,
  },
});

export default BubbleTabItem;
