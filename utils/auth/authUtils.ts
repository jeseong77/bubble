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
 * Check if token refresh is needed
 */
export const shouldRefreshToken = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - now;

  // Refresh needed if expires within 10 minutes
  return timeUntilExpiry < 600;
};

/**
 * Attempt token refresh
 */
export const refreshTokenIfNeeded = async () => {
  try {
    console.log("[AuthUtils] Starting token refresh check");

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthUtils] Failed to retrieve session:", error);
      console.error("[AuthUtils] Error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return { success: false, error };
    }

    if (!session) {
      console.log("[AuthUtils] No active session");
      return { success: false, error: new Error("No active session") };
    }

    console.log("[AuthUtils] Current session info:", {
      user: session.user?.email,
      expiresAt: session.expires_at,
      accessToken: session.access_token ? "present" : "missing",
    });

    if (!isValidSession(session)) {
      console.log("[AuthUtils] Session missing required fields");
      console.log("[AuthUtils] Session structure:", {
        hasExpiresAt: "expires_at" in session,
        expiresAtType: typeof session.expires_at,
      });
      return { success: false, error: new Error("Invalid session format") };
    }

    const timeUntilExpiry = session.expires_at - Math.floor(Date.now() / 1000);
    console.log(`[AuthUtils] ${timeUntilExpiry} seconds until token expiry`);

    if (shouldRefreshToken(session.expires_at)) {
      console.log("[AuthUtils] Token expiring soon, starting refresh...");
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError) {
        console.error("[AuthUtils] Token refresh failed:", refreshError);
        console.error("[AuthUtils] Refresh error details:", {
          message: refreshError.message,
          status: refreshError.status,
          name: refreshError.name,
        });
        return { success: false, error: refreshError };
      }

      console.log("[AuthUtils] Token refresh successful");
      console.log("[AuthUtils] New session info:", {
        user: refreshData.session?.user?.email,
        expiresAt: refreshData.session?.expires_at,
        accessToken: refreshData.session?.access_token ? "present" : "missing",
      });
      return { success: true, session: refreshData.session };
    }

    console.log("[AuthUtils] Token refresh not needed");
    return { success: true, session };
  } catch (error) {
    console.error("[AuthUtils] Exception during token refresh:", error);
    console.error("[AuthUtils] Exception details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error };
  }
};

/**
 * Session validation
 */
export const validateSession = async () => {
  try {
    console.log("[AuthUtils] Starting session validation");

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthUtils] Failed to retrieve session:", error);
      console.error("[AuthUtils] Error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return false;
    }

    if (!session) {
      console.log("[AuthUtils] No active session");
      return false;
    }

    console.log("[AuthUtils] Session info:", {
      user: session.user?.email,
      expiresAt: session.expires_at,
      accessToken: session.access_token ? "present" : "missing",
    });

    if (!isValidSession(session)) {
      console.log("[AuthUtils] Session missing required fields");
      console.log("[AuthUtils] Session structure:", {
        hasExpiresAt: "expires_at" in session,
        expiresAtType: typeof session.expires_at,
      });
      return false;
    }

    // Check if token has expired
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = session.expires_at - now;

    console.log(`[AuthUtils] ${timeUntilExpiry} seconds until token expiry`);

    if (session.expires_at < now) {
      console.log("[AuthUtils] Session has expired");
      return false;
    }

    console.log("[AuthUtils] Session validation passed");
    return true;
  } catch (error) {
    console.error("[AuthUtils] Exception during session validation:", error);
    console.error("[AuthUtils] Exception details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
};

/**
 * Wrapper for safe API calls
 */
export const withAuth = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    console.log("[AuthUtils] Starting withAuth wrapper");

    // First attempt token refresh
    console.log("[AuthUtils] Checking token refresh...");
    const refreshResult = await refreshTokenIfNeeded();

    if (!refreshResult.success) {
      console.error("[AuthUtils] Authentication failed:", refreshResult.error);
      throw new Error("Authentication failed");
    }

    console.log("[AuthUtils] Authentication successful, executing API call");

    // Execute API call
    const result = await apiCall();
    console.log("[AuthUtils] API call successful");
    return result;
  } catch (error) {
    console.error("[AuthUtils] API call failed:", error);
    console.error("[AuthUtils] API call error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
