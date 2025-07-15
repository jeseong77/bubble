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
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.log("[AuthUtils] No session to refresh");
      return { success: false, error };
    }

    if (!isValidSession(session)) {
      console.log("[AuthUtils] Session missing required fields");
      return { success: false, error: new Error("Invalid session format") };
    }

    if (shouldRefreshToken(session.expires_at)) {
      console.log("[AuthUtils] Token expiring soon, refreshing...");
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError) {
        console.error("[AuthUtils] Token refresh failed:", refreshError);
        return { success: false, error: refreshError };
      }

      console.log("[AuthUtils] Token refreshed successfully");
      return { success: true, session: refreshData.session };
    }

    return { success: true, session };
  } catch (error) {
    console.error("[AuthUtils] Unexpected error during token refresh:", error);
    return { success: false, error };
  }
};

/**
 * 세션 유효성 검사
 */
export const validateSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthUtils] Session validation error:", error);
      return false;
    }

    if (!session) {
      console.log("[AuthUtils] No session found");
      return false;
    }

    if (!isValidSession(session)) {
      console.log("[AuthUtils] Session missing required fields");
      return false;
    }

    // 토큰이 만료되었는지 확인
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at < now) {
      console.log("[AuthUtils] Session expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error("[AuthUtils] Error validating session:", error);
    return false;
  }
};

/**
 * 안전한 API 호출을 위한 래퍼
 */
export const withAuth = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    // 먼저 토큰 갱신 시도
    const refreshResult = await refreshTokenIfNeeded();

    if (!refreshResult.success) {
      throw new Error("Authentication failed");
    }

    // API 호출 실행
    return await apiCall();
  } catch (error) {
    console.error("[AuthUtils] API call failed:", error);
    throw error;
  }
};
