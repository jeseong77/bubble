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
  native: "bubble://",
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

        // 프로필 설정 상태도 확인
        const profileSetupStatus = await AsyncStorage.getItem(
          "hasCompletedProfileSetup"
        );
        if (profileSetupStatus === "true") {
          setHasCompletedProfileSetup(true);
        }
      } catch (error) {
        console.error("[AuthProvider] AsyncStorage 상태 로드 실패:", error);
      }

      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          console.log(
            "[AuthProvider] 기존 세션 발견:",
            initialSession.user.email
          );
          setSession(initialSession);
          // 👇 [변경] 세션이 있으면 DB에서 프로필 상태 확인
          await checkProfileStatus(initialSession.user.id);
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error("[AuthProvider] 인증 초기화 중 에러:", error);
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
        "[AuthProvider] 🔄 인증 상태 변경 감지:",
        event,
        session?.user?.email
      );

      if (event === "TOKEN_REFRESHED") {
        console.log("[AuthProvider] 토큰이 자동으로 갱신됨");
      } else if (event === "SIGNED_OUT") {
        console.log("[AuthProvider] 사용자 로그아웃됨");
        setSession(null);
        // 로그아웃 시 로그인 화면으로 이동
        router.replace("/login");
      } else if (event === "SIGNED_IN" && session) {
        console.log("[AuthProvider] 🎉 사용자 로그인 성공!");
        console.log("[AuthProvider] 로그인된 사용자 정보:", {
          email: session.user.email,
          id: session.user.id,
          expiresAt: session.expires_at,
        });

        console.log("[AuthProvider] syncUserProfile 시작");
        // syncUserProfile을 비동기적으로 실행하되, 실패해도 다음 단계로 진행
        syncUserProfile(session).catch((error) => {
          console.error(
            "[AuthProvider] syncUserProfile 실패했지만 계속 진행:",
            error
          );
        });

        // 👇 [추가] 로그인 성공 시에도 DB에서 프로필 상태 확인
        console.log("[AuthProvider] 로그인 후 프로필 상태 확인 시작");
        checkProfileStatus(session.user.id).catch((error) => {
          console.error(
            "[AuthProvider] checkProfileStatus 실패했지만 계속 진행:",
            error
          );
        });

        console.log("[AuthProvider] 세션 상태 업데이트");
        setSession(session);

        // 리디렉션 로직은 useInitialRouteRedirect 훅이 담당하므로 여기서는 제거하거나
        // 기본 경로로만 보내는 것이 더 안전할 수 있습니다.
        // router.replace("/onboarding"); // 이 부분은 useInitialRouteRedirect가 처리하도록 둘 수 있습니다.
      } else if (event === "USER_UPDATED") {
        console.log("[AuthProvider] 사용자 정보 업데이트됨");
        setSession(session);
      } else {
        console.log("[AuthProvider] 기타 인증 이벤트:", event);
        setSession(session);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Google 로그인 - 웹 기반 OAuth 방식
  const signInWithGoogle = async () => {
    try {
      setIsAuthenticating(true);
      console.log("[AuthProvider] Google 로그인 시작");

      // 1. OAuth URL 요청
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[AuthProvider] Google OAuth URL 요청 실패:", error);
        return;
      }

      if (!data.url) {
        console.error("[AuthProvider] Google OAuth URL이 없습니다.");
        return;
      }

      // 2. 브라우저에서 인증 진행
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === "success" && "url" in result && result.url) {
        // 3. URL에서 'code' 파라미터를 추출
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          console.error("[AuthProvider] Google OAuth 에러:", {
            error,
            errorDescription,
          });
          return;
        }

        if (code) {
          const cleanCode = code.replace("#", "");

          try {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(cleanCode);

            if (exchangeError) {
              console.error(
                "[AuthProvider] Google 세션 교환 실패:",
                exchangeError
              );
            } else {
              console.log("[AuthProvider] Google 세션 교환 성공!");

              // 세션 교환 성공 후 세션 상태 업데이트
              if (exchangeData.session) {
                setSession(exchangeData.session);
              }
            }
          } catch (exchangeErr) {
            console.error(
              "[AuthProvider] Google 코드 교환 중 예외 발생:",
              exchangeErr
            );
          }
        } else {
          console.error("[AuthProvider] Google 인증 코드 추출 실패");
        }
      } else if (result.type === "cancel") {
        console.log("[AuthProvider] Google 로그인 취소됨");
      } else {
        console.log("[AuthProvider] Google 로그인 실패:", result);
      }
    } catch (err) {
      console.error("[AuthProvider] Google 로그인 중 예외 발생:", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Apple 로그인 - 네이티브 방식 (Best Practice)
  const signInWithApple = async () => {
    try {
      setIsAuthenticating(true);

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
      setIsAuthenticating(false);
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
      return; // 이름이 없으면 아무 작업도 하지 않고 종료
    }

    // 2. public.users 테이블에 사용자 정보 저장
    //    upsert는 ID가 없으면 생성(INSERT), 있으면 업데이트(UPDATE)를 한번에 처리합니다.

    // 타임아웃 설정 (5초)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("DB 업데이트 타임아웃")), 5000);
    });

    const upsertPromise = supabase.from("users").upsert({
      id: session.user.id, // auth.users의 id와 동일하게 설정
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(), // 마지막 업데이트 시간 기록
    });

    const { error } = (await Promise.race([
      upsertPromise,
      timeoutPromise,
    ])) as any;

    if (error) {
      console.error("[AuthProvider] 프로필 동기화 실패:", error);
    } else {
      console.log("[AuthProvider] 프로필 동기화 성공:", session.user.id);
    }
  };

  const signOut = async () => {
    try {
      console.log("[AuthProvider] 사용자 로그아웃 시작...");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthProvider] 로그아웃 중 에러:", error);
      } else {
        console.log("[AuthProvider] 사용자 로그아웃 성공");
        // 로그아웃 시 온보딩 상태도 리셋
        setHasCompletedOnboarding(false);
        setHasCompletedProfileSetup(false);
        try {
          await AsyncStorage.removeItem("hasCompletedOnboarding");
          await AsyncStorage.removeItem("hasCompletedProfileSetup");
          console.log("[AuthProvider] 온보딩 상태 리셋 완료");
        } catch (error) {
          console.error("[AuthProvider] 온보딩 상태 리셋 실패:", error);
        }
      }
    } catch (error) {
      console.error("[AuthProvider] 로그아웃 중 예상치 못한 에러:", error);
    }
  };

  const completeOnboarding = async () => {
    console.log("[AuthProvider] 온보딩 완료 처리 시작");
    setHasCompletedOnboarding(true);
    try {
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");
      console.log("[AuthProvider] 온보딩 상태 저장 완료");
    } catch (error) {
      console.error("[AuthProvider] 온보딩 상태 저장 실패:", error);
    }
  };

  const completeProfileSetup = async () => {
    console.log("[AuthProvider] 프로필 설정 완료 처리 시작");
    setHasCompletedProfileSetup(true);
    try {
      await AsyncStorage.setItem("hasCompletedProfileSetup", "true");
      console.log("[AuthProvider] 프로필 설정 상태 저장 완료");
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
