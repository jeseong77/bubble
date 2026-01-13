import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BubbleMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status?: 'invited' | 'joined' | 'declined';
}

interface UseBubbleDataParams {
  groupId: string | undefined;
}

interface UseBubbleDataReturn {
  bubbleName: string;
  setBubbleName: (name: string) => void;
  creatorSignedUrl: string | null;
  bubbleMembers: BubbleMember[];
  memberSignedUrls: { [key: string]: string };
  bubbleInfo: any | null;
  isLoading: boolean;
  isMembersLoading: boolean;
  bubbleMemberCount: number;
}

export function useBubbleData({
  groupId,
}: UseBubbleDataParams): UseBubbleDataReturn {
  const [bubbleName, setBubbleName] = useState('');
  const [creatorSignedUrl, setCreatorSignedUrl] = useState<string | null>(null);
  const [bubbleMembers, setBubbleMembers] = useState<BubbleMember[]>([]);
  const [memberSignedUrls, setMemberSignedUrls] = useState<{
    [key: string]: string;
  }>({});
  const [bubbleInfo, setBubbleInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Fetch bubble info using get_bubble RPC
  useEffect(() => {
    const fetchBubbleInfo = async () => {
      if (groupId) {
        setIsLoading(true);
        try {
          console.log('=== 🔍 FORM.TSX DEBUG ===');
          console.log('groupId:', groupId);

          const { data, error } = await supabase.rpc('get_bubble', {
            p_group_id: groupId,
          });

          console.log('=== 📡 GET_BUBBLE RPC RESULT ===');
          console.log('Data:', data);
          console.log('Error:', error);
          console.log('Data type:', typeof data);
          console.log('Data length:', data?.length || 0);

          if (error) {
            console.error('Error fetching bubble info:', error);
            console.error('Error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            });
          } else if (data && data.length > 0) {
            const bubbleInfo = data[0];
            console.log('=== ✅ BUBBLE INFO ===');
            console.log('Bubble Info:', bubbleInfo);
            console.log('Bubble ID:', bubbleInfo.id);
            console.log('Bubble Name:', bubbleInfo.name);
            console.log('Bubble Max Size:', bubbleInfo.max_size);
            console.log('Members field:', bubbleInfo.members);
            console.log('Members field type:', typeof bubbleInfo.members);

            // Set bubble name
            setBubbleName(bubbleInfo.name || '');

            // Store complete bubble info
            setBubbleInfo(bubbleInfo);

            // Set member info (JSON parsing)
            if (bubbleInfo.members) {
              try {
                const members = Array.isArray(bubbleInfo.members)
                  ? bubbleInfo.members
                  : JSON.parse(bubbleInfo.members);
                setBubbleMembers(members || []);
                console.log('=== ✅ PARSED MEMBERS ===');
                console.log('Parsed members:', members);
                console.log('Members count:', members.length);
              } catch (parseError) {
                console.error('Failed to parse member info:', parseError);
                console.log('Raw members data:', bubbleInfo.members);
                setBubbleMembers([]);
              }
            } else {
              console.log('❌ No members field in bubble info');
              setBubbleMembers([]);
            }
          } else {
            console.log('❌ No bubble data or empty array');
          }
        } catch (error) {
          console.error('Error in fetchBubbleInfo:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchBubbleInfo();
  }, [groupId]);

  // Set member profile image URLs
  useEffect(() => {
    if (bubbleMembers.length === 0) return;

    setIsMembersLoading(true);
    const urls: { [key: string]: string } = {};

    for (const member of bubbleMembers) {
      // Simple structure: use member.avatar_url directly
      if (member.avatar_url) {
        urls[member.id] = member.avatar_url;
      }
    }

    setMemberSignedUrls(urls);
    setIsMembersLoading(false);
  }, [bubbleMembers]);

  // Set creator image URL
  useEffect(() => {
    if (bubbleMembers.length > 0 && bubbleMembers[0]?.avatar_url) {
      setCreatorSignedUrl(bubbleMembers[0].avatar_url);
    }
  }, [bubbleMembers]);

  // Calculate bubble size (use max_size for existing bubbles, default 2 for new bubbles)
  const bubbleMemberCount = bubbleInfo?.max_size || 2;

  console.log('=== 🎯 BUBBLE SIZE DEBUG ===');
  console.log('bubbleInfo:', bubbleInfo);
  console.log('bubbleInfo?.max_size:', bubbleInfo?.max_size);
  console.log('bubbleMemberCount:', bubbleMemberCount);

  return {
    bubbleName,
    setBubbleName,
    creatorSignedUrl,
    bubbleMembers,
    memberSignedUrls,
    bubbleInfo,
    isLoading,
    isMembersLoading,
    bubbleMemberCount,
  };
}
