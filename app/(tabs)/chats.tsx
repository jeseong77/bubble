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
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { ChatItem, MatchData } from "@/components/chat/ChatItem";

export default function MessageListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          console.log('🔍 [ChatsScreen] Fetching matches...');
          
          // Debug: Check current user
          const { data: { user } } = await supabase.auth.getUser();
          console.log('👤 [ChatsScreen] Current user:', user?.id);
          
          // Debug: Check user's groups
          const { data: userGroups, error: groupError } = await supabase
            .from('group_members')
            .select('*, groups(name)')
            .eq('user_id', user?.id);
          console.log('👥 [ChatsScreen] User groups:', userGroups);
          
          // Debug: Try both functions
          console.log('🔧 [ChatsScreen] Testing debug function first...');
          const { data: debugData, error: debugError } = await supabase.rpc(
            "get_my_matches_debug",
            { p_debug_user_id: user?.id }
          );
          console.log('🔧 [ChatsScreen] Debug RPC result:', { debugData, debugError });
          
          // get_my_matches_enhanced RPC를 호출하여 채팅 목록 데이터를 가져옵니다.
          const { data, error: rpcError } = await supabase.rpc(
            "get_my_matches_enhanced"
          );

          console.log('📊 [ChatsScreen] Enhanced RPC result:', { data, error: rpcError });
          
          // Use debug data if available, otherwise use regular data
          const finalData = debugData && debugData.length > 0 ? debugData : data;

          if (rpcError) {
            throw rpcError;
          }

          setMatches(finalData || []);
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBackground} />
          <Text style={styles.headerTitle}>Bubble Chats</Text>
        </View>
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyText}>You don't have any chats yet.</Text>
          <Text style={styles.emptySubText}>
            Match a bubble to start a conversation!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 메인 컨텐츠
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <Text style={styles.headerTitle}>Bubble Chats</Text>
      </View>
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
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 115 }}
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
  // Header styles (matching Likes You)
  header: {
    width: "100%",
    position: "absolute",
    top: 59,
    height: 71,
    zIndex: 10,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 71,
    backgroundColor: "#fff",
    shadowColor: "#a6a6aa",
    shadowOffset: { width: 0, height: 0.33 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  headerTitle: {
    position: "absolute",
    top: 22,
    left: 21,
    fontSize: 32,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Quicksand",
    lineHeight: 32 * 1.193, // 119.3% line height
  },
});
