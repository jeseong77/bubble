import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ProfileFormData, ProfileImage } from '@/types/profile';
import { Session } from '@supabase/supabase-js';

interface UseProfileSaveParams {
  session: Session | null;
  editingProfile: ProfileFormData | null;
  profile: ProfileFormData | null;
  currentImages: (ProfileImage | null)[];
  setProfile: (profile: ProfileFormData) => void;
  setCurrentImages: (images: (ProfileImage | null)[]) => void;
}

interface UseProfileSaveReturn {
  saving: boolean;
  saveProfileToServer: () => Promise<void>;
}

export function useProfileSave({
  session,
  editingProfile,
  profile,
  currentImages,
  setProfile,
  setCurrentImages,
}: UseProfileSaveParams): UseProfileSaveReturn {
  const [saving, setSaving] = useState(false);

  const saveProfileToServer = async () => {
    console.log('[useProfileSave] saveProfileToServer started');

    if (!session?.user || !editingProfile) {
      console.log('[useProfileSave] No session or editing profile, stopping save.');
      return;
    }

    setSaving(true);

    try {
      const { user } = session;
      console.log(`[useProfileSave] User ID: ${user.id}`);

      // 1. Prepare image list - simplified since all images already have public URLs
      console.log('[useProfileSave] Step 1: Preparing image list');
      console.log(
        '[useProfileSave] Current image state:',
        currentImages.map((img, idx) => ({
          index: idx,
          hasImage: !!img,
          hasUrl: !!img?.url,
          url: img?.url,
        }))
      );

      // Since all images are immediately uploaded, just map them to the format we need
      const resolvedImages = currentImages.map((image, index) => {
        if (!image || !image.url) {
          console.log(`[useProfileSave] Image ${index}: Empty slot`);
          return { position: index, url: null };
        }

        console.log(`[useProfileSave] Image ${index}: Using existing public URL: ${image.url}`);
        return { position: index, url: image.url };
      });
      console.log('[useProfileSave] Prepared image results:', resolvedImages);

      // 2. Generate final image list to save to DB
      console.log('[useProfileSave] Step 2: Generating image list for DB storage');
      const imagesToInsert = resolvedImages
        .filter((img): img is { position: number; url: string } => !!img?.url)
        .map((img) => ({
          user_id: user.id,
          image_url: img.url,
          position: img.position,
        }));

      console.log('[useProfileSave] Image list to save to DB:', imagesToInsert);

      // 3. Atomically replace DB image list (delete then insert)
      console.log('[useProfileSave] Step 3: Deleting existing image data');
      const { error: deleteError } = await supabase
        .from('user_images')
        .delete()
        .eq('user_id', user.id);
      if (deleteError) {
        console.error('[useProfileSave] Failed to delete existing images:', deleteError);
        throw deleteError;
      }
      console.log('[useProfileSave] Existing images deleted successfully');

      if (imagesToInsert.length > 0) {
        console.log('[useProfileSave] Step 4: Inserting new image data');
        const { error: imagesError } = await supabase.from('user_images').insert(imagesToInsert);
        if (imagesError) {
          console.error('[useProfileSave] Failed to insert new image data:', imagesError);
          throw imagesError;
        }
        console.log('[useProfileSave] New image data inserted successfully');
      } else {
        console.log('[useProfileSave] No images to insert.');
      }

      // 4. Update profile text information
      console.log('[useProfileSave] Step 5: Updating profile text information');
      const birthDate =
        editingProfile.birthYear && editingProfile.birthMonth && editingProfile.birthDay
          ? `${editingProfile.birthYear}-${editingProfile.birthMonth}-${editingProfile.birthDay}`
          : profile?.birthDay
          ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
          : null;

      console.log('[useProfileSave] Profile data to update:', {
        id: user.id,
        firstName: editingProfile.firstName,
        lastName: editingProfile.lastName,
        birthDate,
        height: editingProfile.height,
        mbti: editingProfile.mbti,
        bio: editingProfile.aboutMe,
      });

      const { error: profileError } = await supabase.from('users').upsert({
        id: user.id,
        first_name: editingProfile.firstName,
        last_name: editingProfile.lastName,
        birth_date: birthDate,
        height_cm: editingProfile.height,
        mbti: editingProfile.mbti,
        bio: editingProfile.aboutMe,
        updated_at: new Date().toISOString(),
      });
      if (profileError) {
        console.error('[useProfileSave] Profile update failed:', profileError);
        throw profileError;
      }
      console.log('[useProfileSave] Profile update successful');

      // 5. Update local state
      console.log('[useProfileSave] Step 6: Updating local state');
      setProfile(JSON.parse(JSON.stringify(editingProfile))); // Deep copy to reflect changes

      // Update currentImages to ensure only URLs are kept
      const updatedCurrentImages = resolvedImages.map((img) => (img.url ? { url: img.url } : null));
      console.log('[useProfileSave] Updated local image state:', updatedCurrentImages);
      setCurrentImages(updatedCurrentImages);

      console.log('[useProfileSave] saveProfileToServer complete');
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('[useProfileSave] saveProfileToServer error occurred:', error);
      console.error('[useProfileSave] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      console.log('[useProfileSave] saveProfileToServer ended - setting saving to false');
      setSaving(false);
    }
  };

  return {
    saving,
    saveProfileToServer,
  };
}
