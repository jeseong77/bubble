import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";

const { width } = Dimensions.get("window");

// Mock data for chatrooms
const chatrooms = [
  {
    id: "1",
    myBubbleName: "Chill Bros",
    otherBubbleName: "Chicken Lover",
    unreadCount: 4,
    users: [
      {
        name: "Lisa",
        image: {
          uri: "https://i.namu.wiki/i/Uot0tQDfWx3O_1fWe7mshlKfZ5H0eyAiaNbKgSwrWg14lZqQyXTmaHBo0CL0A9oQYiGG9noJFh6jFpb-fA2sAg.webp",
        },
      },
      {
        name: "Rose",
        image: {
          uri: "https://cdn.hankooki.com/news/photo/202409/193587_268030_5014.jpg",
        },
      },
    ],
  },
];

export default function MessageListScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Bubble Chats</Text>
      <FlatList
        data={chatrooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <View style={styles.avatarsWrap}>
              <Image
                source={{
                  uri: "https://picsum.photos/seed/chill_bros/200/200",
                }}
                style={styles.avatar}
              />
              <View style={styles.avatarOverlapWrap}>
                <Image
                  source={item.users[0].image}
                  style={styles.avatarOverlap}
                />
                <Image
                  source={item.users[1].image}
                  style={[styles.avatarOverlap, { left: 24, zIndex: 1 }]}
                />
              </View>
            </View>
            <View style={styles.infoWrap}>
              <Text style={styles.bubbleName}>{item.myBubbleName}</Text>
              <Text style={styles.otherBubbleName}>{item.otherBubbleName}</Text>
            </View>
            <View style={styles.badgeWrap}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    fontSize: 32,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 18,
    marginLeft: 18,
  },
  rowWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
  },
  avatarsWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    width: 80,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#eee",
    marginRight: 0,
    zIndex: 3,
  },
  avatarOverlapWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -18,
    width: 56,
    position: "relative",
  },
  avatarOverlap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#eee",
    position: "absolute",
    left: 0,
    zIndex: 2,
  },
  infoWrap: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 12,
  },
  bubbleName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  otherBubbleName: {
    fontSize: 16,
    color: "#444",
    marginTop: 2,
  },
  badgeWrap: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "#A9CBFF",
    borderRadius: 16,
    minWidth: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginLeft: 18,
    marginRight: 18,
  },
});
