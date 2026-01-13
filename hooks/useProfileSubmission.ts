import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ProfileFormData } from '@/types/profile';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';

interface UseProfileSubmissionReturn {
  isSubmitting: boolean;
  submitProfile: (profileData: ProfileFormData) => Promise<void>;
}

export function useProfileSubmission(): UseProfileSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session, completeProfileSetup } = useAuth();
  const router = useRouter();

  const submitProfile = async (profileData: ProfileFormData) => {
    if (isSubmitting || !session?.user) return;
    setIsSubmitting(true);

    try {
      // 1. Save profile information (text) to public.users
      const { birthYear, birthMonth, birthDay } = profileData;
      const birthDate = new Date(`${birthYear}-${birthMonth}-${birthDay}`);

      const userProfile = {
        id: session.user.id,
        username: profileData.username,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        birth_date: birthDate.toISOString(),
        height_cm: profileData.height,
        location: profileData.location,
        mbti: profileData.mbti,
        gender: profileData.gender,
        preferred_gender: profileData.preferredGender,
        bio: profileData.aboutMe,
        profile_setup_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("users")
        .upsert(userProfile);
      if (profileError) throw profileError;

      // 2. Save uploaded image URLs to public.user_images
      const uploadedImageUrls = profileData.images
        .map((img) => img?.url)
        .filter((url): url is string => !!url);

      if (uploadedImageUrls.length > 0) {
        // Delete existing images and add new ones (ensure idempotency)
        await supabase
          .from("user_images")
          .delete()
          .eq("user_id", session.user.id);

        const imagesToInsert = uploadedImageUrls.map((url, index) => ({
          user_id: session.user.id,
          image_url: url,
          position: index,
        }));

        const { error: imageError } = await supabase
          .from("user_images")
          .insert(imagesToInsert);
        if (imageError) throw imageError;
      }

      // 3. Complete profile setup process
      await completeProfileSetup();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Profile submission failed:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitProfile,
  };
}
