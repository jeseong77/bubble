import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

const BubbleItem = ({ bubble, onPress }) => {
  // 1. 'users' -> 'members', 'title' -> 'name' 으로 수정
  const { members, name, status } = bubble;

  // 2. members가 배열이 아닐 경우를 대비한 방어 코드 (더 안정적인 코드)
  if (!Array.isArray(members)) {
    // 렌더링하지 않거나, 에러 메시지를 보여줄 수 있습니다.
    return null;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          {/* 3. 'users' -> 'members' 로 수정 */}
          {members.map((user, index) => (
            <Image
              key={user.id}
              // 4. 'profile.tsx'의 BubbleMember 타입을 보면 'avatar_url'이므로 수정
              source={{ uri: user.avatar_url }}
              style={[styles.avatar, { marginLeft: index > 0 ? -15 : 0 }]}
            />
          ))}
        </View>
        <View style={styles.textContainer}>
          {/* 5. 'title' -> 'name' 으로 수정 */}
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <Feather name="chevron-right" size={24} color="#C0C0C0" />
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  status: {
    fontSize: 14,
    color: "#8E8E93",
  },
});

export default BubbleItem;
