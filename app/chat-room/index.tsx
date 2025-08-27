import React, { useState, useEffect, useRef } from "react";
import { TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import styled from "@emotion/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ChatRoomProfile } from "@/components/chat/ChatRoomProfile";

interface ChatMessage {
  message_id: number;
  sender_id: string;
  sender_name: string;
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
  
  console.log('💬 [ChatRoomScreen] Chat room entered with ID:', chatRoomId);
  
  const [chatRoomData, setChatRoomData] = useState<ChatRoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'profile'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch chat room details and messages
  useEffect(() => {
    const fetchChatRoomData = async () => {
      if (!chatRoomId) return;
      
      try {
        console.log('📡 [ChatRoomScreen] Fetching chat room data...');
        
        // Get chat room data from enhanced get_my_matches RPC
        const { data: matchData, error: matchError } = await supabase.rpc('get_my_matches_enhanced');
        
        if (matchError) throw matchError;
        
        // Find the specific chat room
        const roomData = matchData?.find((match: any) => match.chat_room_id === chatRoomId);
        
        if (roomData) {
          console.log('✅ [ChatRoomScreen] Chat room data found:', roomData);
          setChatRoomData({
            chat_room_id: roomData.chat_room_id,
            other_group_name: roomData.other_group_name,
            my_group_name: roomData.my_group_name,
            match_id: roomData.match_id
          });
          
          // Load chat messages
          await loadMessages();
          
          // Mark messages as read
          await markMessagesAsRead();
        } else {
          console.log('❌ [ChatRoomScreen] Chat room not found in matches');
        }
      } catch (err) {
        console.error('❌ [ChatRoomScreen] Failed to fetch chat room data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatRoomData();
  }, [chatRoomId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!chatRoomId || !chatRoomData) return;

    console.log('🔴 [ChatRoomScreen] Setting up real-time subscription for room:', chatRoomId);

    // Create channel for this specific chat room
    const channel = supabase
      .channel(`chat-room-${chatRoomId}`)
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          console.log('⌨️ [ChatRoomScreen] Typing event:', payload);
          if (payload.payload.isTyping) {
            setOtherUserTyping(true);
            // Clear typing after 3 seconds
            setTimeout(() => setOtherUserTyping(false), 3000);
          } else {
            setOtherUserTyping(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${chatRoomId}`,
        },
        async (payload) => {
          console.log('📨 [ChatRoomScreen] New message received:', payload);
          
          // Get current user to determine if message is own
          const { data: { user } } = await supabase.auth.getUser();
          
          // Add the new message to the list
          const newMsg = payload.new as any;
          const isOwnMessage = user?.id === newMsg.sender_id;
          
          // Get sender name (could be cached or fetched)
          let senderName = 'Unknown';
          if (isOwnMessage) {
            senderName = chatRoomData?.my_group_name || 'You';
          } else {
            senderName = chatRoomData?.other_group_name || 'Other';
          }
          
          const formattedMessage: ChatMessage = {
            message_id: newMsg.id,
            sender_id: newMsg.sender_id,
            sender_name: senderName,
            content: newMsg.content,
            message_type: newMsg.message_type || 'text',
            created_at: newMsg.created_at,
            edited_at: newMsg.edited_at,
            reply_to_id: newMsg.reply_to_id,
            reply_to_content: null,
            is_own: isOwnMessage,
            read_by_count: 0
          };

          // Only add if not a duplicate (avoid adding our own optimistic messages)
          setMessages(prevMessages => {
            const isDuplicate = prevMessages.some(msg => msg.message_id === newMsg.id);
            if (isDuplicate) {
              console.log('📨 [ChatRoomScreen] Duplicate message, skipping:', newMsg.id);
              return prevMessages;
            }
            return [...prevMessages, formattedMessage];
          });

          // Auto scroll to bottom for new messages
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          // Mark messages as read if not own message
          if (!isOwnMessage) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 [ChatRoomScreen] Subscription status:', status);
      });

    setRealtimeChannel(channel);

    // Cleanup subscription on unmount
    return () => {
      console.log('🔴 [ChatRoomScreen] Cleaning up real-time subscription');
      channel.unsubscribe();
    };
  }, [chatRoomId, chatRoomData]);

  // Load messages from database
  const loadMessages = async () => {
    if (!chatRoomId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_chat_messages', {
        p_room_id: chatRoomId,
        p_limit: 50,
        p_offset: 0
      });
      
      if (error) throw error;
      
      console.log('✅ [ChatRoomScreen] Messages loaded:', data?.length || 0);
      // Reverse the array since database returns newest first, but we want oldest first for proper chat flow
      setMessages(data ? [...data].reverse() : []);
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to load messages:', err);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!chatRoomId) return;
    
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_room_id: chatRoomId
      });
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to mark messages as read:', err);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Fetch profile data for the chat room
  const fetchProfileData = async () => {
    if (!chatRoomId || profileData) return; // Don't fetch if already loaded
    
    setProfileLoading(true);
    try {
      console.log('📊 [ChatRoomScreen] Fetching profile data for room:', chatRoomId);
      
      const { data, error } = await supabase.rpc('get_chat_room_members', {
        p_chat_room_id: chatRoomId
      });
      
      if (error) throw error;
      
      console.log('✅ [ChatRoomScreen] Profile data loaded:', data);
      setProfileData(data);
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to fetch profile data:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping: boolean) => {
    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping, userId: 'current-user' }
      });
    }
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
    
    // Get current user ID for optimistic update
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSendingMessage(false);
      return;
    }

    // Optimistic update - add message immediately to UI
    const optimisticMessage: ChatMessage = {
      message_id: tempMessageId,
      sender_id: user.id,
      sender_name: chatRoomData?.my_group_name || 'You',
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
      
      console.log('✅ [ChatRoomScreen] Message sent successfully:', data);
      
      // Remove optimistic message and let real-time subscription add the real one
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.message_id !== tempMessageId)
      );
      
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

  // Keyboard listeners for manual height tracking
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
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
                    keyExtractor={(item) => item.message_id.toString()}
                    renderItem={({ item, index }) => {
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                      
                      // Check if this message should show profile/name (first in group)
                      const isFirstInGroup = !prevMessage || 
                        prevMessage.sender_id !== item.sender_id || 
                        new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !== 
                        new Date(prevMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      // Check if this message should show timestamp (last in group)
                      const isLastInGroup = !nextMessage || 
                        nextMessage.sender_id !== item.sender_id || 
                        new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !== 
                        new Date(nextMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <MessageContainer isOwn={item.is_own} isGrouped={!isFirstInGroup}>
                          {!item.is_own && isFirstInGroup && (
                            <MessageHeader>
                              <SenderName>{item.sender_name}</SenderName>
                            </MessageHeader>
                          )}
                          <MessageRow isOwn={item.is_own} isGrouped={!isFirstInGroup}>
                            {!item.is_own && isFirstInGroup && (
                              <UserAvatar>
                                <AvatarText>{item.sender_name?.charAt(0) || 'U'}</AvatarText>
                              </UserAvatar>
                            )}
                            {item.is_own && isLastInGroup && (
                              <MessageTime isOwn={item.is_own}>
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </MessageTime>
                            )}
                            <MessageBubble isOwn={item.is_own}>
                              <MessageContent>
                                <MessageText isOwn={item.is_own}>{item.content}</MessageText>
                              </MessageContent>
                            </MessageBubble>
                            {!item.is_own && isLastInGroup && (
                              <MessageTime isOwn={item.is_own}>
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </MessageTime>
                            )}
                          </MessageRow>
                        </MessageContainer>
                      );
                    }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                      paddingBottom: 20, 
                      flexGrow: 1, 
                      justifyContent: messages.length > 0 ? 'flex-end' : 'center'
                    }}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    automaticallyAdjustKeyboardInsets={false}
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
                    blurOnSubmit={false}
                    textAlignVertical="top"
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
  padding-horizontal: 16px;
`;

const MessageContainer = styled.View<{ isOwn: boolean; isGrouped?: boolean }>`
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  margin-vertical: ${props => props.isGrouped ? '1px' : '4px'};
  margin-horizontal: 8px;
  max-width: 65%;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
`;

const MessageHeader = styled.View`
  margin-bottom: 2px;
  margin-left: 53px;
`;

const UserAvatar = styled.View`
  width: 45px;
  height: 45px;
  border-radius: 22.5px;
  background-color: #cee3ff;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const AvatarText = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: #000;
  font-family: Quicksand-SemiBold;
`;

const SenderName = styled.Text`
  font-size: 17px;
  color: #000;
  font-family: Quicksand-Regular;
`;

const MessageRow = styled.View<{ isOwn: boolean; isGrouped?: boolean }>`
  flex-direction: row;
  align-items: flex-end;
  margin-left: ${props => props.isOwn ? '0px' : (props.isGrouped ? '53px' : '0px')};
`;

const MessageBubble = styled.View<{ isOwn: boolean }>`
  background-color: ${props => props.isOwn ? '#fff1c5' : '#cee3ff'};
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
  border-bottom-left-radius: ${props => props.isOwn ? '30px' : '0px'};
  border-bottom-right-radius: ${props => props.isOwn ? '0px' : '30px'};
  padding-horizontal: ${props => props.isOwn ? '15px' : '10px'};
  padding-vertical: ${props => props.isOwn ? '6px' : '11px'};
  min-height: 39px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.1;
  shadow-radius: 2px;
  elevation: 2;
`;

const MessageContent = styled.View`
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
`;

const MessageText = styled.Text<{ isOwn: boolean }>`
  font-size: 16px;
  font-weight: 500;
  font-family: Quicksand-Medium;
  color: #000000;
  text-align: left;
  line-height: 20px;
`;

const MessageTime = styled.Text<{ isOwn: boolean }>`
  font-size: 11px;
  color: #666;
  margin-left: ${props => props.isOwn ? '0px' : '8px'};
  margin-right: ${props => props.isOwn ? '8px' : '0px'};
  margin-bottom: 2px;
  font-family: Quicksand-Medium;
  align-self: flex-end;
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