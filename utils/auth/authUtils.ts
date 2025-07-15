import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Type guard to ensure session has required fields
 */
const isValidSession = (
  session: Session | null
): session is Session & { expires_at: number } => {
  return session !== null && typeof session.expires_at === "number";
};

/**
 * 토큰 갱신이 필요한지 확인
 */
export const shouldRefreshToken = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - now;

  // 10분 이내에 만료되면 갱신 필요
  return timeUntilExpiry < 600;
};

/**
 * 토큰 갱신 시도
 */
export const refreshTokenIfNeeded = async () => {
  try {
    console.log("[AuthUtils] 토큰 갱신 검사 시작");

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthUtils] 세션 조회 실패:", error);
      console.error("[AuthUtils] Error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return { success: false, error };
    }

    if (!session) {
      console.log("[AuthUtils] 활성 세션이 없음");
      return { success: false, error: new Error("No active session") };
    }

    console.log("[AuthUtils] 현재 세션 정보:", {
      user: session.user?.email,
      expiresAt: session.expires_at,
      accessToken: session.access_token ? "present" : "missing",
    });

    if (!isValidSession(session)) {
      console.log("[AuthUtils] 세션에 필수 필드가 없음");
      console.log("[AuthUtils] Session structure:", {
        hasExpiresAt: "expires_at" in session,
        expiresAtType: typeof session.expires_at,
      });
      return { success: false, error: new Error("Invalid session format") };
    }

    const timeUntilExpiry = session.expires_at - Math.floor(Date.now() / 1000);
    console.log(`[AuthUtils] 토큰 만료까지 ${timeUntilExpiry}초 남음`);

    if (shouldRefreshToken(session.expires_at)) {
      console.log("[AuthUtils] 토큰이 곧 만료됨, 갱신 시작...");
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError) {
        console.error("[AuthUtils] 토큰 갱신 실패:", refreshError);
        console.error("[AuthUtils] Refresh error details:", {
          message: refreshError.message,
          status: refreshError.status,
          name: refreshError.name,
        });
        return { success: false, error: refreshError };
      }

      console.log("[AuthUtils] 토큰 갱신 성공");
      console.log("[AuthUtils] 새 세션 정보:", {
        user: refreshData.session?.user?.email,
        expiresAt: refreshData.session?.expires_at,
        accessToken: refreshData.session?.access_token ? "present" : "missing",
      });
      return { success: true, session: refreshData.session };
    }

    console.log("[AuthUtils] 토큰 갱신이 필요하지 않음");
    return { success: true, session };
  } catch (error) {
    console.error("[AuthUtils] 토큰 갱신 중 예외 발생:", error);
    console.error("[AuthUtils] Exception details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error };
  }
};

/**
 * 세션 유효성 검사
 */
export const validateSession = async () => {
  try {
    console.log("[AuthUtils] 세션 유효성 검사 시작");

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthUtils] 세션 조회 실패:", error);
      console.error("[AuthUtils] Error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return false;
    }

    if (!session) {
      console.log("[AuthUtils] 활성 세션이 없음");
      return false;
    }

    console.log("[AuthUtils] 세션 정보:", {
      user: session.user?.email,
      expiresAt: session.expires_at,
      accessToken: session.access_token ? "present" : "missing",
    });

    if (!isValidSession(session)) {
      console.log("[AuthUtils] 세션에 필수 필드가 없음");
      console.log("[AuthUtils] Session structure:", {
        hasExpiresAt: "expires_at" in session,
        expiresAtType: typeof session.expires_at,
      });
      return false;
    }

    // 토큰이 만료되었는지 확인
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = session.expires_at - now;

    console.log(`[AuthUtils] 토큰 만료까지 ${timeUntilExpiry}초 남음`);

    if (session.expires_at < now) {
      console.log("[AuthUtils] 세션이 만료됨");
      return false;
    }

    console.log("[AuthUtils] 세션 유효성 검사 통과");
    return true;
  } catch (error) {
    console.error("[AuthUtils] 세션 유효성 검사 중 예외 발생:", error);
    console.error("[AuthUtils] Exception details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
};

/**
 * 안전한 API 호출을 위한 래퍼
 */
export const withAuth = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    console.log("[AuthUtils] withAuth 래퍼 시작");

    // 먼저 토큰 갱신 시도
    console.log("[AuthUtils] 토큰 갱신 검사 중...");
    const refreshResult = await refreshTokenIfNeeded();

    if (!refreshResult.success) {
      console.error("[AuthUtils] 인증 실패:", refreshResult.error);
      throw new Error("Authentication failed");
    }

    console.log("[AuthUtils] 인증 성공, API 호출 실행");

    // API 호출 실행
    const result = await apiCall();
    console.log("[AuthUtils] API 호출 성공");
    return result;
  } catch (error) {
    console.error("[AuthUtils] API 호출 실패:", error);
    console.error("[AuthUtils] API call error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
