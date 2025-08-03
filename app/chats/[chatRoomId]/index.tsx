import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

// [수정 1] 자동 생성 타입 대신 필요한 타입을 직접 정의합니다.
interface ChatMessage {
  id: number;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatRoomScreen() {
  // 1. 라우터 파라미터에서 채팅방 ID와 상대 그룹 이름을 가져옵니다.
  const { chatRoomId, otherGroupName } = useLocalSearchParams<{
    chatRoomId: string;
    otherGroupName: string;
  }>();
  
  console.log('[ChatRoomScreen] Loaded with params:', { chatRoomId, otherGroupName });
  const { session } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gifted Chat 메시지 형식으로 변환하는 함수
  const formatMessage = (message: ChatMessage): IMessage => ({
    _id: message.id,
    text: message.content,
    createdAt: new Date(message.created_at),
    user: {
      _id: message.sender_id,
      // 이름이나 아바타가 필요하면 여기서 추가로 설정할 수 있습니다.
      // name: 'User Name',
      // avatar: 'https://...
    },
  });

  // 2. 과거 메시지 불러오기
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatRoomId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", chatRoomId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formattedMessages = data.map(formatMessage);
        setMessages(formattedMessages);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [chatRoomId]);

  // 3. 실시간 메시지 구독 설정
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`chat_room:${chatRoomId}`)
      .on<ChatMessage>( // [수정 2] 직접 정의한 타입을 사용합니다.
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const newMessage = formatMessage(payload.new as ChatMessage); // 타입 단언 추가
          // 내가 보낸 메시지가 중복으로 표시되지 않도록 확인
          if (messages.findIndex((msg) => msg._id === newMessage._id) === -1) {
            setMessages((previousMessages) =>
              GiftedChat.append(previousMessages, [newMessage])
            );
          }
        }
      )
      .subscribe();

    // 컴포넌트가 사라질 때 구독 해제
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, messages]);

  // 4. 메시지 전송 처리
  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!session?.user || !chatRoomId) return;

      const messageToSend = newMessages[0];
      const { text } = messageToSend;

      // 화면에 먼저 낙관적으로 업데이트
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages)
      );

      // Supabase에 메시지 저장
      const { error } = await supabase.from("chat_messages").insert({
        room_id: chatRoomId,
        content: text,
        sender_id: session.user.id,
      });

      if (error) {
        console.error("Failed to send message:", error);
        // 에러 발생 시 보냈던 메시지를 다시 지우는 등의 처리를 할 수 있습니다.
      }
    },
    [chatRoomId, session?.user]
  );

  return (
    <View style={styles.container}>
      {/* 헤더 제목을 상대 그룹 이름으로 설정 */}
      <Stack.Screen options={{ title: otherGroupName || "Chat" }} />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <GiftedChat
          messages={messages}
          onSend={(msgs) => onSend(msgs)}
          user={{
            _id: session?.user?.id || "",
          }}
          placeholder="메시지를 입력하세요..."
          messagesContainerStyle={styles.messagesContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    paddingBottom: 10,
  },
});
