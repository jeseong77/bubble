import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

interface InvitationBubble {
  id: string;
  name: string;
  status: string;
  members: any[];
  user_status: string;
  invited_at: string;
  group_size?: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface UseInvitationsParams {
  userId: string | undefined;
  onAcceptSuccess?: () => void;
}

interface UseInvitationsReturn {
  invitedBubbles: InvitationBubble[];
  loading: boolean;
  handleAcceptInvitation: (bubbleId: string) => Promise<void>;
  handleDeclineInvitation: (bubbleId: string) => Promise<void>;
  refreshInvitations: () => Promise<void>;
}

export function useInvitations({
  userId,
  onAcceptSuccess,
}: UseInvitationsParams): UseInvitationsReturn {
  const [invitedBubbles, setInvitedBubbles] = useState<InvitationBubble[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitedBubbles = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_bubbles", {
        p_user_id: userId,
      });

      if (error) throw error;

      // Filter only invited status bubbles and extract creator info
      const invited = (data || [])
        .filter((bubble: any) => bubble.user_status === "invited")
        .map((bubble: any) => {
          const members = Array.isArray(bubble.members)
            ? bubble.members
            : bubble.members
            ? JSON.parse(bubble.members)
            : [];

          const creator = bubble.creator;
          const maxSize = members.length <= 2 ? "2:2" : "3:3";

          return {
            id: bubble.id,
            name: bubble.name,
            status: bubble.status,
            members: members,
            user_status: bubble.user_status,
            invited_at: bubble.invited_at,
            group_size: maxSize,
            creator: creator
              ? {
                  id: creator.id,
                  first_name: creator.first_name,
                  last_name: creator.last_name,
                  avatar_url: creator.avatar_url,
                }
              : null,
          };
        });

      setInvitedBubbles(invited);
    } catch (error) {
      console.error("[useInvitations] Error fetching invited bubbles:", error);
      setInvitedBubbles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitedBubbles();
  }, [userId]);

  const handleAcceptInvitation = async (bubbleId: string) => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to accept invitations.");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_group_id: bubbleId,
        p_user_id: userId,
      });

      if (error) {
        Alert.alert(
          "Error",
          error.message || "Failed to accept invitation. Please try again."
        );
        return;
      }

      // Handle the new JSON response format
      if (!data || !data.success) {
        let errorMessage = "Failed to accept invitation.";
        let errorTitle = "Error";

        if (data?.error === "GROUP_FULL") {
          errorTitle = "Bubble Full";
          errorMessage =
            "This bubble is already full. Please try another bubble.";
        } else if (data?.error === "USER_ALREADY_IN_FULL_GROUP") {
          errorTitle = "Already in a Bubble";
          errorMessage =
            "You're already in a full bubble. Please leave your current bubble first.";
        } else if (data?.error === "INVITATION_NOT_FOUND") {
          errorTitle = "Invitation Expired";
          errorMessage =
            "This invitation is no longer available. The bubble may have been deleted.";
        }

        Alert.alert(errorTitle, errorMessage);
        return;
      }

      // Success case
      Alert.alert(
        "Success!",
        `You've successfully joined the bubble!`,
        [
          {
            text: "OK",
            onPress: () => {
              onAcceptSuccess?.();
            },
          },
        ]
      );

      // Refresh invitations list
      await fetchInvitedBubbles();
    } catch (error: any) {
      console.error("[useInvitations] Exception during accept:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const handleDeclineInvitation = async (bubbleId: string) => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    try {
      const { error } = await supabase.rpc("decline_invitation", {
        p_group_id: bubbleId,
        p_user_id: userId,
      });

      if (error) {
        Alert.alert(
          "Error",
          error.message || "Failed to decline invitation. Please try again."
        );
        return;
      }

      Alert.alert("Invitation Declined", "You've declined the invitation.");

      // Refresh invitations list
      await fetchInvitedBubbles();
    } catch (error: any) {
      console.error("[useInvitations] Exception during decline:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  return {
    invitedBubbles,
    loading,
    handleAcceptInvitation,
    handleDeclineInvitation,
    refreshInvitations: fetchInvitedBubbles,
  };
}
