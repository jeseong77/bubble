import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ChatRoomScreen() {
  console.log('🚀 [ChatRoomScreen] Component mounted!');
  
  const params = useLocalSearchParams();
  const { chatRoomId } = params;
  
  console.log('💬 [ChatRoomScreen] Chat room entered with ID:', chatRoomId);
  console.log('📋 [ChatRoomScreen] All params received:', params);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Chat Room Screen</Text>
      <Text style={styles.text}>Chat Room ID: {chatRoomId || 'No ID received'}</Text>
      <Text style={styles.text}>All Params: {JSON.stringify(params, null, 2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
});

// Commented out full implementation - causes navigation to fail
/*
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: number;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatRoomScreen() {
  console.log('🚀 [ChatRoomScreen] Component mounted!');
  
  // Get chat room ID from params
  const { chatRoomId } = useLocalSearchParams<{
    chatRoomId: string;
  }>();
  
  console.log('💬 [ChatRoomScreen] Chat room entered with ID:', chatRoomId);
  console.log('📋 [ChatRoomScreen] All params received:', useLocalSearchParams());
  
  const { session } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert to Gifted Chat message format
  const formatMessage = (message: ChatMessage): IMessage => ({
    _id: message.id,
    text: message.content,
    createdAt: new Date(message.created_at),
    user: {
      _id: message.sender_id,
    },
  });

  // Fetch past messages
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

  // Real-time message subscription
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`chat_room:${chatRoomId}`)
      .on<ChatMessage>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const newMessage = formatMessage(payload.new as ChatMessage);
          // Prevent duplicate messages
          if (messages.findIndex((msg) => msg._id === newMessage._id) === -1) {
            setMessages((previousMessages) =>
              GiftedChat.append(previousMessages, [newMessage])
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, messages]);

  // Send message handler
  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!session?.user || !chatRoomId) return;

      const messageToSend = newMessages[0];
      const { text } = messageToSend;

      // Optimistic update
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages)
      );

      // Save to Supabase
      const { error } = await supabase.from("chat_messages").insert({
        room_id: chatRoomId,
        content: text,
        sender_id: session.user.id,
      });

      if (error) {
        console.error("Failed to send message:", error);
      }
    },
    [chatRoomId, session?.user]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Chat" }} />
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
*/