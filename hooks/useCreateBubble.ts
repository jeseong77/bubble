import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

interface UseCreateBubbleReturn {
  isCreating: boolean;
  createBubble: (bubbleSize: "2-2" | "3-3" | "4-4", bubbleName: string) => Promise<void>;
}

export function useCreateBubble(onRefresh?: () => void): UseCreateBubbleReturn {
  const router = useRouter();
  const { session } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createBubble = async (bubbleSize: "2-2" | "3-3" | "4-4", bubbleName: string) => {
    if (!session?.user) {
      Alert.alert("Error", "Please login to create a bubble.");
      return;
    }

    // Get user profile data first
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      Alert.alert("Error", "Could not load your profile. Please try again.");
      return;
    }

    if (!profile.gender) {
      Alert.alert("Error", "Please complete your profile setup first.");
      return;
    }

    // Check for preferred gender in both possible field names (camelCase and snake_case)
    const userPreferredGender = profile.preferredGender || profile.preferred_gender;

    if (!userPreferredGender) {
      Alert.alert("Error", "Please complete your dating preferences first.");
      return;
    }

    setIsCreating(true);
    try {
      // Convert bubble size to max_size number
      const maxSize = bubbleSize === "2-2" ? 2 : bubbleSize === "3-3" ? 3 : 4;

      const { data: newGroup, error } = await supabase.rpc("create_group", {
        p_creator_id: session.user.id,
        p_max_size: maxSize,
        p_group_name: bubbleName,
        p_preferred_gender: userPreferredGender
      });

      if (error) {
        Alert.alert("Error", "Failed to create bubble. Please try again.");
        return;
      }

      if (!newGroup) {
        Alert.alert("Error", "Failed to create bubble. Please try again.");
        return;
      }

      // Refresh the MyBubble list
      if (onRefresh) {
        onRefresh();
      }

      // Navigate to the form page to show the bubble
      router.push({
        pathname: "/bubble/form",
        params: {
          groupId: newGroup,
          isExistingBubble: "false",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to create bubble. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createBubble,
  };
}
