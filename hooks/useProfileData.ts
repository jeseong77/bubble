import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ProfileFormData, ProfileImage } from '@/types/profile';
import { BubbleTabItemData } from '@/components/bubble/BubbleTabItem';
import { Session } from '@supabase/supabase-js';

const MAX_IMAGES_DEFAULT = 6;

type Bubble = BubbleTabItemData;

interface UseProfileDataReturn {
  profile: ProfileFormData | null;
  setProfile: (profile: ProfileFormData | null) => void;
  editingProfile: ProfileFormData | null;
  setEditingProfile: (profile: ProfileFormData | null) => void;
  currentImages: (ProfileImage | null)[];
  setCurrentImages: (images: (ProfileImage | null)[]) => void;
  myBubbles: Bubble[];
  setMyBubbles: (bubbles: Bubble[]) => void;
  activeBubbleId: string | null;
  setActiveBubbleId: (id: string | null) => void;
  loading: boolean;
  bubblesLoading: boolean;
  fetchMyBubbles: () => Promise<void>;
}

export function useProfileData(session: Session | null): UseProfileDataReturn {
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [editingProfile, setEditingProfile] = useState<ProfileFormData | null>(null);
  const [currentImages, setCurrentImages] = useState<(ProfileImage | null)[]>(
    Array(MAX_IMAGES_DEFAULT).fill(null)
  );
  const [loading, setLoading] = useState(true);
  const [myBubbles, setMyBubbles] = useState<Bubble[]>([]);
  const [bubblesLoading, setBubblesLoading] = useState(true);
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      console.log('[useProfileData] fetchProfileData started');

      if (!session?.user) {
        console.log('[useProfileData] No session, stopping loading.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { user } = session;
        console.log(`[useProfileData] User ID: ${user.id}`);

        // 1. Get profile information from public.users table
        console.log('[useProfileData] Step 1: Starting profile data query from users table');
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('[useProfileData] Profile data query failed:', profileError);
          throw profileError;
        }
        if (!profileData) {
          console.error('[useProfileData] No profile data found.');
          throw new Error('Profile not found.');
        }
        console.log('[useProfileData] Profile data query successful:', {
          id: profileData.id,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
        });

        // 2. Get image paths (URLs) from public.user_images table
        console.log('[useProfileData] Step 2: Starting image information query from user_images table');
        const { data: imagesData, error: imagesError } = await supabase
          .from('user_images')
          .select('image_url, position')
          .eq('user_id', user.id)
          .order('position', { ascending: true });

        if (imagesError) {
          console.error('[useProfileData] Image data query failed:', imagesError);
          throw imagesError;
        }
        console.log('[useProfileData] Image data query successful:', {
          count: imagesData?.length || 0,
          images: imagesData,
        });

        // 3. Use image URLs as-is (no need to generate Signed URLs)
        console.log('[useProfileData] Step 3: Starting image URL processing');
        console.log('[useProfileData] Image data:', imagesData);

        // 4. Data processing and state updates
        console.log('[useProfileData] Step 5: Starting data processing');
        let age = 0;
        let birthDay = '',
          birthMonth = '',
          birthYear = '';
        if (profileData.birth_date) {
          const birthDate = new Date(profileData.birth_date);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          birthDay = String(birthDate.getDate()).padStart(2, '0');
          birthMonth = String(birthDate.getMonth() + 1).padStart(2, '0');
          birthYear = String(birthDate.getFullYear());
        }

        const fetchedProfile: ProfileFormData = {
          userId: profileData.id,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          username: profileData.username,
          age: age,
          birthDay: birthDay,
          birthMonth: birthMonth,
          birthYear: birthYear,
          height: profileData.height_cm,
          mbti: profileData.mbti,
          gender: profileData.gender,
          genderVisibleOnProfile: true,
          preferredGender: profileData.preferred_gender,
          aboutMe: profileData.bio,
          images: [],
        };
        console.log('[useProfileData] Profile data processing complete:', fetchedProfile);
        setProfile(fetchedProfile);
        setEditingProfile(JSON.parse(JSON.stringify(fetchedProfile)));

        // Finally update image state for screen display with permanent URLs.
        console.log('[useProfileData] Step 6: Starting image state update');
        const updatedImages: (ProfileImage | null)[] = Array(MAX_IMAGES_DEFAULT).fill(null);

        // Use image URLs as-is (no need to generate Signed URLs)
        imagesData.forEach((imageData) => {
          updatedImages[imageData.position] = {
            url: imageData.image_url, // Use permanent public URL as-is
          };
          console.log(
            `[useProfileData] Set URL at image position ${imageData.position}:`,
            imageData.image_url
          );
        });

        console.log('[useProfileData] Final image state:', updatedImages);
        setCurrentImages(updatedImages);
        console.log('[useProfileData] fetchProfileData complete');
      } catch (error) {
        console.error('[useProfileData] fetchProfileData error occurred:', error);
        console.error('[useProfileData] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        Alert.alert('Error', 'Failed to load profile data.');
      } finally {
        console.log('[useProfileData] fetchProfileData ended - setting loading to false');
        setLoading(false);
      }
    };

    console.log('[useProfileData] useEffect executing - session state:', !!session);
    if (session) {
      console.log('[useProfileData] Session exists, calling fetchProfileData');
      fetchProfileData();
    } else {
      console.log('[useProfileData] No session, not calling fetchProfileData');
    }
  }, [session]);

  // Fetch bubbles function
  const fetchMyBubbles = async () => {
    if (!session?.user) return;

    setBubblesLoading(true);
    try {
      // First, get basic bubble info where user is a member
      const { data: basicBubbles, error: basicError } = await supabase
        .from('group_members')
        .select(`
          groups!inner(id, name, status, max_size, creator_id),
          status,
          invited_at
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'joined')
        .order('invited_at', { ascending: false });

      if (basicError) throw basicError;

      console.log('[useProfileData] 🔍 Basic bubbles from direct query:', basicBubbles);

      // For each bubble, get complete member data using the WORKING get_bubble RPC
      const allBubbles = [];
      for (const bubbleRow of basicBubbles || []) {
        const bubble = bubbleRow.groups;

        // Get complete member data using the same RPC as bubble detail page
        const { data: bubbleData, error: bubbleError } = await supabase.rpc('get_bubble', {
          p_group_id: bubble.id,
        });

        if (!bubbleError && bubbleData && bubbleData.length > 0) {
          const completeData = bubbleData[0];

          // Combine basic info with complete member data
          allBubbles.push({
            id: bubble.id,
            name: bubble.name,
            status: bubble.status,
            max_size: bubble.max_size,
            members: completeData.members, // This will have ALL members like bubble detail page
            user_status: bubbleRow.status,
            invited_at: bubbleRow.invited_at,
            creator: {}, // Can add creator info if needed
          });
        }
      }

      // All bubbles are already filtered for 'joined' status
      const joinedBubbles = allBubbles;

      console.log('[useProfileData] Final bubble data using get_bubble RPC:', allBubbles);

      // Transform to BubbleTabItem structure
      const transformedBubbles: Bubble[] = joinedBubbles.map((bubble: any) => {
        // get_bubble RPC returns members in simpler structure with direct avatar_url
        let members: {
          id: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
        }[] = [];
        if (bubble.members) {
          try {
            members = Array.isArray(bubble.members) ? bubble.members : JSON.parse(bubble.members);
          } catch (parseError) {
            console.error('[useProfileData] Member information parsing failed:', parseError);
            members = [];
          }
        }

        // Transform to BubbleTabItem structure
        const transformedMembers = members.map((member) => {
          return {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            avatar_url: member.avatar_url,
            status: 'joined', // All members from get_bubble are 'joined'
            signedUrl: member.avatar_url, // Already a public URL, so use as-is
          };
        });

        return {
          id: bubble.id,
          name: bubble.name,
          status: bubble.status,
          max_size: bubble.max_size || 2, // Default to 2 if not provided
          members: transformedMembers,
        };
      });

      console.log('[useProfileData] Joined status bubbles:', transformedBubbles);
      setMyBubbles(transformedBubbles);

      // Get active bubble ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('active_group_id')
        .eq('id', session.user.id)
        .single();

      if (!userError && userData) {
        setActiveBubbleId(userData.active_group_id);
        console.log('[useProfileData] Active bubble ID:', userData.active_group_id);
      }
    } catch (error) {
      console.error('Error fetching my bubbles:', error);
      setMyBubbles([]); // Initialize with empty array on error
    } finally {
      setBubblesLoading(false);
    }
  };

  return {
    profile,
    setProfile,
    editingProfile,
    setEditingProfile,
    currentImages,
    setCurrentImages,
    myBubbles,
    setMyBubbles,
    activeBubbleId,
    setActiveBubbleId,
    loading,
    bubblesLoading,
    fetchMyBubbles,
  };
}
