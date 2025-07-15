// providers/AuthProvider.tsx

import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Type guard to ensure session has required fields
 */
const isValidSession = (
  session: Session | null
): session is Session & { expires_at: number } => {
  return session !== null && typeof session.expires_at === "number";
};

const redirectUri = makeRedirectUri({
  native: "solva://", // app.json의 scheme과 일치해야 함
});

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>; // ✅ Apple 로그인 함수 타입 추가
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 앱 시작 시 세션 정보를 가져오고, 인증 상태 변경을 감지하는 로직
    const initializeAuth = async () => {
      try {
        console.log("[AuthProvider] Initializing authentication...");

        // 1. 기존 세션 가져오기
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthProvider] Error getting session:", sessionError);
        }

        if (initialSession) {
          console.log(
            "[AuthProvider] Found existing session, user:",
            initialSession.user.email
          );

          // 2. 토큰 만료 시간 확인 및 갱신 필요성 체크
          if (!isValidSession(initialSession)) {
            console.log(
              "[AuthProvider] Session missing required fields, skipping refresh check"
            );
            setSession(initialSession);
            return;
          }

          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = initialSession.expires_at - now;

          console.log(
            `[AuthProvider] Token expires in ${timeUntilExpiry} seconds`
          );

          // 토큰이 10분 이내에 만료되면 미리 갱신
          if (timeUntilExpiry < 600) {
            console.log("[AuthProvider] Token expiring soon, refreshing...");
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();

            if (refreshError) {
              console.error(
                "[AuthProvider] Error refreshing token:",
                refreshError
              );
              // 토큰 갱신 실패 시 세션 클리어
              await supabase.auth.signOut();
              setSession(null);
            } else {
              console.log("[AuthProvider] Token refreshed successfully");
              setSession(refreshData.session);
            }
          } else {
            setSession(initialSession);
          }
        } else {
          console.log("[AuthProvider] No existing session found");
          setSession(null);
        }
      } catch (error) {
        console.error(
          "[AuthProvider] Error during auth initialization:",
          error
        );
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 3. 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "[AuthProvider] Auth state changed:",
        event,
        session?.user?.email
      );

      if (event === "TOKEN_REFRESHED") {
        console.log("[AuthProvider] Token was refreshed automatically");
      } else if (event === "SIGNED_OUT") {
        console.log("[AuthProvider] User signed out");
      }

      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // ✅ [리팩토링] Google과 Apple 로그인의 공통 로직을 처리하는 함수
  const oauthSignIn = async (provider: "google" | "apple") => {
    try {
      console.log(`[SignIn] ${provider} 로그인 시작`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error(`[SignIn] ${provider} 인증 URL 획득 실패`, error);
        return;
      }
      if (!data.url) {
        console.error(`[SignIn] ${provider} 인증 URL이 없습니다.`);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === "success" && "url" in result && result.url) {
        console.log(`[SignIn] ${provider} 로그인 성공`);
        // URL에서 'code' 파라미터를 추출합니다.
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        if (code) {
          const cleanCode = code.replace("#", "");
          try {
            const { data, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(cleanCode);
            if (exchangeError) {
              console.error(
                `[SignIn] ${provider} 세션 교환 실패`,
                exchangeError
              );
            }
          } catch (exchangeErr) {
            console.error(
              `[SignIn] ${provider} 코드 교환 중 예외 발생`,
              exchangeErr
            );
          }
        } else {
          console.error(`[SignIn] ${provider} 인증 코드 추출 실패`);
        }
      } else {
        console.log(`[SignIn] ${provider} 로그인 취소 또는 실패`);
      }
    } catch (err) {
      console.error(`[SignIn] ${provider} 로그인 중 예외 발생`, err);
    }
  };

  const signInWithGoogle = () => oauthSignIn("google");
  const signInWithApple = () => oauthSignIn("apple");

  const signOut = async () => {
    try {
      console.log("[AuthProvider] Signing out user...");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthProvider] Error during sign out:", error);
      } else {
        console.log("[AuthProvider] User signed out successfully");
      }
    } catch (error) {
      console.error("[AuthProvider] Unexpected error during sign out:", error);
    }
  };

  const value = {
    session,
    loading,
    signInWithGoogle,
    signInWithApple, // ✅ Context 값에 추가
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
