// providers/AuthProvider.tsx

import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  scheme: "bubble",
});

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedProfileSetup: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  completeProfileSetup: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCompletedProfileSetup, setHasCompletedProfileSetup] =
    useState(false);
  const router = useRouter();

  useEffect(() => {
    // 앱 시작 시 세션 정보를 가져오고, 인증 상태 변경을 감지하는 로직
    const initializeAuth = async () => {
      try {
        // 온보딩 상태 로드
        const onboardingStatus = await AsyncStorage.getItem(
          "hasCompletedOnboarding"
        );
        const profileSetupStatus = await AsyncStorage.getItem(
          "hasCompletedProfileSetup"
        );

        if (onboardingStatus === "true") {
          setHasCompletedOnboarding(true);
        }
        if (profileSetupStatus === "true") {
          setHasCompletedProfileSetup(true);
        }
      } catch (error) {
        console.error("[AuthProvider] 온보딩 상태 로드 실패:", error);
      }
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
        // 로그아웃 시 로그인 화면으로 이동
        router.replace("/login");
      } else if (event === "SIGNED_IN" && session) {
        console.log("[AuthProvider] User signed in successfully");
        // 로그인 성공 시 온보딩 또는 메인 화면으로 이동
        // TODO: 사용자 프로필 설정 상태에 따라 적절한 화면으로 이동
        router.replace("/onboarding");
      }

      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Google 로그인 - 웹 기반 OAuth 방식
  const signInWithGoogle = async () => {
    try {
      console.log("[AuthProvider] Google 로그인 시작");
      console.log(`[AuthProvider] Redirect URI: ${redirectUri}`);

      // 1. OAuth URL 요청
      console.log("[AuthProvider] Google OAuth URL 요청 중...");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[AuthProvider] Google OAuth URL 요청 실패:", error);
        console.error("[AuthProvider] Error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        return;
      }

      if (!data.url) {
        console.error("[AuthProvider] Google OAuth URL이 없습니다.");
        console.error("[AuthProvider] Response data:", data);
        return;
      }

      console.log("[AuthProvider] Google OAuth URL 획득 성공:", data.url);

      // 2. 브라우저에서 인증 진행
      console.log("[AuthProvider] Google 브라우저 인증 시작...");
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      console.log("[AuthProvider] Google 브라우저 인증 결과:", {
        type: result.type,
        url: "url" in result ? result.url : undefined,
        errorCode: "errorCode" in result ? result.errorCode : undefined,
        errorMessage:
          "errorMessage" in result ? result.errorMessage : undefined,
      });

      if (result.type === "success" && "url" in result && result.url) {
        console.log("[AuthProvider] Google 브라우저 인증 성공");
        console.log("[AuthProvider] Redirect URL:", result.url);

        // 3. URL에서 'code' 파라미터를 추출
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        console.log("[AuthProvider] URL 파라미터:", {
          code: code ? `${code.substring(0, 10)}...` : null,
          error,
          errorDescription,
        });

        if (error) {
          console.error("[AuthProvider] Google OAuth 에러:", {
            error,
            errorDescription,
          });
          return;
        }

        if (code) {
          const cleanCode = code.replace("#", "");
          console.log("[AuthProvider] Google 코드 교환 시작...");

          try {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(cleanCode);

            if (exchangeError) {
              console.error(
                "[AuthProvider] Google 세션 교환 실패:",
                exchangeError
              );
              console.error("[AuthProvider] Exchange error details:", {
                message: exchangeError.message,
                status: exchangeError.status,
                name: exchangeError.name,
              });
            } else {
              console.log("[AuthProvider] Google 세션 교환 성공");
              console.log("[AuthProvider] Session data:", {
                user: exchangeData.session?.user?.email,
                expiresAt: exchangeData.session?.expires_at,
                accessToken: exchangeData.session?.access_token
                  ? "present"
                  : "missing",
              });
            }
          } catch (exchangeErr) {
            console.error(
              "[AuthProvider] Google 코드 교환 중 예외 발생:",
              exchangeErr
            );
          }
        } else {
          console.error("[AuthProvider] Google 인증 코드 추출 실패");
          console.error("[AuthProvider] URL 검사:", result.url);
        }
      } else if (result.type === "cancel") {
        console.log("[AuthProvider] Google 로그인 취소됨");
      } else {
        console.log("[AuthProvider] Google 로그인 실패:", result);
      }
    } catch (err) {
      console.error("[AuthProvider] Google 로그인 중 예외 발생:", err);
      console.error("[AuthProvider] Exception details:", {
        name: err instanceof Error ? err.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  };

  // Apple 로그인 - 네이티브 방식 (Best Practice)
  const signInWithApple = async () => {
    console.log("[AuthProvider] 네이티브 Apple 로그인 시작");
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        alert("이 기기에서는 Apple 로그인을 사용할 수 없습니다.");
        return;
      }

      // 1. 네이티브 Apple 로그인 UI를 띄웁니다.
      // 'clientId' 옵션은 사용하지 않습니다.
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("[AuthProvider] Apple credential 획득 성공");

      // 2. 받은 id_token으로 Supabase에 로그인합니다.
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error) {
          console.error("[AuthProvider] Supabase Apple 토큰 교환 실패:", error);
          throw error;
        }
        console.log("[AuthProvider] Supabase Apple 로그인 성공!");
      } else {
        throw new Error("Apple identityToken을 받지 못했습니다.");
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        console.log("[AuthProvider] 사용자가 Apple 로그인을 취소했습니다.");
      } else {
        console.error("[AuthProvider] 네이티브 Apple 로그인 중 에러 발생:", e);
      }
    }
  };

  const signOut = async () => {
    try {
      console.log("[AuthProvider] Signing out user...");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthProvider] Error during sign out:", error);
      } else {
        console.log("[AuthProvider] User signed out successfully");
        // 로그아웃 시 온보딩 상태도 리셋
        setHasCompletedOnboarding(false);
        setHasCompletedProfileSetup(false);
        try {
          await AsyncStorage.removeItem("hasCompletedOnboarding");
          await AsyncStorage.removeItem("hasCompletedProfileSetup");
        } catch (error) {
          console.error("[AuthProvider] 온보딩 상태 리셋 실패:", error);
        }
      }
    } catch (error) {
      console.error("[AuthProvider] Unexpected error during sign out:", error);
    }
  };

  const completeOnboarding = async () => {
    console.log("[AuthProvider] 온보딩 완료");
    setHasCompletedOnboarding(true);
    try {
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");
    } catch (error) {
      console.error("[AuthProvider] 온보딩 상태 저장 실패:", error);
    }
  };

  const completeProfileSetup = async () => {
    console.log("[AuthProvider] 프로필 설정 완료");
    setHasCompletedProfileSetup(true);
    try {
      await AsyncStorage.setItem("hasCompletedProfileSetup", "true");
    } catch (error) {
      console.error("[AuthProvider] 프로필 설정 상태 저장 실패:", error);
    }
  };

  const value = {
    session,
    loading,
    isLoggedIn: !!session,
    hasCompletedOnboarding,
    hasCompletedProfileSetup,
    signInWithGoogle,
    signInWithApple,
    signOut,
    completeOnboarding,
    completeProfileSetup,
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
