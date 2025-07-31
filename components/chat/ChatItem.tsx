import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// dayjs 플러그인 활성화
dayjs.extend(relativeTime);

// get_my_matches RPC의 반환 데이터 타입 정의
export interface MatchData {
  match_id: string;
  chat_room_id: string;
  other_group_id: string;
  other_group_name: string;
  other_group_avatar_urls: string[] | null;
  last_message_content: string | null;
  last_message_created_at: string | null;
  unread_count?: number;
}

interface ChatItemProps {
  match: MatchData;
  onPress: () => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({ match, onPress }) => {
  // 상대 그룹 아바타 목록 (최대 2개)
  const avatars = match.other_group_avatar_urls?.slice(0, 2) || [];

  // 마지막 메시지 시간 포맷팅
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "";
    return dayjs(timestamp).fromNow(true); // 'a few seconds ago' -> 'a few seconds'
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* 아바타 섹션 */}
      <View style={styles.avatarContainer}>
        {avatars.length === 0 && (
          <View style={[styles.avatarBase, styles.avatarPlaceholder]} />
        )}
        {avatars.map((url, index) => (
          <Image
            key={index}
            source={{ uri: url }}
            style={[
              styles.avatarBase,
              // 겹치는 효과를 위한 스타일
              index > 0 && styles.avatarOverlap,
            ]}
          />
        ))}
      </View>

      {/* 정보 섹션 */}
      <View style={styles.infoContainer}>
        <Text style={styles.groupName} numberOfLines={1}>
          {match.other_group_name}
        </Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {match.last_message_content || "새로운 매칭! 대화를 시작해보세요."}
        </Text>
      </View>

      {/* 메타 정보 (시간, 안 읽은 메시지 뱃지) 섹션 */}
      <View style={styles.metaContainer}>
        <Text style={styles.timestamp}>
          {formatTimestamp(match.last_message_created_at)}
        </Text>
        {match.unread_count && match.unread_count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{match.unread_count}</Text>
          </View>
        ) : (
          // 뱃지가 없을 때도 레이아웃 유지를 위한 빈 공간
          <View style={styles.badgePlaceholder} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  avatarContainer: {
    width: 60,
    height: 56,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBase: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "#eee",
  },
  avatarPlaceholder: {
    backgroundColor: "#E0E0E0",
  },
  avatarOverlap: {
    position: "absolute",
    left: 20, // 겹치는 정도
    top: 0,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  groupName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 15,
    color: "#666",
  },
  metaContainer: {
    marginLeft: 12,
    alignItems: "flex-end",
  },
  timestamp: {
    fontSize: 13,
    color: "#999",
    marginBottom: 6,
  },
  badge: {
    backgroundColor: "#A9CBFF",
    borderRadius: 12,
    height: 24,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  badgePlaceholder: {
    height: 24,
  },
});
