import React, { useState, useEffect, useRef } from "react";
import { FlatList, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import styled from "@emotion/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { ChatRoomProfile } from "@/components/chat/ChatRoomProfile";
import { ChatMessageItem } from "@/components/chat/ChatMessageItem";
import { useChatRoomData } from "@/hooks/useChatRoomData";
import { EventBus } from "@/services/EventBus";

interface ChatMessage {
  message_id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar_url?: string;
  content: string;
  message_type: string;
  created_at: string;
  edited_at?: string;
  reply_to_id?: number;
  reply_to_content?: string;
  is_own: boolean;
  read_by_count: number;
}

interface ChatRoomData {
  chat_room_id: string;
  other_group_name: string;
  my_group_name: string;
  match_id: string;
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { chatRoomId } = params;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Use chat room data hook
  const {
    chatRoomData,
    isLoading,
    messages,
    setMessages,
    profileData,
    profileLoading,
    loadMessages,
    markMessagesAsRead,
    fetchProfileData,
  } = useChatRoomData({
    chatRoomId,
    onMessageReceived: () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'profile'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);


  const handleBack = () => {
    router.back();
  };

  const handleUserPress = (senderId: string) => {
    router.push(`/bubble/user/${senderId}`);
  };


  // Send typing indicator - we'll implement this later with EventBus if needed
  const sendTypingIndicator = (isTyping: boolean) => {
    // TODO: Implement typing indicators through EventBus if needed
  };

  // Handle input text changes with typing indicators
  const handleInputChange = (text: string) => {
    setNewMessage(text);
    
    // Send typing indicator when user starts typing
    if (text.length > 0 && !typingTimeout) {
      sendTypingIndicator(true);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      sendTypingIndicator(false);
      setTypingTimeout(null);
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  // Send message to database with optimistic updates
  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId || sendingMessage) return;
    
    setSendingMessage(true);
    const messageText = newMessage.trim();
    const tempMessageId = Date.now(); // Temporary ID for optimistic update
    
    // Get current user ID and name for optimistic update
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSendingMessage(false);
      return;
    }

    // Get current user's actual name
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, avatar_url')
      .eq('id', user.id)
      .single();

    const actualUserName = userData?.first_name || 'You';

    // Optimistic update - add message immediately to UI
    const optimisticMessage: ChatMessage = {
      message_id: tempMessageId,
      sender_id: user.id,
      sender_name: actualUserName,
      sender_avatar_url: userData?.avatar_url,
      content: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      edited_at: undefined,
      reply_to_id: undefined,
      reply_to_content: undefined,
      is_own: true,
      read_by_count: 0
    };

    // Add optimistic message to end of list
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessage(''); // Clear input immediately for better UX
    
    // Auto scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const { data, error } = await supabase.rpc('send_message', {
        p_room_id: chatRoomId,
        p_content: messageText,
        p_message_type: 'text'
      });
      
      if (error) throw error;

      // Update optimistic message with real message ID if available
      if (data && data.message_id) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.message_id === tempMessageId 
              ? { ...msg, message_id: data.message_id }
              : msg
          )
        );
      }
      
      // Broadcast message to chat room channel for real-time updates
      try {
        const broadcastChannel = supabase.channel(`chat_room:${chatRoomId}`);
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            room_id: chatRoomId,
            message_id: data?.message_id || tempMessageId,
            sender_id: user.id,
            sender_name: actualUserName,
            sender_avatar_url: userData?.avatar_url,
            content: messageText,
            message_type: 'text',
            created_at: new Date().toISOString()
          }
        });
      } catch (broadcastError) {
        console.warn('⚠️ [ChatRoomScreen] Broadcast failed:', broadcastError);
      }
      
      // Keep optimistic message - don't remove it
      
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to send message:', err);
      
      // Remove failed optimistic message and restore input text
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.message_id !== tempMessageId)
      );
      setNewMessage(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Keyboard listeners for manual height tracking with auto-scroll
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        
        // Auto scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        
        // Auto scroll to bottom when keyboard hides
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fetch profile data when profile tab becomes active
  useEffect(() => {
    if (activeTab === 'profile' && chatRoomId && !profileData) {
      fetchProfileData();
    }
  }, [activeTab, chatRoomId]);


  return (
    <Container>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <Header>
        <TouchableOpacity style={{ padding: 4, marginRight: 8 }} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <HeaderCenter>
          <HeaderTitle numberOfLines={1}>
            {chatRoomData?.my_group_name && chatRoomData?.other_group_name 
              ? `${chatRoomData.my_group_name} x ${chatRoomData.other_group_name}`
              : chatRoomData?.other_group_name || 'Chat'
            }
          </HeaderTitle>
        </HeaderCenter>
        
        <HeaderRight />
      </Header>
      
      {/* Tab Navigation */}
      <TabContainer>
        <TabButton 
          isActive={activeTab === 'chat'} 
          onPress={() => setActiveTab('chat')}
        >
          <TabText isActive={activeTab === 'chat'}>Chat</TabText>
          {activeTab === 'chat' && <TabIndicator />}
        </TabButton>
        
        <TabButton 
          isActive={activeTab === 'profile'} 
          onPress={() => setActiveTab('profile')}
        >
          <TabText isActive={activeTab === 'profile'}>Profile</TabText>
          {activeTab === 'profile' && <TabIndicator />}
        </TabButton>
      </TabContainer>
      
      {/* Content Area */}
      <ContentArea>
        {activeTab === 'chat' ? (
          <ChatKeyboardContainer style={{ paddingBottom: Platform.OS === 'ios' ? keyboardHeight - insets.bottom : 0 }}>
            {isLoading ? (
              <LoadingContainer>
                <LoadingText>Loading chat...</LoadingText>
              </LoadingContainer>
            ) : (
              <ChatInnerContainer>
                <MessagesContainer>
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => `${item.message_id}-${index}`}
                    renderItem={({ item, index }) => (
                      <ChatMessageItem
                        message={item}
                        prevMessage={index > 0 ? messages[index - 1] : null}
                        nextMessage={index < messages.length - 1 ? messages[index + 1] : null}
                        onUserPress={handleUserPress}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                      paddingBottom: 20, 
                      flexGrow: 1, 
                      justifyContent: messages.length > 0 ? 'flex-end' : 'center'
                    }}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                      // Auto scroll when content size changes (new messages)
                      setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                    automaticallyAdjustKeyboardInsets={false}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10
                    }}
                    onLayout={() => {
                      // Auto scroll to bottom when FlatList first renders
                      setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: false });
                      }, 100);
                    }}
                    ListHeaderComponent={
                      otherUserTyping ? (
                        <TypingIndicator>
                          <TypingText>{chatRoomData?.other_group_name || 'Other'} is typing...</TypingText>
                        </TypingIndicator>
                      ) : null
                    }
                  />
                </MessagesContainer>
                <InputContainer style={{ 
                  marginBottom: Platform.OS === 'android' ? keyboardHeight : 0 
                }}>
                  <MessageInput
                    value={newMessage}
                    onChangeText={handleInputChange}
                    placeholder="Type a message..."
                    multiline
                    maxLength={1000}
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                    textAlignVertical="top"
                    onFocus={() => {
                      // Auto scroll to bottom when input is focused
                      setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                      }, 300); // Longer delay to account for keyboard animation
                    }}
                  />
                  <SendButton 
                    onPress={sendMessage} 
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color={newMessage.trim() && !sendingMessage ? "#007AFF" : "#ccc"} 
                    />
                  </SendButton>
                </InputContainer>
              </ChatInnerContainer>
            )}
          </ChatKeyboardContainer>
        ) : (
          <ChatRoomProfile 
            data={profileData} 
            isLoading={profileLoading} 
          />
        )}
      </ContentArea>
    </Container>
  );
}

// Styled Components with emotion/native
const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #fff;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
  padding-vertical: 12px;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
  background-color: #fff;
`;

const HeaderCenter = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const HeaderTitle = styled.Text`
  font-size: 20px;
  font-weight: 600;
  font-family: Quicksand-SemiBold;
  color: #000;
  text-align: center;
  flex: 1;
`;

const HeaderRight = styled.View`
  width: 24px;
`;

const TabContainer = styled.View`
  flex-direction: row;
  background-color: #fff;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
`;

const TabButton = styled.TouchableOpacity<{ isActive: boolean }>`
  flex: 1;
  padding-vertical: 16px;
  align-items: center;
  position: relative;
`;

const TabText = styled.Text<{ isActive: boolean }>`
  font-size: 16px;
  font-weight: ${props => props.isActive ? '600' : '400'};
  color: ${props => props.isActive ? '#000' : '#666'};
  font-family: Quicksand-SemiBold;
`;

const TabIndicator = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #007AFF;
`;

const ContentArea = styled.View`
  flex: 1;
`;

const ChatKeyboardContainer = styled.View`
  flex: 1;
  background-color: #f5f5f5;
`;

const ChatInnerContainer = styled.View`
  flex: 1;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding-horizontal: 20px;
  background-color: #f5f5f5;
`;

const LoadingText = styled.Text`
  font-size: 16px;
  color: #7A7A7A;
  font-family: Quicksand-Medium;
`;

const MessagesContainer = styled.View`
  flex: 1;
  padding-horizontal: 8px;
`;

const InputContainer = styled.View`
  flex-direction: row;
  align-items: flex-end;
  padding: 12px 16px;
  background-color: #fff;
  border-top-width: 1px;
  border-top-color: #e0e0e0;
  min-height: 64px;
`;

const MessageInput = styled.TextInput`
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding-horizontal: 16px;
  padding-vertical: 12px;
  font-size: 16px;
  max-height: 100px;
  min-height: 40px;
  margin-right: 8px;
  background-color: #f8f8f8;
`;

const SendButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
`;

const TypingIndicator = styled.View`
  padding: 8px 16px;
  margin-bottom: 8px;
`;

const TypingText = styled.Text`
  font-size: 14px;
  color: #666;
  font-style: italic;
`;