import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

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
  isActive?: boolean;
  onSetActive?: () => void;
  onLeaveGroup?: () => void;
}

const BubbleTabItem: React.FC<BubbleTabItemProps> = ({ 
  bubble, 
  onPress, 
  isActive = false, 
  onSetActive, 
  onLeaveGroup 
}) => {
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

  // 이미 공개 URL이므로 Signed URL 생성이 필요 없습니다
  const getImageUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl) return null;
    
    // 이미 공개 URL이므로 그대로 사용
    console.log("[BubbleTabItem] 공개 URL 사용:", avatarUrl);
    return avatarUrl;
  };

  // 현재 유저와 다른 멤버의 이미지 URL을 설정합니다.
  useEffect(() => {
    // 현재 유저의 이미지 URL 설정
    const currentUserUrl = getImageUrl(currentUser?.avatar_url);
    setCurrentUserSignedUrl(currentUserUrl);

    // 다른 멤버의 이미지 URL 설정
    if (otherMember) {
      const otherMemberUrl = getImageUrl(otherMember.avatar_url);
      setOtherMemberSignedUrl(otherMemberUrl);
    }
  }, [currentUser?.avatar_url, otherMember?.avatar_url]);

  // 서버에서 받은 데이터 로깅
  console.log("[BubbleTabItem] 🔍 버블 데이터 분석:");
  console.log("[BubbleTabItem] - 버블 이름:", name);
  console.log("[BubbleTabItem] - 버블 상태:", status);
  console.log("[BubbleTabItem] - 멤버 수:", members.length);
  console.log("[BubbleTabItem] - Active 상태:", isActive);

  if (currentUser) {
    console.log("[BubbleTabItem] - 현재 유저 ID:", currentUser.id);
    console.log(
      "[BubbleTabItem] - 현재 유저 avatar_url:",
      currentUser.avatar_url
    );
  }

  // Long Press 핸들러
  const handleLongPress = () => {
    Alert.alert(
      "Bubble Options",
      `Select an action for ${name || "Unnamed Bubble"}`,
      [
        {
          text: "Set as Active",
          onPress: onSetActive,
          style: "default",
        },
        {
          text: "Pop",
          onPress: onLeaveGroup,
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          {/* 현재 유저의 이미지 (왼쪽) */}
          <View style={styles.avatarWrapper}>
            {!currentUserImageError && currentUserSignedUrl ? (
              <Image
                source={{ uri: currentUserSignedUrl }}
                style={styles.avatar}
                onError={(error) => {
                  console.error(
                    "BubbleTabItem current user avatar load error:",
                    error.nativeEvent
                  );
                  setCurrentUserImageError(true);
                }}
                onLoad={() => {
                  console.log(
                    "BubbleTabItem current user avatar loaded successfully:",
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
                        "BubbleTabItem other member avatar load error:",
                        error.nativeEvent
                      );
                      setOtherMemberImageError(true);
                    }}
                    onLoad={() => {
                      console.log(
                        "BubbleTabItem other member avatar loaded successfully:",
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
          <Text style={styles.title}>{name || "Unnamed Bubble"}</Text>
          {isActive && (
            <Text style={styles.activeText}>Active</Text>
          )}
        </View>

        {/* 오른쪽 액션 버튼들 */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.checkButton]}
            onPress={onSetActive}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.closeButton]}
            onPress={onLeaveGroup}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
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
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    paddingRight: 12,
  },
  actionButton: {
    marginLeft: 8,
    padding: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  checkButton: {
    backgroundColor: "#8ec3ff",
  },
  closeButton: {
    backgroundColor: "#8ec3ff",
  },
  activeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.tint,
    fontFamily: "Quicksand-Bold",
    marginTop: 2,
  },
});

export default BubbleTabItem;
