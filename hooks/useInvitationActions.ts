import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

interface SearchUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  mbti: string;
  gender: string;
  displayName: string;
  invitationStatus: "invited" | "joined" | "declined" | null;
}

interface UseInvitationActionsParams {
  userId: string | undefined;
  groupId: string | undefined;
  checkGenderCompatibility: (targetUserGender: string) => boolean;
  setSearchResults: React.Dispatch<React.SetStateAction<SearchUser[]>>;
}

interface UseInvitationActionsReturn {
  sendInvitation: (userId: string, userName: string, userGender: string) => Promise<void>;
  cancelInvitation: (userId: string, userName: string) => Promise<void>;
}

export function useInvitationActions({
  userId,
  groupId,
  checkGenderCompatibility,
  setSearchResults,
}: UseInvitationActionsParams): UseInvitationActionsReturn {

  const sendInvitation = async (targetUserId: string, userName: string, userGender: string) => {
    if (!userId || !groupId) return;

    if (!checkGenderCompatibility(userGender)) {
      Alert.alert("Sorry, You can only invite friends of the same gender :(");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("send_invitation", {
        p_group_id: groupId,
        p_invited_user_id: targetUserId,
        p_invited_by_user_id: userId,
      });

      if (error) {
        console.error(`[useInvitationActions] Invitation sending error:`, error);
        throw error;
      }

      if (data) {
        // More permissive UI update logic - update UI if invitation was successful OR already exists
        if (data.success || data.already_exists) {
          // Update UI to show invitation sent
          setSearchResults(prevResults =>
            prevResults.map(user =>
              user.id === targetUserId
                ? { ...user, invitationStatus: "invited" as const }
                : user
            )
          );

          // Show success popup
          Alert.alert(
            "Invitation Sent!",
            `Invitation sent to ${userName}!`,
            [{ text: "OK", style: "default" }]
          );
        } else {
          console.error(`[useInvitationActions] ❌ Invitation sending failed: ${userName}`, {
            success: data.success,
            already_exists: data.already_exists,
            verification_status: data.verification_status,
            inserted_count: data.inserted_count,
            error: data.error
          });
          Alert.alert("Error", `Failed to send invitation: ${data.error || "Unknown error"}`);
        }
      } else {
        Alert.alert(
          "Error",
          "Failed to send invitation. User might already be invited or group is full."
        );
      }
    } catch (error) {
      console.error(`[useInvitationActions] Exception during invitation sending:`, error);
      Alert.alert("Error", "Failed to send invitation");
    }
  };

  const cancelInvitation = async (targetUserId: string, userName: string) => {
    if (!userId || !groupId) {
      console.error(`[useInvitationActions] Missing session or groupId:`, {
        hasSession: !!userId,
        groupId
      });
      return;
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isGroupIdValid = uuidRegex.test(groupId);
    const isUserIdValid = uuidRegex.test(targetUserId);

    if (!isGroupIdValid || !isUserIdValid) {
      console.error(`[useInvitationActions] Invalid UUID format`, { groupId, userId: targetUserId });
      Alert.alert("Error", "Invalid ID format");
      return;
    }

    try {
      const forceParams = {
        p_group_id: groupId,
        p_user_id: targetUserId,
      };
      const { data, error } = await supabase.rpc("force_delete_invitation", forceParams);

      if (error) {
        console.error(`[useInvitationActions] Error occurred:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });

        Alert.alert("Error", `Failed to cancel invitation: ${error.message}`);
        return;
      }

      // Handle force delete response
      if (data) {
        if (data.success) {
          // Update the user's invitation status back to null (no invitation)
          setSearchResults(prevResults =>
            prevResults.map(user =>
              user.id === targetUserId
                ? { ...user, invitationStatus: null }
                : user
            )
          );
          Alert.alert("Success!", `Invitation cancelled for ${userName}`);
        } else {
          console.error(`[useInvitationActions] ❌ Even FORCE DELETE failed: ${userName}`);
          console.error(`[useInvitationActions] Executed SQL: ${data.sql_executed}`);
          Alert.alert("Error", `Even force delete failed for ${userName}. This shouldn't happen!`);
        }
      } else {
        Alert.alert("Error", "No response data from force delete");
      }
    } catch (error) {
      console.error(`[useInvitationActions] Exception occurred:`, error);
      console.error(`[useInvitationActions] Complete exception object:`, JSON.stringify(error, null, 2));
      Alert.alert("Error", `Exception during cancel: ${error}`);
    }
  };

  return {
    sendInvitation,
    cancelInvitation,
  };
}
