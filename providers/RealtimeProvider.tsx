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
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export default function RealtimeProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const netInfo = useNetInfo();

  const [invitations, setInvitations] = useState<GroupMember[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeStatus>("DISCONNECTED");

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

      // 이미 채널이 있다면 중복 생성을 방지
      if (channel) {
        console.log(
          "[RealtimeProvider] 이미 채널이 존재하여 중복 생성을 방지합니다."
        );
        return;
      }

      console.log(`[RealtimeProvider] 사용자 ${userId}에 대한 구독 시도...`);
      setConnectionStatus("CONNECTED");

      try {
        channel = supabase.channel(`group_invites:${userId}`);
        console.log(`[RealtimeProvider] 채널 생성됨: group_invites:${userId}`);

        channel
          .on<GroupMember>(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "group_members",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log("[RealtimeProvider] 새로운 초대 감지!", payload.new);
              setInvitations((prev) => [...prev, payload.new]);
            }
          )
          .subscribe((status, err) => {
            console.log(`[RealtimeProvider] 구독 상태 변경: ${status}`);

            if (status === "SUBSCRIBED") {
              console.log("[RealtimeProvider] 실시간 채널 구독 성공!");
              setConnectionStatus("CONNECTED");
            }
            if (status === "CHANNEL_ERROR") {
              console.error("[RealtimeProvider] 채널 에러:", err);
              console.error("[RealtimeProvider] 에러 상세:", {
                message: err?.message,
                name: err?.name,
                stack: err?.stack,
              });
              setConnectionStatus("DISCONNECTED");
            }
            if (status === "TIMED_OUT") {
              console.warn("[RealtimeProvider] 연결 시간 초과");
              setConnectionStatus("DISCONNECTED");
            }
            if (status === "CLOSED") {
              console.log("[RealtimeProvider] 채널이 닫힘");
              setConnectionStatus("DISCONNECTED");
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

        supabase
          .removeChannel(channel)
          .then(() => {
            console.log("[RealtimeProvider] 채널 구독 해제 완료");
            channel = undefined;
            setConnectionStatus("DISCONNECTED");
          })
          .catch((error) => {
            console.error("[RealtimeProvider] 채널 해제 중 에러:", error);
            channel = undefined;
            setConnectionStatus("DISCONNECTED");
          });
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
          console.log("[RealtimeProvider] 앱 활성화 감지, 연결 재시도.");
          // Supabase 클라이언트가 자동으로 재연결을 시도하므로,
          // 수동으로 재구독할 필요 없이 상태만 확인합니다.
          setupChannel();
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
