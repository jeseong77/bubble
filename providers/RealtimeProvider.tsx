import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useNetInfo } from "@react-native-community/netinfo";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useUIStore } from "@/stores/uiStore";
import { EventBus, emitNewMessage, emitNewInvitation, emitConnectionStatus, emitRefreshMessages, emitRefreshLikes, emitBubbleFormed } from "@/services/EventBus";

/**
 * `public.group_members` 테이블의 데이터 구조와 일치하는 타입
 */
export type GroupMember = {
  group_id: string;
  user_id: string;
  status: "invited" | "joined" | "declined";
  invited_at: string;
  joined_at: string | null;
  // 스키마에 따라 다른 필드가 있다면 추가 가능
};

/**
 * 실시간 연결 상태를 나타내는 타입
 */
export type RealtimeStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

type RealtimeContextType = {
  invitations: GroupMember[];
  connectionStatus: RealtimeStatus;
  clearInvitations: () => void;
  refreshNotifications: () => Promise<void>;
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export default function RealtimeProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const netInfo = useNetInfo();
  const { setUnreadLikesCount, setTotalUnreadMessages } = useUIStore();

  const [invitations, setInvitations] = useState<GroupMember[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeStatus>("DISCONNECTED");

  // Load existing pending invitations using RPC function
  const loadExistingInvitations = async (userId: string) => {
    try {
      console.log("[RealtimeProvider] 기존 초대 목록 로딩 시작...");

      // Use get_my_bubbles RPC to get all user's bubbles
      const { data, error } = await supabase.rpc("get_my_bubbles", {
        p_user_id: userId,
      });

      if (error) {
        console.error("[RealtimeProvider] 기존 초대 목록 로딩 실패:", error);
        return;
      }

      console.log("[RealtimeProvider] get_my_bubbles 응답:", data);
      
      if (data && data.length > 0) {
        // Filter only invited status bubbles
        const invitedBubbles = data.filter(
          (bubble: any) => bubble.user_status === "invited"
        );
        console.log(
          `[RealtimeProvider] 기존 초대 ${invitedBubbles.length}개 발견:`,
          invitedBubbles
        );

        // Convert to GroupMember format
        const existingInvitations: GroupMember[] = invitedBubbles.map(
          (bubble: any) => ({
            group_id: bubble.id,
            user_id: userId,
            status: bubble.user_status,
            invited_at: bubble.invited_at,
            joined_at: null,
          })
        );
        setInvitations(existingInvitations);
      } else {
        console.log("[RealtimeProvider] 기존 초대가 없습니다.");
        setInvitations([]);
      }
    } catch (error) {
      console.error("[RealtimeProvider] 기존 초대 목록 로딩 중 예외:", error);
    }
  };

  // Refresh incoming likes count
  const refreshLikesCount = async (userId: string) => {
    try {
      console.log("[RealtimeProvider] Refreshing likes count...");
      
      // Get user's active group
      const { data: activeBubbleData, error: activeBubbleError } =
        await supabase.rpc("get_user_active_bubble", {
          p_user_id: userId,
        });

      if (activeBubbleError || !activeBubbleData || activeBubbleData.length === 0) {
        console.log("[RealtimeProvider] No active bubble found for likes count");
        setUnreadLikesCount(0);
        return;
      }

      const activeBubble = activeBubbleData[0];
      if (activeBubble.status !== 'full') {
        console.log("[RealtimeProvider] Active bubble not full, no likes count");
        setUnreadLikesCount(0);
        return;
      }

      // Get incoming likes count
      const { data: likesData, error: likesError } = await supabase.rpc("get_incoming_likes", {
        p_group_id: activeBubble.id,
        p_limit: 50,
        p_offset: 0,
      });

      if (!likesError && likesData) {
        const likesCount = likesData.length;
        console.log(`[RealtimeProvider] Updated likes count: ${likesCount}`);
        setUnreadLikesCount(likesCount);
      } else {
        console.error("[RealtimeProvider] Error fetching likes count:", likesError);
        setUnreadLikesCount(0);
      }
    } catch (error) {
      console.error("[RealtimeProvider] Error refreshing likes count:", error);
      setUnreadLikesCount(0);
    }
  };

  // Refresh chat messages count
  const refreshMessagesCount = async (userId: string) => {
    try {
      console.log("[RealtimeProvider] Refreshing messages count...");
      
      const { data, error } = await supabase.rpc("get_my_matches_enhanced");

      if (error) {
        console.error("[RealtimeProvider] Error fetching matches:", error);
        setTotalUnreadMessages(0);
        return;
      }

      const matchesData = data || [];
      const totalUnread = matchesData.reduce((sum: number, match: any) => {
        return sum + (match.unread_count || 0);
      }, 0);
      
      console.log(`[RealtimeProvider] Updated messages count: ${totalUnread}`);
      setTotalUnreadMessages(totalUnread);
    } catch (error) {
      console.error("[RealtimeProvider] Error refreshing messages count:", error);
      setTotalUnreadMessages(0);
    }
  };

  // Global refresh function for all notifications
  const refreshNotifications = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    console.log("[RealtimeProvider] Refreshing all notifications...");
    await Promise.all([
      refreshLikesCount(userId),
      refreshMessagesCount(userId),
    ]);
  };

  useEffect(() => {
    // Supabase Realtime 채널을 저장할 변수
    let channel: RealtimeChannel | undefined;

    const setupChannel = () => {
      const userId = session?.user?.id;
      console.log(
        `[RealtimeProvider] setupChannel 호출 - userId: ${userId}, isInternetReachable: ${netInfo.isInternetReachable}`
      );

      // 로그인 상태가 아니거나 인터넷 연결이 안 되면 구독을 시도하지 않음
      if (!userId) {
        console.log("[RealtimeProvider] 사용자 ID가 없어 구독을 건너뜁니다.");
        return;
      }

      if (!netInfo.isInternetReachable) {
        console.log("[RealtimeProvider] 인터넷 연결이 없어 구독을 건너뜁니다.");
        return;
      }

      // Load existing invitations and notifications first using RPC
      loadExistingInvitations(userId);
      refreshNotifications();

      // 이미 채널이 있다면 중복 생성을 방지
      if (channel) {
        console.log(
          "[RealtimeProvider] 이미 채널이 존재하여 중복 생성을 방지합니다."
        );
        return;
      }

      console.log(`[RealtimeProvider] 사용자 ${userId}에 대한 구독 시도...`);
      setConnectionStatus("CONNECTING");
      
      // Emit connecting status to EventBus
      emitConnectionStatus('CONNECTING');

      try {
        channel = supabase.channel(`realtime_notifications:${userId}`);
        console.log(`[RealtimeProvider] 채널 생성됨: realtime_notifications:${userId}`);

        // Add debugging for subscription setup
        console.log("[RealtimeProvider] Setting up subscriptions...");
        
        channel
          .on<GroupMember>(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "group_members",
              filter: `user_id=eq.${userId} AND status=eq.invited`,
            },
            (payload) => {
              console.log("[RealtimeProvider] 새로운 초대 감지!", payload.new);
              setInvitations((prev) => [...prev, payload.new]);
              
              // Emit new invitation event to EventBus
              emitNewInvitation(
                payload.new.group_id,
                'New Group', // We'll need to fetch group name if needed
                'Unknown', // We'll need to fetch inviter info if needed
                'Someone'
              );
            }
          )
          .on<GroupMember>(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "group_members",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log("[RealtimeProvider] 초대 상태 변경 감지!", payload);
              // If status changed from 'invited' to something else, remove from invitations
              if (
                payload.old.status === "invited" &&
                payload.new.status !== "invited"
              ) {
                console.log(
                  "[RealtimeProvider] 초대가 accepted/declined되어 제거:",
                  payload.new.group_id
                );
                setInvitations((prev) =>
                  prev.filter((inv) => inv.group_id !== payload.new.group_id)
                );
              }
              // If status changed to 'invited', add to invitations
              else if (
                payload.old.status !== "invited" &&
                payload.new.status === "invited"
              ) {
                console.log(
                  "[RealtimeProvider] 새로운 초대로 추가:",
                  payload.new
                );
                setInvitations((prev) => [...prev, payload.new]);
              }
            }
          )
          .on<GroupMember>(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "group_members",
              filter: `user_id=eq.${userId} AND status=eq.invited`,
            },
            (payload) => {
              console.log("[RealtimeProvider] 초대 삭제 감지!", payload);
              setInvitations((prev) =>
                prev.filter((inv) => inv.group_id !== payload.old.group_id)
              );
            }
          )
          // Subscribe to likes table changes to refresh likes count
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "likes",
            },
            (payload) => {
              console.log("[RealtimeProvider] Likes table changed, refreshing count...", payload);
              refreshLikesCount(userId);
              
              // Emit refresh likes event to EventBus
              emitRefreshLikes();
            }
          )
          // Listen for broadcast messages as backup for postgres_changes
          .on("broadcast", { event: "new_message" }, (payload) => {
            console.log("[RealtimeProvider] 🔥 BROADCAST MESSAGE RECEIVED:", payload);
            
            if (payload.payload && payload.payload.room_id) {
              EventBus.emitEvent('NEW_MESSAGE', {
                chatRoomId: payload.payload.room_id,
                message: {
                  message_id: payload.payload.message_id,
                  sender_id: payload.payload.sender_id,
                  sender_name: payload.payload.sender_name || 'Unknown',
                  content: payload.payload.content,
                  message_type: payload.payload.message_type || 'text',
                  created_at: payload.payload.created_at,
                  is_own: payload.payload.sender_id === userId
                }
              });
            }
          })
          // Subscribe to chat_messages table changes to refresh message count
          .on(
            "postgres_changes", 
            {
              event: "INSERT",
              schema: "public",
              table: "chat_messages",
            },
            (payload) => {
              console.log("[RealtimeProvider] Chat messages changed:", {
                eventType: payload.eventType,
                table: payload.table,
                roomId: payload.new?.room_id,
                messageId: payload.new?.id,
                content: payload.new?.content
              });
              refreshMessagesCount(userId);
              
              // Emit refresh messages event to EventBus
              emitRefreshMessages();
              
              // If it's a new message, emit the new message event
              if (payload.eventType === 'INSERT' && payload.new) {
                console.log("[RealtimeProvider] 🚀 Emitting NEW_MESSAGE event:", {
                  chatRoomId: payload.new.room_id,
                  messageId: payload.new.id,
                  content: payload.new.content
                });
                // We'll emit a basic message event - chat screens can listen for this
                EventBus.emitEvent('NEW_MESSAGE', {
                  chatRoomId: payload.new.room_id,
                  message: {
                    message_id: payload.new.id,
                    sender_id: payload.new.sender_id,
                    sender_name: 'Unknown', // We'll need to resolve this
                    content: payload.new.content,
                    message_type: payload.new.message_type || 'text',
                    created_at: payload.new.created_at,
                    is_own: payload.new.sender_id === userId
                  }
                });
              }
            }
          )
          // Subscribe to matches table changes to refresh both counts
          .on(
            "postgres_changes",
            {
              event: "*", 
              schema: "public",
              table: "matches",
            },
            (payload) => {
              console.log("[RealtimeProvider] Matches table changed, refreshing counts...", payload);
              refreshNotifications();
              
              // If it's a new match, emit the new match event
              if (payload.eventType === 'INSERT' && payload.new) {
                EventBus.emitEvent('NEW_MATCH', {
                  matchId: payload.new.id,
                  chatRoomId: payload.new.chat_room_id,
                  groupName: 'Matched Group' // We'll need to resolve this
                });
              }
            }
          )
          // Subscribe to groups table changes to detect bubble formation
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public", 
              table: "groups",
            },
            async (payload) => {
              console.log("[RealtimeProvider] Groups table changed, checking for bubble formation...", payload);
              
              // Check if status changed from 'forming' to 'full'
              if (payload.old.status === 'forming' && payload.new.status === 'full') {
                console.log("[RealtimeProvider] 🎉 Bubble formed! Group:", payload.new.id);
                
                try {
                  // First check if current user is a member of this group
                  const { data: memberCheck, error: memberError } = await supabase
                    .from('group_members')
                    .select('*')
                    .eq('group_id', payload.new.id)
                    .eq('user_id', userId)
                    .single();
                    
                  if (memberError || !memberCheck) {
                    // User is not a member, ignore this event
                    return;
                  }
                  
                  // User is a member, fetch group details and all members
                  const { data: groupDetails, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', payload.new.id)
                    .single();
                    
                  const { data: membersData, error: membersError } = await supabase
                    .from('group_members')
                    .select(`
                      user_id,
                      users!inner (
                        id,
                        name,
                        profile_image_url
                      )
                    `)
                    .eq('group_id', payload.new.id)
                    .eq('status', 'joined');
                    
                  if (groupError || membersError || !groupDetails || !membersData) {
                    console.error("[RealtimeProvider] Error fetching group/members:", groupError, membersError);
                    return;
                  }
                  
                  // Format members for the announcement
                  const members = membersData.map((item: any) => ({
                    id: item.user_id,
                    name: item.users?.name || `User ${item.user_id.slice(0, 8)}`,
                    imageUrl: item.users?.profile_image_url
                  }));
                  
                  console.log("[RealtimeProvider] Emitting bubble formed event:", {
                    groupId: groupDetails.id,
                    groupName: groupDetails.name || 'New Bubble',
                    members: members
                  });
                  
                  // Emit the bubble formed event
                  emitBubbleFormed(
                    groupDetails.id,
                    groupDetails.name || 'New Bubble',
                    members
                  );
                } catch (error) {
                  console.error("[RealtimeProvider] Error handling bubble formation:", error);
                }
              }
            }
          )
          .subscribe((status, err) => {
            console.log(`[RealtimeProvider] 구독 상태 변경: ${status}`);

            if (status === "SUBSCRIBED") {
              console.log("[RealtimeProvider] 실시간 채널 구독 성공!");
              setConnectionStatus("CONNECTED");
              
              // Emit connection status to EventBus
              emitConnectionStatus('CONNECTED');
            }
            if (status === "CHANNEL_ERROR") {
              const errorMessage = err?.message || 'Unknown channel error';
              const errorName = err?.name || 'ChannelError';
              const errorStack = err?.stack || 'No stack trace available';
              
              console.error("[RealtimeProvider] 채널 에러:", errorMessage);
              console.error("[RealtimeProvider] 에러 상세:", {
                message: errorMessage,
                name: errorName,
                stack: errorStack,
                originalError: err
              });
              
              // Emit connection status to EventBus
              emitConnectionStatus('ERROR', errorMessage);
              setConnectionStatus("DISCONNECTED");
            }
            if (status === "TIMED_OUT") {
              console.warn("[RealtimeProvider] 연결 시간 초과");
              setConnectionStatus("DISCONNECTED");
              
              // Emit connection status to EventBus
              emitConnectionStatus('DISCONNECTED', 'Connection timed out');
            }
            if (status === "CLOSED") {
              console.log("[RealtimeProvider] 채널이 닫힘");
              setConnectionStatus("DISCONNECTED");
              
              // Emit connection status to EventBus
              emitConnectionStatus('DISCONNECTED', 'Channel closed');
            }
          });
      } catch (error) {
        console.error("[RealtimeProvider] 채널 설정 중 예외 발생:", error);
        setConnectionStatus("DISCONNECTED");
      }
    };

    const removeChannel = () => {
      if (channel) {
        console.log("[RealtimeProvider] 채널 구독 해제 시도...");
        console.log(`[RealtimeProvider] 해제할 채널: ${channel.topic}`);

        try {
          supabase.removeChannel(channel);
          console.log("[RealtimeProvider] 채널 구독 해제 완료");
          channel = undefined;
          setConnectionStatus("DISCONNECTED");
        } catch (error) {
          console.error("[RealtimeProvider] 채널 해제 중 에러:", error);
          channel = undefined;
          setConnectionStatus("DISCONNECTED");
        }
      } else {
        console.log("[RealtimeProvider] 해제할 채널이 없습니다.");
      }
    };

    // 인터넷이 연결되거나, 세션이 변경될 때 채널 설정 시도
    setupChannel();

    // 앱의 상태(활성/비활성) 변경을 감지하는 리스너
    // 앱이 다시 활성화될 때 연결을 재시도하는 역할을 보강합니다.
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        console.log(`[RealtimeProvider] 앱 상태 변경: ${nextAppState}`);

        if (nextAppState === "active") {
          console.log("[RealtimeProvider] 앱 활성화 감지, 연결 재시도 및 알림 새로고침.");
          // Supabase 클라이언트가 자동으로 재연결을 시도하므로,
          // 수동으로 재구독할 필요 없이 상태만 확인합니다.
          setupChannel();
          // Refresh notifications when app comes to foreground
          refreshNotifications();
        } else if (nextAppState === "background") {
          console.log("[RealtimeProvider] 앱이 백그라운드로 이동");
          // 백그라운드에서는 연결을 유지하거나 끊을 수 있습니다.
          // 현재는 연결을 유지하도록 설정
        } else if (nextAppState === "inactive") {
          console.log("[RealtimeProvider] 앱이 비활성화됨");
        }
      }
    );

    // useEffect의 cleanup 함수: 컴포넌트가 사라지거나 의존성이 변경될 때 호출
    return () => {
      console.log("[RealtimeProvider] Cleanup effect 시작...");
      console.log(`[RealtimeProvider] 현재 연결 상태: ${connectionStatus}`);
      console.log(
        `[RealtimeProvider] 세션 상태: ${session ? "로그인됨" : "로그아웃됨"}`
      );

      appStateSubscription.remove();
      removeChannel();

      console.log("[RealtimeProvider] Cleanup effect 완료");
    };
  }, [session, netInfo.isInternetReachable]); // 세션 또는 인터넷 연결 상태가 변경될 때마다 이 effect가 재실행됩니다.

  const value = {
    invitations,
    connectionStatus,
    clearInvitations: () => setInvitations([]),
    refreshNotifications,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};
