import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

interface UseBubbleActionsParams {
  session: Session | null;
  activeBubbleId?: string | null;
  setActiveBubbleId?: (id: string | null) => void;
  fetchMyBubbles?: () => Promise<void>;
  onLeaveSuccess?: (data: any) => void;
}

interface UseBubbleActionsReturn {
  handleSetActiveBubble: (bubbleId: string) => Promise<void>;
  handleLeaveGroup: (bubbleId: string) => void;
}

export function useBubbleActions({
  session,
  activeBubbleId,
  setActiveBubbleId,
  fetchMyBubbles,
}: UseBubbleActionsParams): UseBubbleActionsReturn {
  // Set active bubble function
  const handleSetActiveBubble = async (bubbleId: string) => {
    if (!session?.user) return;

    try {
      console.log('[useBubbleActions] Starting active bubble setup:', bubbleId);

      const { data, error } = await supabase.rpc('set_user_active_bubble', {
        p_user_id: session.user.id,
        p_group_id: bubbleId,
      });

      if (error) {
        console.error('[useBubbleActions] Active bubble setup failed:', error);
        Alert.alert('Error', 'Failed to set active bubble.');
        return;
      }

      if (data) {
        if (setActiveBubbleId) {
          setActiveBubbleId(bubbleId);
        }
        console.log('[useBubbleActions] Active bubble setup successful:', bubbleId);
        Alert.alert('Success!', 'Active bubble has been set');
      }
    } catch (error) {
      console.error('[useBubbleActions] Error during active bubble setup:', error);
      Alert.alert('Error', 'Failed to set active bubble.');
    }
  };

  // Leave group function
  const handleLeaveGroup = (bubbleId: string) => {
    if (!session?.user) return;

    Alert.alert('Do you want to pop this bubble?', "Popped bubbles can't be restored.", [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Pop',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[useBubbleActions] Starting leave group:', bubbleId);

            const { data, error } = await supabase.rpc('leave_group', {
              p_user_id: session.user.id,
              p_group_id: bubbleId,
            });

            if (error) {
              console.error('[useBubbleActions] Failed to leave group:', error);
              Alert.alert('Error', 'Failed to pop bubble.');
              return;
            }

            if (!data || !data.success) {
              console.error(
                '[useBubbleActions] Failed to pop bubble:',
                data?.message || 'Unknown error'
              );
              Alert.alert('Error', data?.message || 'Failed to pop bubble.');
              return;
            }

            console.log(
              `[useBubbleActions] Successfully popped bubble: "${data.group_name}" by ${data.popper_name}`
            );

            // If active bubble was the deleted bubble, remove active status
            if (activeBubbleId === bubbleId && setActiveBubbleId) {
              setActiveBubbleId(null);
            }

            // Refresh bubble list or call custom success callback
            if (fetchMyBubbles) {
              fetchMyBubbles();
            }

            if (onLeaveSuccess) {
              onLeaveSuccess(data);
            }

            Alert.alert('Bubble Popped! 💥', `"${data.group_name}" has been destroyed.`);
          } catch (error) {
            console.error('[useBubbleActions] Error while leaving group:', error);
            Alert.alert('Error', 'Failed to pop bubble.');
          }
        },
      },
    ]);
  };

  return {
    handleSetActiveBubble,
    handleLeaveGroup,
  };
}
