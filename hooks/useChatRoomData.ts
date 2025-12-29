import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EventBus } from '@/services/EventBus';

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

interface UseChatRoomDataParams {
  chatRoomId: string | string[] | undefined;
  onMessageReceived?: () => void;
}

interface UseChatRoomDataReturn {
  chatRoomData: ChatRoomData | null;
  isLoading: boolean;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  profileData: any;
  profileLoading: boolean;
  loadMessages: () => Promise<void>;
  markMessagesAsRead: () => Promise<void>;
  fetchProfileData: () => Promise<void>;
}

export function useChatRoomData({
  chatRoomId,
  onMessageReceived,
}: UseChatRoomDataParams): UseChatRoomDataReturn {
  const [chatRoomData, setChatRoomData] = useState<ChatRoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load messages from database
  const loadMessages = useCallback(async () => {
    if (!chatRoomId) return;

    try {
      const { data, error } = await supabase.rpc('get_chat_messages', {
        p_room_id: chatRoomId,
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;

      // Remove duplicates and reverse the array
      if (data) {
        const uniqueMessages = data.filter((message, index, self) =>
          index === self.findIndex(m => m.message_id === message.message_id)
        );
        setMessages([...uniqueMessages].reverse());
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to load messages:', err);
    }
  }, [chatRoomId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!chatRoomId) return;

    try {
      await supabase.rpc('mark_messages_as_read', {
        p_room_id: chatRoomId
      });

      // Trigger event to refresh chat list unread counts
      EventBus.emitEvent('REFRESH_MESSAGES_COUNT', {});
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to mark messages as read:', err);
    }
  }, [chatRoomId]);

  // Fetch profile data for the chat room
  const fetchProfileData = useCallback(async () => {
    if (!chatRoomId || profileData) return; // Don't fetch if already loaded

    setProfileLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_chat_room_members', {
        p_chat_room_id: chatRoomId
      });

      if (error) throw error;

      setProfileData(data);
    } catch (err) {
      console.error('❌ [ChatRoomScreen] Failed to fetch profile data:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [chatRoomId, profileData]);

  // Fetch chat room details and messages
  useEffect(() => {
    const fetchChatRoomData = async () => {
      if (!chatRoomId) return;

      try {
        // Get chat room data from enhanced get_my_matches RPC
        const { data: matchData, error: matchError } = await supabase.rpc('get_my_matches_enhanced');

        if (matchError) throw matchError;

        // Find the specific chat room
        const roomData = matchData?.find((match: any) => match.chat_room_id === chatRoomId);

        if (roomData) {
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
        }
      } catch (err) {
        console.error('❌ [ChatRoomScreen] Failed to fetch chat room data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatRoomData();
  }, [chatRoomId, loadMessages, markMessagesAsRead]);

  // Set up real-time message subscription
  useEffect(() => {
    if (!chatRoomId || !chatRoomData) return;

    // Subscribe to chat room broadcast channel directly
    const broadcastChannel = supabase.channel(`chat_room:${chatRoomId}`);

    broadcastChannel.on('broadcast', { event: 'new_message' }, async (payload) => {
      if (payload.payload && payload.payload.room_id === chatRoomId) {
        const message = payload.payload;

        // Get current user to properly determine if message is own
        const { data: { user } } = await supabase.auth.getUser();

        const formattedMessage: ChatMessage = {
          message_id: message.message_id,
          sender_id: message.sender_id,
          sender_name: message.sender_name,
          sender_avatar_url: message.sender_avatar_url,
          content: message.content,
          message_type: message.message_type,
          created_at: message.created_at,
          is_own: user?.id === message.sender_id,
          read_by_count: 0
        };

        // Add message if not duplicate
        setMessages(prevMessages => {
          const isDuplicate = prevMessages.some(msg =>
            msg.message_id === message.message_id ||
            (msg.content === message.content &&
             Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
          );
          if (isDuplicate) {
            return prevMessages;
          }
          return [...prevMessages, formattedMessage];
        });

        // Trigger callback for auto-scroll
        onMessageReceived?.();
      }
    });

    broadcastChannel.subscribe();

    // Cleanup broadcast channel on unmount
    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [chatRoomId, chatRoomData, onMessageReceived]);

  return {
    chatRoomData,
    isLoading,
    messages,
    setMessages,
    profileData,
    profileLoading,
    loadMessages,
    markMessagesAsRead,
    fetchProfileData,
  };
}
