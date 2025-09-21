import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "@/hooks/useAppTheme";
import CustomView from "@/components/CustomView";
import { Ionicons } from "@expo/vector-icons";
import { ProfileFormData, ProfileImage } from "@/types/profile";
import ProfileHero from "@/components/ProfileHero";
import ProfileTab, { TabInfo } from "@/components/ProfileTab";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import BubbleTabItem from "@/components/bubble/BubbleTabItem";
import CreateBubbleModal from "@/components/ui/CreateBubbleModal";
import * as Camera from "expo-camera";

// --- Imports for data integration ---
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useImageUpload } from "@/hooks/useImageUpload";

// BubbleTabItem에서 사용하는 타입을 import
import { BubbleTabItemData } from "@/components/bubble/BubbleTabItem";

// Information for bubbles displayed on screen (same structure as BubbleTabItemData)
type Bubble = BubbleTabItemData;

const TABS_DATA: TabInfo[] = [
  { id: "bubblePro", title: "Bubble pro" },
  { id: "myBubble", title: "My Bubble" },
  { id: "myInfo", title: "Edit Profile" },
];

// ImageUploadStep에서 가져온 상수들
const NUM_COLUMNS = 3;
const MAX_IMAGES_DEFAULT = 6;

// Skeleton Components
const SkeletonView = ({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number | string;
  style?: any;
}) => (
  <View
    style={[
      {
        width: width as any,
        height: height as any,
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
      },
      style,
    ]}
  />
);

const SkeletonCircle = ({ size, style }: { size: number; style?: any }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#f0f0f0",
      },
      style,
    ]}
  />
);

const SkeletonText = ({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number | string;
  style?: any;
}) => (
  <View
    style={[
      {
        width: width as any,
        height: height as any,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
      },
      style,
    ]}
  />
);

// Skeleton Bubble Item Component
const SkeletonBubbleItem = () => {
  return (
    <View style={styles.skeletonBubbleItem}>
      <View style={styles.skeletonBubbleContent}>
        <View style={styles.skeletonBubbleAvatars}>
          <SkeletonCircle size={40} />
          <SkeletonCircle size={40} style={{ marginLeft: -15 }} />
        </View>
        <View style={styles.skeletonBubbleText}>
          <SkeletonText width={100} height={16} style={{ marginBottom: 4 }} />
          <SkeletonText width={60} height={12} />
        </View>
      </View>
      <SkeletonView width={24} height={24} />
    </View>
  );
};

// Skeleton Image Grid Component
const SkeletonImageGrid = () => {
  const screenWidth = Dimensions.get("window").width;
  const contentPaddingHorizontal = 20;
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  return (
    <View style={styles.skeletonImageGrid}>
      {Array.from({ length: MAX_IMAGES_DEFAULT }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonImageSlot,
            { width: itemSize, height: itemSize },
          ]}
        >
          <SkeletonView
            width="100%"
            height="100%"
            style={{ borderRadius: 12 }}
          />
        </View>
      ))}
    </View>
  );
};

// Skeleton Profile Details Component
const SkeletonProfileDetails = () => {
  return (
    <View style={styles.skeletonProfileDetails}>
      {Array.from({ length: 7 }).map((_, index) => (
        <View key={index} style={styles.skeletonDetailItem}>
          <SkeletonText width={80} height={14} style={{ marginBottom: 8 }} />
          <SkeletonText width="100%" height={20} />
        </View>
      ))}
      <SkeletonView
        width="100%"
        height={50}
        style={{ marginTop: 30, borderRadius: 25 }}
      />
    </View>
  );
};

function ProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const bottomHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams();

  // --- State management ---
  const { session, signOut } = useAuth();
  const { pickAndUploadImage, isUploading } = useImageUpload();
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [editingProfile, setEditingProfile] = useState<ProfileFormData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentImages, setCurrentImages] = useState<(ProfileImage | null)[]>(
    Array(MAX_IMAGES_DEFAULT).fill(null)
  );
  const [activeTab, setActiveTab] = useState<string>(params.activeTab as string || "myBubble");
  const [showCreateBubbleModal, setShowCreateBubbleModal] = useState(false);
  const [myBubbles, setMyBubbles] = useState<Bubble[]>([]);
  const [bubblesLoading, setBubblesLoading] = useState(true);
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  // --- New states ---
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  // --- [Modified] Data Fetching useEffect ---
  useEffect(() => {
    const fetchProfileData = async () => {
      console.log("[ProfileScreen] fetchProfileData started");

      if (!session?.user) {
        console.log("[ProfileScreen] No session, stopping loading.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { user } = session;
        console.log(`[ProfileScreen] User ID: ${user.id}`);

        // 1. Get profile information from public.users table
        console.log(
          "[ProfileScreen] Step 1: Starting profile data query from users table"
        );
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error(
            "[ProfileScreen] Profile data query failed:",
            profileError
          );
          throw profileError;
        }
        if (!profileData) {
          console.error("[ProfileScreen] No profile data found.");
          throw new Error("Profile not found.");
        }
        console.log("[ProfileScreen] Profile data query successful:", {
          id: profileData.id,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
        });

        // 2. Get image paths (URLs) from public.user_images table
        console.log(
          "[ProfileScreen] Step 2: Starting image information query from user_images table"
        );
        const { data: imagesData, error: imagesError } = await supabase
          .from("user_images")
          .select("image_url, position")
          .eq("user_id", user.id)
          .order("position", { ascending: true });

        if (imagesError) {
          console.error(
            "[ProfileScreen] Image data query failed:",
            imagesError
          );
          throw imagesError;
        }
        console.log("[ProfileScreen] Image data query successful:", {
          count: imagesData?.length || 0,
          images: imagesData,
        });

        // --- 👇 [Core Fix] Image URLs are now already permanent public URLs ---
        // 3. Use image URLs as-is (no need to generate Signed URLs)
        console.log("[ProfileScreen] Step 3: Starting image URL processing");
        console.log("[ProfileScreen] Image data:", imagesData);

        // 4. Data processing and state updates
        console.log("[ProfileScreen] Step 5: Starting data processing");
        let age = 0;
        let birthDay = "",
          birthMonth = "",
          birthYear = "";
        if (profileData.birth_date) {
          const birthDate = new Date(profileData.birth_date);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          birthDay = String(birthDate.getDate()).padStart(2, "0");
          birthMonth = String(birthDate.getMonth() + 1).padStart(2, "0");
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
        console.log("[ProfileScreen] Profile data processing complete:", fetchedProfile);
        setProfile(fetchedProfile);
        setEditingProfile(JSON.parse(JSON.stringify(fetchedProfile)));

        // Finally update image state for screen display with permanent URLs.
        console.log("[ProfileScreen] Step 6: Starting image state update");
        const updatedImages: (ProfileImage | null)[] =
          Array(MAX_IMAGES_DEFAULT).fill(null);

        // Use image URLs as-is (no need to generate Signed URLs)
        imagesData.forEach((imageData) => {
          updatedImages[imageData.position] = {
            url: imageData.image_url, // Use permanent public URL as-is
          };
          console.log(
            `[ProfileScreen] Set URL at image position ${imageData.position}:`,
            imageData.image_url
          );
        });

        console.log("[ProfileScreen] Final image state:", updatedImages);
        setCurrentImages(updatedImages);
        console.log("[ProfileScreen] fetchProfileData complete");
      } catch (error) {
        console.error("[ProfileScreen] fetchProfileData error occurred:", error);
        console.error("[ProfileScreen] Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        console.log(
          "[ProfileScreen] fetchProfileData ended - setting loading to false"
        );
        setLoading(false);
      }
    };

    console.log("[ProfileScreen] useEffect executing - session state:", !!session);
    if (session) {
      console.log("[ProfileScreen] Session exists, calling fetchProfileData");
      fetchProfileData();
    } else {
      console.log(
        "[ProfileScreen] No session, not calling fetchProfileData"
      );
    }
  }, [session]);

  // My Bubble 데이터 로딩 함수를 별도로 분리
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

      console.log("[ProfileScreen] 🔍 Basic bubbles from direct query:", basicBubbles);

      // For each bubble, get complete member data using the WORKING get_bubble RPC
      const allBubbles = [];
      for (const bubbleRow of basicBubbles || []) {
        const bubble = bubbleRow.groups;
        
        // Get complete member data using the same RPC as bubble detail page
        const { data: bubbleData, error: bubbleError } = await supabase.rpc("get_bubble", {
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
            creator: {} // Can add creator info if needed
          });
        }
      }

      // Logging raw data from server - enhanced debugging
      console.log("[ProfileScreen] 🔍 Raw bubble data from server:");
      console.log("[ProfileScreen] Complete data:", JSON.stringify(allBubbles, null, 2));

      if (allBubbles.length > 0) {
        allBubbles.forEach((bubble, index) => {
          console.log(`[ProfileScreen] 🔍 Detailed analysis of bubble ${index}:`);
          console.log(`[ProfileScreen] - Bubble ID: ${bubble.id}`);
          console.log(`[ProfileScreen] - Bubble name: ${bubble.name}`);
          console.log(`[ProfileScreen] - Bubble status: ${bubble.status}`);
          console.log(`[ProfileScreen] - Max size: ${bubble.max_size}`);
          console.log(`[ProfileScreen] - User status: ${bubble.user_status}`);
          console.log(`[ProfileScreen] - Members array:`, bubble.members);
          
          if (bubble.members && Array.isArray(bubble.members)) {
            bubble.members.forEach((member, memberIndex) => {
              console.log(`[ProfileScreen] - Member ${memberIndex}:`, {
                id: member.id,
                first_name: member.first_name,
                last_name: member.last_name,
                status: member.status,
                hasImages: member.images && member.images.length > 0
              });
            });
          }
        });
      }

      // All bubbles are already filtered for 'joined' status
      const joinedBubbles = allBubbles;

      console.log("[ProfileScreen] Final bubble data using get_bubble RPC:", allBubbles);
      console.log("[ProfileScreen] 🔍 Raw members data from get_bubble:");
      joinedBubbles.forEach((bubble, index) => {
        console.log(`[ProfileScreen] Bubble ${index} members:`, bubble.members);
        console.log(`[ProfileScreen] Members array length:`, bubble.members ? bubble.members.length : 0);
        console.log(`[ProfileScreen] Members is array:`, Array.isArray(bubble.members));
      });
      
      // 데이터 구조를 BubbleTabItem에서 사용하는 형태로 변환
      const transformedBubbles: Bubble[] = joinedBubbles.map((bubble: any) => {
        // get_bubble RPC returns members in simpler structure with direct avatar_url
        let members: { id: string; first_name: string; last_name: string; avatar_url: string | null }[] = [];
        if (bubble.members) {
          try {
            members = Array.isArray(bubble.members)
              ? bubble.members
              : JSON.parse(bubble.members);
          } catch (parseError) {
            console.error("[ProfileScreen] Member information parsing failed:", parseError);
            members = [];
          }
        }

        console.log(`[ProfileScreen] 🔍 Processing bubble "${bubble.name}" with ${members.length} members:`);
        members.forEach((member, idx) => {
          console.log(`[ProfileScreen] - Member ${idx}: ${member.first_name} ${member.last_name} (${member.id})`);
        });

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

      console.log("[ProfileScreen] Joined status bubbles:", transformedBubbles);
      setMyBubbles(transformedBubbles);
      
      // Active 버블 ID 가져오기
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("active_group_id")
        .eq("id", session.user.id)
        .single();
        
      if (!userError && userData) {
        setActiveBubbleId(userData.active_group_id);
        console.log("[ProfileScreen] Active bubble ID:", userData.active_group_id);
      }
    } catch (error) {
      console.error("Error fetching my bubbles:", error);
      setMyBubbles([]); // Initialize with empty array on error
    } finally {
      setBubblesLoading(false);
    }
  };

  // My Bubble 데이터 로딩
  useEffect(() => {
    // Only fetch data when 'myBubble' tab is active.
    if (activeTab === "myBubble") {
      fetchMyBubbles();
    }
  }, [activeTab, session]);

  // Always set to myBubble tab and refresh data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setActiveTab("myBubble");
      fetchMyBubbles();
    }, [])
  );

  // --- Image-related functions ---
  const handleImageOptions = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageOptionsModal(true);
  };

  // --- Image handling functions ---

  const handleTakePhoto = async () => {
    console.log("[ProfileScreen] handleTakePhoto started");
    setShowImageOptionsModal(false);

    if (!session?.user || selectedImageIndex === null) {
      Alert.alert("Error", "You must be logged in to upload images.");
      return;
    }

    // Set loading state
    const loadingImages = [...currentImages];
    loadingImages[selectedImageIndex] = { isLoading: true };
    setCurrentImages(loadingImages);

    try {
      // Use unified upload hook for camera
      const result = await pickAndUploadImage(session.user.id, 'camera');

      if (result) {
        // Update with public URL
        const finalImages = [...currentImages];
        finalImages[selectedImageIndex] = { url: result.publicUrl };
        setCurrentImages(finalImages);
        console.log(`[ProfileScreen] Camera image uploaded successfully at position ${selectedImageIndex}: ${result.publicUrl}`);
      } else {
        // Revert loading state if upload failed
        const revertedImages = [...currentImages];
        revertedImages[selectedImageIndex] = null;
        setCurrentImages(revertedImages);
      }
    } catch (error) {
      console.error("Camera image upload failed:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");

      // Revert loading state
      const revertedImages = [...currentImages];
      revertedImages[selectedImageIndex] = null;
      setCurrentImages(revertedImages);
    }

    setSelectedImageIndex(null);
  };

  const handlePickImage = async () => {
    console.log("[ProfileScreen] handlePickImage started");
    setShowImageOptionsModal(false);

    if (!session?.user || selectedImageIndex === null) {
      Alert.alert("Error", "You must be logged in to upload images.");
      return;
    }

    // Set loading state
    const loadingImages = [...currentImages];
    loadingImages[selectedImageIndex] = { isLoading: true };
    setCurrentImages(loadingImages);

    try {
      // Use unified upload hook for library
      const result = await pickAndUploadImage(session.user.id, 'library');

      if (result) {
        // Update with public URL
        const finalImages = [...currentImages];
        finalImages[selectedImageIndex] = { url: result.publicUrl };
        setCurrentImages(finalImages);
        console.log(`[ProfileScreen] Library image uploaded successfully at position ${selectedImageIndex}: ${result.publicUrl}`);
      } else {
        // Revert loading state if upload failed
        const revertedImages = [...currentImages];
        revertedImages[selectedImageIndex] = null;
        setCurrentImages(revertedImages);
      }
    } catch (error) {
      console.error("Library image upload failed:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");

      // Revert loading state
      const revertedImages = [...currentImages];
      revertedImages[selectedImageIndex] = null;
      setCurrentImages(revertedImages);
    }

    setSelectedImageIndex(null);
  };

  const handleRemoveImage = () => {
    if (selectedImageIndex !== null) {
      const updatedImages = [...currentImages];
      updatedImages[selectedImageIndex] = null;
      setCurrentImages(updatedImages);
    }
    setShowImageOptionsModal(false);
    setSelectedImageIndex(null);
  };

  // --- [Completely replaced] Server save function ---
  const saveProfileToServer = async () => {
    console.log("[ProfileScreen] saveProfileToServer started");

    if (!session?.user || !editingProfile) {
      console.log(
        "[ProfileScreen] No session or editing profile, stopping save."
      );
      return;
    }

    setSaving(true);
    setShowSaveModal(false);

    try {
      const { user } = session;
      console.log(`[ProfileScreen] User ID: ${user.id}`);

      // 1. Prepare image list - simplified since all images already have public URLs
      console.log("[ProfileScreen] Step 1: Preparing image list");
      console.log(
        "[ProfileScreen] Current image state:",
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
          console.log(`[ProfileScreen] Image ${index}: Empty slot`);
          return { position: index, url: null };
        }

        console.log(`[ProfileScreen] Image ${index}: Using existing public URL: ${image.url}`);
        return { position: index, url: image.url };
      });
      console.log("[ProfileScreen] Prepared image results:", resolvedImages);

      // 2. Generate final image list to save to DB
      console.log("[ProfileScreen] Step 2: Generating image list for DB storage");
      const imagesToInsert = resolvedImages
        .filter((img): img is { position: number; url: string } => !!img?.url)
        .map((img) => ({
          user_id: user.id,
          image_url: img.url,
          position: img.position,
        }));

      console.log("[ProfileScreen] Image list to save to DB:", imagesToInsert);

      // 3. Atomically replace DB image list (delete then insert)
      console.log("[ProfileScreen] Step 3: Deleting existing image data");
      const { error: deleteError } = await supabase
        .from("user_images")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) {
        console.error("[ProfileScreen] Failed to delete existing images:", deleteError);
        throw deleteError;
      }
      console.log("[ProfileScreen] Existing images deleted successfully");

      if (imagesToInsert.length > 0) {
        console.log("[ProfileScreen] Step 4: Inserting new image data");
        const { error: imagesError } = await supabase
          .from("user_images")
          .insert(imagesToInsert);
        if (imagesError) {
          console.error(
            "[ProfileScreen] Failed to insert new image data:",
            imagesError
          );
          throw imagesError;
        }
        console.log("[ProfileScreen] New image data inserted successfully");
      } else {
        console.log("[ProfileScreen] No images to insert.");
      }

      // 4. Update profile text information
      console.log("[ProfileScreen] Step 5: Updating profile text information");
      const birthDate =
        editingProfile.birthYear &&
        editingProfile.birthMonth &&
        editingProfile.birthDay
          ? `${editingProfile.birthYear}-${editingProfile.birthMonth}-${editingProfile.birthDay}`
          : profile?.birthDay
          ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
          : null;

      console.log("[ProfileScreen] Profile data to update:", {
        id: user.id,
        firstName: editingProfile.firstName,
        lastName: editingProfile.lastName,
        birthDate,
        height: editingProfile.height,
        mbti: editingProfile.mbti,
        bio: editingProfile.aboutMe,
      });

      const { error: profileError } = await supabase.from("users").upsert({
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
        console.error("[ProfileScreen] Profile update failed:", profileError);
        throw profileError;
      }
      console.log("[ProfileScreen] Profile update successful");

      // 5. Update local state
      console.log("[ProfileScreen] Step 6: Updating local state");
      setProfile(JSON.parse(JSON.stringify(editingProfile))); // Deep copy to reflect changes

      // Update currentImages to ensure only URLs are kept
      const updatedCurrentImages = resolvedImages.map((img) =>
        img.url ? { url: img.url } : null
      );
      console.log(
        "[ProfileScreen] Updated local image state:",
        updatedCurrentImages
      );
      setCurrentImages(updatedCurrentImages);

      console.log("[ProfileScreen] saveProfileToServer complete");
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("[ProfileScreen] saveProfileToServer error occurred:", error);
      console.error("[ProfileScreen] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      console.log(
        "[ProfileScreen] saveProfileToServer ended - setting saving to false"
      );
      setSaving(false);
    }
  };

  // --- Existing functions ---
  const navigateToSettings = () => {
    router.push("/settings");
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Set active bubble function
  const handleSetActiveBubble = async (bubbleId: string) => {
    if (!session?.user) return;
    
    try {
      console.log("[ProfileScreen] Starting active bubble setup:", bubbleId);
      
      const { data, error } = await supabase.rpc("set_user_active_bubble", {
        p_user_id: session.user.id,
        p_group_id: bubbleId,
      });
      
      if (error) {
        console.error("[ProfileScreen] Active bubble setup failed:", error);
        Alert.alert("Error", "Failed to set active bubble.");
        return;
      }
      
      if (data) {
        setActiveBubbleId(bubbleId);
        console.log("[ProfileScreen] Active bubble setup successful:", bubbleId);
        Alert.alert("Success!", "Active bubble has been set");
      }
    } catch (error) {
      console.error("[ProfileScreen] Error during active bubble setup:", error);
      Alert.alert("Error", "Failed to set active bubble.");
    }
  };

  // Leave group function
  const handleLeaveGroup = async (bubbleId: string) => {
    if (!session?.user) return;
    
    Alert.alert(
      "Do you want to pop this bubble?",
      "Popped bubbles can't be restored.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pop",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[ProfileScreen] Starting leave group:", bubbleId);
              
              const { data, error } = await supabase.rpc("leave_group", {
                p_user_id: session.user.id,
                p_group_id: bubbleId,
              });
              
              if (error) {
                console.error("[ProfileScreen] Failed to leave group:", error);
                Alert.alert("Error", "Failed to pop bubble.");
                return;
              }
              
              if (!data || !data.success) {
                console.error("[ProfileScreen] Failed to pop bubble:", data?.message || "Unknown error");
                Alert.alert("Error", data?.message || "Failed to pop bubble.");
                return;
              }

              console.log(`[ProfileScreen] Successfully popped bubble: "${data.group_name}" by ${data.popper_name}`);
              
              // If active bubble was the deleted bubble, remove active status
              if (activeBubbleId === bubbleId) {
                setActiveBubbleId(null);
              }
              
              // Refresh bubble list
              fetchMyBubbles();
              
              Alert.alert(
                "Bubble Popped! 💥", 
                `"${data.group_name}" has been destroyed.`
              );
            } catch (error) {
              console.error("[ProfileScreen] Error while leaving group:", error);
              Alert.alert("Error", "Failed to pop bubble.");
            }
          },
        },
      ]
    );
  };


  // Calculate image grid layout
  const screenWidth = Dimensions.get("window").width;
  const contentPaddingHorizontal =
    styles.editProfileTabContent.paddingHorizontal;
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  // Render each image slot function
  const renderImageSlot = (index: number) => {
    const imageAsset = currentImages[index];

    return (
      <View
        key={index}
        style={[
          styles.imageSlotContainer,
          { width: itemSize, height: itemSize },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.imageSlotButton,
            {
              backgroundColor: colors.lightGray,
            },
          ]}
          onPress={() => handleImageOptions(index)}
          activeOpacity={0.7}
        >
          {imageAsset ? (
            imageAsset.isLoading ? (
              <View style={[styles.imagePreview, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.lightGray }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <Image
                source={{ uri: imageAsset.url }}
                style={styles.imagePreview}
              />
            )
          ) : (
            <>
              <Text style={[styles.imageSlotNumber, { color: colors.black }]}>
                {index + 1}.
              </Text>
              <View style={styles.imagePlusIconContainer}>
                <Ionicons
                  name="add-circle-outline"
                  size={Math.min(itemSize * 0.3, 32)}
                  color={colors.darkGray}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderProfileDetails = (profile: ProfileFormData) => (
    <View style={styles.profileDetailsContainer}>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          First name<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text style={[styles.detailValue, { color: colors.black, borderBottomColor: colors.darkGray }]}>
          {editingProfile?.firstName || 'Not available'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Last name<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text style={[styles.detailValue, { color: colors.black, borderBottomColor: colors.darkGray }]}>
          {editingProfile?.lastName || 'Not available'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Age<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text style={[styles.detailValue, { color: colors.black, borderBottomColor: colors.darkGray }]}>
          {editingProfile?.age ? `${editingProfile.age} years old` : 'Not available'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Height (cm)
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.height?.toString() || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) =>
              prev ? { ...prev, height: parseInt(text) || 0 } : null
            )
          }
          placeholder="Enter height"
          placeholderTextColor={colors.darkGray}
          keyboardType="numeric"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          MBTI
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.mbti || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) => (prev ? { ...prev, mbti: text } : null))
          }
          placeholder="Enter MBTI"
          placeholderTextColor={colors.darkGray}
          autoCapitalize="characters"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Description
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            {
              color: colors.black,
              borderBottomColor: colors.darkGray,
            },
          ]}
          value={editingProfile?.aboutMe || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) =>
              prev ? { ...prev, aboutMe: text } : null
            )
          }
          placeholder="Tell us about yourself"
          placeholderTextColor={colors.darkGray}
          textAlignVertical="top"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Gender<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text style={[styles.detailValue, { color: colors.black, borderBottomColor: colors.darkGray }]}>
          {editingProfile?.gender ? editingProfile.gender.charAt(0).toUpperCase() + editingProfile.gender.slice(1) : 'Not specified'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Preferred Gender<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text style={[styles.detailValue, { color: colors.black, borderBottomColor: colors.darkGray }]}>
          {editingProfile?.preferredGender ? editingProfile.preferredGender.charAt(0).toUpperCase() + editingProfile.preferredGender.slice(1) : 'Not specified'}
        </Text>
      </View>

      {/* 저장 버튼 */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowSaveModal(true)}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === "bubblePro") {
      return (
        <View style={styles.emptyTabContainer}>
          {/* Empty state - no content to match target design */}
        </View>
      );
    } else if (activeTab === "myBubble") {
      return (
        <View style={styles.myBubbleContainer}>
          {/* Show skeleton UI while loading bubbles */}
          {bubblesLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBubbleItem key={index} />
              ))}
            </>
          ) : (
            <>
              {/* 2. When there are bubbles in the list */}
              {myBubbles.length > 0 ? (
                myBubbles.map((bubble) => (
                  <BubbleTabItem
                    key={bubble.id}
                    bubble={bubble}
                    isActive={activeBubbleId === bubble.id}
                    onPress={() => {
                      // Navigate to different interfaces based on bubble status
                      // forming: waiting screen, full: update screen
                      router.push({
                        pathname: "/bubble/form",
                        params: {
                          groupId: bubble.id,
                          isExistingBubble: bubble.status === 'full' ? "true" : "false",
                        },
                      });
                    }}
                    onSetActive={() => handleSetActiveBubble(bubble.id)}
                    onLeaveGroup={() => handleLeaveGroup(bubble.id)}
                  />
                ))
              ) : (
                // 3. When there are no bubbles - Show "Make new bubble" UI
                <View style={styles.makeNewBubbleContainer}>
                  <Text style={[styles.makeNewBubbleText, { color: colors.black }]}>
                    Make a new bubble !
                  </Text>
                  <TouchableOpacity
                    style={[styles.makeNewBubbleButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateBubbleModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="add"
                      size={40}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <CreateBubbleModal
            visible={showCreateBubbleModal}
            onClose={() => setShowCreateBubbleModal(false)}
            onRefresh={fetchMyBubbles}
          />
        </View>
      );
    } else if (activeTab === "myInfo") {
      return (
        <View style={styles.editProfileTabContent}>
          {/* Image input grid */}
          <View style={styles.imageGridContainer}>
            {Array.from({ length: MAX_IMAGES_DEFAULT }).map((_, index) =>
              renderImageSlot(index)
            )}
          </View>
          {/* Profile details (edit fields) */}
          {editingProfile && renderProfileDetails(editingProfile)}
        </View>
      );
    }
    return null;
  };

  // --- Loading and no data UI handling ---
  if (loading) {
    return (
      <CustomView style={{ backgroundColor: colors.white }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHero
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            username={profile?.username}
            userId={profile?.userId}
            imageUrl={currentImages[0]?.url || currentImages[0]?.uri}
            skeleton={loading}
            onSettingsPress={navigateToSettings}
          />
          <ProfileTab
            tabs={TABS_DATA}
            activeTabId={activeTab}
            onTabPress={(tabId, index) => handleTabChange(tabId)}
          />
          {activeTab === "bubblePro" && (
            <View style={styles.emptyTabContainer}>
              {/* Empty state during loading */}
            </View>
          )}
          {activeTab === "myBubble" && (
            <View style={styles.myBubbleContainer}>
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBubbleItem key={index} />
              ))}
              <TouchableOpacity
                style={styles.createBubbleRow}
                onPress={() => setShowCreateBubbleModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.createBubbleContent}>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color="#5A99E5"
                  />
                  <Text style={styles.createBubbleText}>Create New Bubble</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#C0C0C0" />
              </TouchableOpacity>
            </View>
          )}
          {activeTab === "myInfo" && (
            <View style={styles.editProfileTabContent}>
              <SkeletonImageGrid />
              <SkeletonProfileDetails />
            </View>
          )}
        </ScrollView>

        <CreateBubbleModal
          visible={showCreateBubbleModal}
          onClose={() => setShowCreateBubbleModal(false)}
          onRefresh={fetchMyBubbles}
        />
      </CustomView>
    );
  }

  if (!profile) {
    return (
      <CustomView style={{ backgroundColor: colors.white }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.black,
              fontSize: 16,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            Could not load profile. Please try again later.
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, marginTop: 20 },
            ]}
            onPress={() => window.location.reload()}
          >
            <Text style={[styles.saveButtonText, { color: colors.white }]}>
              Retry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { borderColor: colors.error, marginTop: 15 },
            ]}
            onPress={async () => {
              try {
                await signOut();
                router.replace("/login");
              } catch (error) {
                console.error("Logout error:", error);
                Alert.alert("Error", "Failed to logout. Please try again.");
              }
            }}
          >
            <Text style={[styles.logoutButtonText, { color: colors.error }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </CustomView>
    );
  }

  return (
    <CustomView style={{ backgroundColor: colors.white }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Pass actual data to ProfileHero */}
        <ProfileHero
          firstName={profile.firstName}
          lastName={profile.lastName}
          username={profile.username}
          userId={profile.userId}
          imageUrl={currentImages[0]?.url || currentImages[0]?.uri}
          skeleton={false}
          onSettingsPress={navigateToSettings}
        />
        <ProfileTab
          tabs={TABS_DATA}
          activeTabId={activeTab}
          onTabPress={(tabId, index) => handleTabChange(tabId)}
        />
        {renderTabContent()}
      </ScrollView>

      {/* Save confirmation modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.white }]}
          >
            <Text style={[styles.modalTitle, { color: colors.black }]}>
              Do you want to save the changes?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.darkGray }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text
                  style={[styles.modalButtonText, { color: colors.darkGray }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={saveProfileToServer}
              >
                <Text style={[styles.modalButtonText, { color: colors.white }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image options modal */}
      <Modal
        visible={showImageOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.imageOptionsModal,
              { backgroundColor: colors.white },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.black }]}>
              Image Options
            </Text>
            <TouchableOpacity
              style={styles.imageOptionButton}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={[styles.imageOptionText, { color: colors.black }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageOptionButton}
              onPress={handlePickImage}
            >
              <Ionicons name="images" size={24} color={colors.primary} />
              <Text style={[styles.imageOptionText, { color: colors.black }]}>
                Select from Gallery
              </Text>
            </TouchableOpacity>
            {currentImages[selectedImageIndex || 0] && (
              <TouchableOpacity
                style={styles.imageOptionButton}
                onPress={handleRemoveImage}
              >
                <Ionicons name="trash" size={24} color={colors.error} />
                <Text style={[styles.imageOptionText, { color: colors.error }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.imageOptionButton, { marginTop: 20 }]}
              onPress={() => setShowImageOptionsModal(false)}
            >
              <Text
                style={[styles.imageOptionText, { color: colors.darkGray }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </CustomView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editProfileTabContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 100,
  },
  profileDetailsContainer: {
    paddingTop: 30,
  },
  detailItem: {
    marginBottom: 20,
    paddingBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    marginBottom: 4,
  },
  detailInput: {
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginTop: 4,
  },
  detailValue: {
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 30,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Quicksand-Bold",
  },
  logoutButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: "Quicksand-Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Quicksand-Bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    marginHorizontal: 10,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Quicksand-Bold",
  },
  imageOptionsModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  imageOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: "100%",
    borderRadius: 10,
    marginVertical: 5,
  },
  imageOptionText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    marginLeft: 15,
  },
  imageBackgroundContainer: { flex: 1 },
  contentOverlay: { flex: 1 },
  exploreText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  profileContent: { flex: 1, alignItems: "center", padding: 20 },
  tabContentPlaceholder: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  emptyTabContainer: {
    flex: 1,
    minHeight: 300,
  },
  myBubbleContainer: {
    paddingVertical: 10,
  },
  createBubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0",
  },
  createBubbleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
  },
  createBubbleText: {
    color: 'black', 
    fontSize: 16, 
    fontFamily: 'Quicksand', 
    fontWeight: '700',
    marginLeft: 10,
  },
  imageGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 20,
  },
  imageSlotContainer: {
    marginBottom: 10,
    position: "relative",
  },
  imageSlotButton: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "stretch",
    borderRadius: 12,
    padding: 8,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  imageSlotNumber: {
    position: "absolute",
    top: 5,
    left: 8,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    fontWeight: "500",
  },
  imagePlusIconContainer: {
    position: "absolute",
    bottom: 5,
    right: 5,
  },
  removeImageIconContainer: {
    position: "absolute",
    top: -10,
    right: -10,
    borderRadius: 15,
    padding: 1,
  },
  emptyBubbleContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBubbleText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    lineHeight: 24,
    textAlign: "center",
  },
  makeNewBubbleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  makeNewBubbleText: {
    color: 'black', 
    fontSize: 16, 
    fontFamily: 'Quicksand', 
    fontWeight: '700', 
    textAlign: "center",
    marginBottom: 30,
  },
  makeNewBubbleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skeletonBubbleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#f0f0f0",
    marginVertical: 5,
    borderRadius: 10,
  },
  skeletonBubbleContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  skeletonBubbleAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonBubbleText: {
    marginLeft: 15,
  },
  skeletonImageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  skeletonImageSlot: {
    marginBottom: 10,
    position: "relative",
  },
  skeletonProfileDetails: {
    paddingTop: 30,
  },
  skeletonDetailItem: {
    marginBottom: 20,
    paddingBottom: 10,
  },
});

export default ProfileScreen;
