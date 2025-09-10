import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

// 버블 멤버 타입 정의
export type BubbleTabMember = {
  id: string;
  avatar_url: string | null;
  status?: string; // 'joined' or 'invited'
};

// 버블 아이템 타입 정의
export type BubbleTabItemData = {
  id: string;
  name: string | null;
  status: string;
  max_size: number;
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
  const { members, name, status, max_size } = bubble;
  const [memberSignedUrls, setMemberSignedUrls] = useState<(string | null)[]>([]);
  const [imageErrors, setImageErrors] = useState<boolean[]>([]);

  // Filter joined members only (exclude invited members for avatar display) - memoized to prevent infinite loops
  const joinedMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    
    console.log("[BubbleTabItem] 🔍 Filtering members for joined status...");
    const filtered = members.filter(member => {
      const isJoined = member.status === 'joined';
      console.log(`[BubbleTabItem] - Member ${member.id}: status='${member.status}', isJoined=${isJoined}`);
      return isJoined;
    });
    
    console.log("[BubbleTabItem] 🔍 Filtered result:", filtered);
    return filtered;
  }, [members]);
  
  // Always show max_size slots regardless of bubble status
  const totalSpotsToShow = max_size;
  const placeholderCount = Math.max(0, max_size - joinedMembers.length);

  // 이미 공개 URL이므로 Signed URL 생성이 필요 없습니다
  const getImageUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl) return null;
    
    // 이미 공개 URL이므로 그대로 사용
    console.log("[BubbleTabItem] 공개 URL 사용:", avatarUrl);
    return avatarUrl;
  };

  // 모든 멤버의 이미지 URL을 설정합니다.
  useEffect(() => {
    const urls = joinedMembers.map(member => getImageUrl(member.avatar_url));
    const errors = new Array(joinedMembers.length).fill(false);
    
    setMemberSignedUrls(urls);
    setImageErrors(errors);
  }, [joinedMembers]);

  // Handle individual image errors
  const handleImageError = (index: number) => {
    setImageErrors(prev => {
      const newErrors = [...prev];
      newErrors[index] = true;
      return newErrors;
    });
  };

  // Handle individual image load success
  const handleImageLoad = (index: number, url: string) => {
    console.log(`[BubbleTabItem] Member ${index} avatar loaded successfully:`, url);
  };

  // members가 배열이 아닐 경우를 대비한 방어 코드 (hooks 이후에 위치)
  if (!Array.isArray(members)) {
    return null;
  }

  // 서버에서 받은 데이터 로깅 - 디버깅 강화
  console.log("[BubbleTabItem] 🔍 버블 데이터 분석:");
  console.log("[BubbleTabItem] - 버블 이름:", name);
  console.log("[BubbleTabItem] - 버블 상태:", status);
  console.log("[BubbleTabItem] - 최대 크기:", max_size);
  console.log("[BubbleTabItem] - 전체 멤버 수:", members.length);
  console.log("[BubbleTabItem] - 전체 멤버 데이터:", members);
  
  // 각 멤버의 상세 정보 로깅
  members.forEach((member, index) => {
    console.log(`[BubbleTabItem] - 멤버 ${index}:`, {
      id: member.id,
      avatar_url: member.avatar_url,
      status: member.status,
      hasStatus: 'status' in member,
      statusValue: member.status,
      statusType: typeof member.status
    });
  });
  
  console.log("[BubbleTabItem] - 가입된 멤버 수:", joinedMembers.length);
  console.log("[BubbleTabItem] - 가입된 멤버 데이터:", joinedMembers);
  console.log("[BubbleTabItem] - 표시할 총 슬롯:", totalSpotsToShow);
  console.log("[BubbleTabItem] - 플레이스홀더 수:", placeholderCount);
  console.log("[BubbleTabItem] - Active 상태:", isActive);

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
          {/* Render joined member avatars */}
          {joinedMembers.map((member, index) => (
            <View 
              key={member.id} 
              style={[
                styles.avatarWrapper, 
                index > 0 && { marginLeft: -30, zIndex: totalSpotsToShow - index }
              ]}
            >
              {!imageErrors[index] && memberSignedUrls[index] ? (
                <Image
                  source={{ uri: memberSignedUrls[index]! }}
                  style={styles.avatar}
                  onError={() => handleImageError(index)}
                  onLoad={() => handleImageLoad(index, memberSignedUrls[index]!)}
                />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Ionicons name="person" size={24} color="#999" />
                </View>
              )}
            </View>
          ))}

          {/* Render placeholder spots for unfilled positions */}
          {placeholderCount > 0 && Array.from({ length: placeholderCount }).map((_, index) => (
            <View 
              key={`placeholder-${index}`}
              style={[
                styles.avatarWrapper, 
                { 
                  marginLeft: -30, 
                  zIndex: totalSpotsToShow - joinedMembers.length - index - 1
                }
              ]}
            >
              <View style={[styles.avatar, styles.invitePlaceholder]}>
                <Text style={styles.inviteText}>...</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 화면 중앙에 절대 위치로 정렬된 타이틀 */}
        <View style={styles.absoluteTextContainer}>
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
    width: 60,
    height: 60,
    borderRadius: 30,
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
  absoluteTextContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none", // Allow touches to pass through to background elements
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
