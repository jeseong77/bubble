import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

const BubbleItem = ({ bubble, onPress }) => {
  const { users, title, status } = bubble;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          {users.map((user, index) => (
            <Image
              key={user.id}
              source={{ uri: user.avatar }}
              style={[styles.avatar, { marginLeft: index > 0 ? -15 : 0 }]}
            />
          ))}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
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
