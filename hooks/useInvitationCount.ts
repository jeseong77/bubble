import { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { supabase } from "@/lib/supabase";

interface UseInvitationCountParams {
  userId: string | undefined;
}

interface UseInvitationCountReturn {
  invitationCount: number;
  isLoading: boolean;
  refreshInvitationCount: () => Promise<void>;
}

export function useInvitationCount({
  userId,
}: UseInvitationCountParams): UseInvitationCountReturn {
  const [invitationCount, setInvitationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvitationCount = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_bubbles", {
        p_user_id: userId,
      });

      if (error) {
        return;
      }

      // Filter only invited status bubbles
      const invitedCount = (data || []).filter(
        (bubble: any) => bubble.user_status === "invited"
      ).length;

      setInvitationCount(invitedCount);
    } catch (error) {
      // Silently handle error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch invitations when component mounts or userId changes
  useEffect(() => {
    fetchInvitationCount();
  }, [userId]);

  // Refresh invitation count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchInvitationCount();
    }, [userId])
  );

  return {
    invitationCount,
    isLoading,
    refreshInvitationCount: fetchInvitationCount,
  };
}
