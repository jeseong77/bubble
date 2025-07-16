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
  isAuthenticating: boolean; // [추가] 로그인 프로세스 진행 상태
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
  const [isAuthenticating, setIsAuthenticating] = useState(false); // [추가]
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCompletedProfileSetup, setHasCompletedProfileSetup] =
    useState(false);
  const router = useRouter();

  // [추가] DB에서 프로필 완료 상태를 확인하는 함수
  const checkProfileStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("profile_setup_completed")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data?.profile_setup_completed) {
        console.log("[AuthProvider] DB에서 프로필 설정 완료 상태 확인됨");
        // completeProfileSetup 함수를 호출하여 state와 AsyncStorage를 모두 업데이트
        await completeProfileSetup();
      } else {
        console.log("[AuthProvider] DB에서 프로필 설정이 완료되지 않음 확인됨");
      }
    } catch (error) {
      console.error("[AuthProvider] 프로필 상태 확인 실패:", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 온보딩 상태는 로컬에 유지 (일회성)
        const onboardingStatus = await AsyncStorage.getItem(
          "hasCompletedOnboarding"
        );
        if (onboardingStatus === "true") {
          setHasCompletedOnboarding(true);
        }
      } catch (error) {
        console.error("[AuthProvider] 온보딩 상태 로드 실패:", error);
      }

      try {
        console.log("[AuthProvider] Initializing authentication...");
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          console.log(
            "[AuthProvider] Found existing session for:",
            initialSession.user.email
          );
          setSession(initialSession);
          // 👇 [변경] 세션이 있으면 DB에서 프로필 상태 확인
          await checkProfileStatus(initialSession.user.id);
        } else {
          console.log("[AuthProvider] No existing session found");
          setSession(null);
        }
      } catch (error) {
        console.error(
          "[AuthProvider] Error during auth initialization:",
          error
        );
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

        await syncUserProfile(session);
        // 👇 [추가] 로그인 성공 시에도 DB에서 프로필 상태 확인
        await checkProfileStatus(session.user.id);

        // 리디렉션 로직은 useInitialRouteRedirect 훅이 담당하므로 여기서는 제거하거나
        // 기본 경로로만 보내는 것이 더 안전할 수 있습니다.
        // router.replace("/onboarding"); // 이 부분은 useInitialRouteRedirect가 처리하도록 둘 수 있습니다.
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
      setIsAuthenticating(true); // [추가] 로그인 프로세스 시작
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
    } finally {
      setIsAuthenticating(false); // [추가] 로그인 프로세스 종료 (성공/실패 무관)
    }
  };

  // Apple 로그인 - 네이티브 방식 (Best Practice)
  const signInWithApple = async () => {
    try {
      setIsAuthenticating(true); // [추가] 로그인 프로세스 시작
      console.log("[AuthProvider] 네이티브 Apple 로그인 시작");

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
    } finally {
      setIsAuthenticating(false); // [추가] 로그인 프로세스 종료
    }
  };

  const syncUserProfile = async (session: Session) => {
    if (!session?.user) {
      throw new Error("No user on the session!");
    }

    // 1. Supabase의 메타데이터에서 이름 정보 추출
    const metadata = session.user.user_metadata;

    // Apple은 이름을 객체로, Google은 문자열로 제공하는 경우가 많습니다.
    const appleFirstName = metadata?.full_name?.givenName;
    const appleLastName = metadata?.full_name?.familyName;

    const googleFullName = metadata?.name;

    let firstName = "";
    let lastName = "";

    if (appleFirstName) {
      // Apple 로그인인 경우
      firstName = appleFirstName;
      lastName = appleLastName || "";
    } else if (googleFullName) {
      // Google 로그인인 경우
      const nameParts = googleFullName.split(" ");
      firstName = nameParts[0] ?? "";
      lastName = nameParts.slice(1).join(" ");
    }

    // 👇 [핵심 수정] 메타데이터에서 실제 이름 값을 가져온 경우에만 DB를 업데이트합니다.
    if (!firstName) {
      console.log(
        "[syncUserProfile] 메타데이터에 이름 정보가 없어 동기화를 건너뜁니다."
      );
      return; // 이름이 없으면 아무 작업도 하지 않고 종료
    }

    // 2. public.users 테이블에 사용자 정보 저장
    //    upsert는 ID가 없으면 생성(INSERT), 있으면 업데이트(UPDATE)를 한번에 처리합니다.
    const { error } = await supabase.from("users").upsert({
      id: session.user.id, // auth.users의 id와 동일하게 설정
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(), // 마지막 업데이트 시간 기록
    });

    if (error) {
      console.error("[syncUserProfile] 프로필 동기화 실패:", error);
    } else {
      console.log("[syncUserProfile] 프로필 동기화 성공:", session.user.id);
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
    isAuthenticating, // [추가] Context 값으로 전달
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
