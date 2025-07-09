import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ImageSourcePropType,
  ListRenderItemInfo,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// 데이터 타입을 정의합니다.
type User = {
  id: string;
  userID: string;
  mbti: string;
  image: ImageSourcePropType;
};

// 컴포넌트 props의 타입을 정의합니다.
type UserRowProps = {
  user: User;
};

// require 대신 { uri: '...' } 형태로 이미지 URL을 사용합니다.
const ALL_USERS: User[] = [
  {
    id: "1",
    userID: "Jaden_Oak",
    mbti: "ENTP",
    image: { uri: "https://picsum.photos/seed/jaden_oak/200/200" },
  },
  {
    id: "2",
    userID: "brian_02",
    mbti: "ESTJ",
    image: { uri: "https://picsum.photos/seed/brian_02/200/200" },
  },
  {
    id: "4",
    userID: "mike_lee",
    mbti: "ENFP",
    image: { uri: "https://picsum.photos/seed/mike_lee/200/200" },
  },
  {
    id: "6",
    userID: "alex_chen",
    mbti: "ENTJ",
    image: { uri: "https://picsum.photos/seed/alex_chen/200/200" },
  },
  {
    id: "8",
    userID: "david_nguyen",
    mbti: "INTP",
    image: { uri: "https://picsum.photos/seed/david_nguyen/200/200" },
  },
];

// 사용자 한 명의 행(Row)을 표시하는 컴포넌트
const UserRow: React.FC<UserRowProps & { onInvite: () => void }> = ({
  user,
  onInvite,
}) => (
  <View style={styles.userRowContainer}>
    <Image source={user.image} style={styles.userImage} />
    <View style={styles.userInfoContainer}>
      <Text style={styles.userID}>{user.userID}</Text>
      <Text style={styles.userMbti}>{user.mbti}</Text>
    </View>
    <TouchableOpacity onPress={onInvite} style={styles.addButton}>
      <Feather name="plus" size={24} color="black" />
    </TouchableOpacity>
  </View>
);

// 메인 컴포넌트
const SearchComponent: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [searchText, setSearchText] = useState<string>("");
  const router = useRouter();

  // Filter users based on search text
  const filteredUsers = ALL_USERS.filter((user) => {
    const searchLower = searchText.toLowerCase();
    return (
      user.userID.toLowerCase().includes(searchLower) ||
      user.mbti.toLowerCase().includes(searchLower)
    );
  });

  const renderUserRow = ({ item }: ListRenderItemInfo<User>) => (
    <UserRow
      user={item}
      onInvite={() => {
        console.log(`Invitation sent to ${item.userID}`);
        router.push("/bubble/form");
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="gray"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="search your friend's UserID"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#888"
        />
      </View>

      <Text style={styles.recentTitle}>
        {searchText ? `Search Results (${filteredUsers.length})` : "Recent"}
      </Text>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          searchText ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No users found for "{searchText}"
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default SearchComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 15,
  },
  listContentContainer: {
    paddingHorizontal: 16,
  },
  userRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: "#e0e0e0", // 이미지가 로드되기 전에 보일 배경색
  },
  userInfoContainer: {
    flex: 1,
  },
  userID: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  userMbti: {
    fontSize: 14,
    color: "#666",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
