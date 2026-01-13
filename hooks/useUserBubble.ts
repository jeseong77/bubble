import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserBubble {
  id: string;
  name: string;
  members: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    signedUrl?: string;
  }[];
}

interface UseUserBubbleReturn {
  userBubble: UserBubble | null;
  userBubbleLoading: boolean;
  refreshUserBubble: () => Promise<void>;
}

/**
 * Hook to fetch and manage the user's active bubble information
 * Consolidates duplicate bubble fetching logic from index.tsx
 */
export function useUserBubble(session: Session | null): UseUserBubbleReturn {
  const [userBubble, setUserBubble] = useState<UserBubble | null>(null);
  const [userBubbleLoading, setUserBubbleLoading] = useState(true);

  /**
   * Fetches the user's active bubble data
   * Logic flow:
   * 1. Get active_group_id from users table
   * 2. If not found, fallback to first joined bubble
   * 3. Fetch complete bubble data using get_bubble RPC
   * 4. Parse and transform member data
   */
  const fetchUserBubble = useCallback(async () => {
    if (!session?.user) {
      setUserBubble(null);
      setUserBubbleLoading(false);
      return;
    }

    setUserBubbleLoading(true);
    try {
      console.log('[useUserBubble] Starting to fetch active bubble info');

      // Step 1: Get user's active_group_id from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('active_group_id')
        .eq('id', session.user.id)
        .single();

      let activeBubbleId: string | null = null;
      if (!userError && userData?.active_group_id) {
        activeBubbleId = userData.active_group_id;
        console.log('[useUserBubble] Found active_group_id:', activeBubbleId);
      } else {
        // Step 2: If no active bubble, get first joined bubble as fallback
        console.log('[useUserBubble] No active_group_id, finding first joined bubble');
        const { data: basicBubbles, error: basicError } = await supabase
          .from('group_members')
          .select(
            `
            groups!inner(id, name, status, max_size, creator_id),
            status,
            invited_at
          `
          )
          .eq('user_id', session.user.id)
          .eq('status', 'joined')
          .order('invited_at', { ascending: false })
          .limit(1);

        if (!basicError && basicBubbles && basicBubbles.length > 0) {
          activeBubbleId = basicBubbles[0].groups.id;
          console.log('[useUserBubble] Using first joined bubble as fallback:', activeBubbleId);
        }
      }

      if (!activeBubbleId) {
        console.log('[useUserBubble] No active bubble or joined bubbles found');
        setUserBubble(null);
        return;
      }

      // Step 3: Get complete bubble data using get_bubble RPC
      console.log('[useUserBubble] Fetching complete bubble data using get_bubble RPC');
      const { data: bubbleData, error: bubbleError } = await supabase.rpc('get_bubble', {
        p_group_id: activeBubbleId,
      });

      if (bubbleError || !bubbleData || bubbleData.length === 0) {
        console.error('[useUserBubble] get_bubble RPC failed:', bubbleError);
        setUserBubble(null);
        return;
      }

      const completeData = bubbleData[0];
      console.log('[useUserBubble] get_bubble RPC success:', {
        id: completeData.id,
        name: completeData.name,
        membersCount: completeData.members?.length || 0,
      });

      // Step 4: Parse and transform member data
      let members: {
        id: string;
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      }[] = [];

      if (completeData.members) {
        try {
          members = Array.isArray(completeData.members)
            ? completeData.members
            : JSON.parse(completeData.members);
        } catch (parseError) {
          console.error('[useUserBubble] Failed to parse member info:', parseError);
          members = [];
        }
      }

      console.log(`[useUserBubble] Processing bubble "${completeData.name}" with ${members.length} members`);

      // Transform to UserBubble structure
      const transformedMembers = members.map((member) => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        avatar_url: member.avatar_url,
        signedUrl: member.avatar_url, // Already public URL, use as is
      }));

      const userBubbleData: UserBubble = {
        id: completeData.id,
        name: completeData.name,
        members: transformedMembers,
      };

      console.log('[useUserBubble] Setting user bubble data:', {
        id: userBubbleData.id,
        name: userBubbleData.name,
        totalMembers: userBubbleData.members.length,
      });

      setUserBubble(userBubbleData);
    } catch (error) {
      console.error('[useUserBubble] Error fetching user bubble:', error);
      setUserBubble(null);
    } finally {
      setUserBubbleLoading(false);
    }
  }, [session?.user]);

  // Initial fetch on mount or when session changes
  useEffect(() => {
    console.log('[useUserBubble] Initial data loading...');
    fetchUserBubble();
  }, [fetchUserBubble]);

  return {
    userBubble,
    userBubbleLoading,
    refreshUserBubble: fetchUserBubble,
  };
}
