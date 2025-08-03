import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { ChatItem, MatchData } from "@/components/chat/ChatItem";

export default function MessageListScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useFocusEffect를 사용하여 화면이 포커될 때마다 데이터를 새로고침합니다.
  useFocusEffect(
    useCallback(() => {
      const fetchMatches = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // get_my_matches RPC를 호출하여 채팅 목록 데이터를 가져옵니다.
          const { data, error: rpcError } = await supabase.rpc(
            "get_my_matches"
          );

          if (rpcError) {
            throw rpcError;
          }

          setMatches(data || []);
        } catch (err: any) {
          console.error("Failed to fetch matches:", err);
          setError("채팅 목록을 불러오는 데 실패했습니다.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchMatches();
    }, [])
  );

  const handleChatItemPress = (chatRoomId: string, otherGroupName: string) => {
    console.log('🎯 [ChatsListScreen] Attempting to navigate to chat room:', chatRoomId);
    console.log('🎯 [ChatsListScreen] Navigation params:', { chatRoomId });
    
    router.push({
      pathname: "/chat-room",
      params: {
        chatRoomId: chatRoomId,
      },
    });
    
    console.log('🎯 [ChatsListScreen] Navigation call completed');
  };

  // 로딩 중일 때 표시할 컴포넌트
  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#A9CBFF" />
      </View>
    );
  }

  // 에러 발생 시 표시할 컴포넌트
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {/* 재시도 버튼 등을 추가할 수 있습니다. */}
      </View>
    );
  }

  // 데이터가 없을 때 표시할 컴포넌트
  if (matches.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.header}>Bubble Chats</Text>
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyText}>아직 매칭된 채팅방이 없어요.</Text>
          <Text style={styles.emptySubText}>
            새로운 버블을 좋아하고 대화를 시작해보세요!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 메인 컨텐츠
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Bubble Chats</Text>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.match_id}
        renderItem={({ item }) => (
          <ChatItem
            match={item}
            onPress={() =>
              handleChatItemPress(item.chat_room_id, item.other_group_name)
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 24 }}
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
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: "red",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
  },
});
