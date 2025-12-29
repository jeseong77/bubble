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
import { Skeleton } from "@/components/feedback/SkeletonLoader";
import { ProfileBubbles } from "@/components/profile/ProfileBubbles";
import { EditProfileTab } from "@/components/profile/EditProfileTab";

// --- Imports for data integration ---
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useProfileData } from "@/hooks/useProfileData";
import { useProfileSave } from "@/hooks/useProfileSave";
import { useBubbleActions } from "@/hooks/useBubbleActions";

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
          <Skeleton.Box
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
          <Skeleton.Box width={80} height={14} style={{ marginBottom: 8 }} />
          <Skeleton.Box width="100%" height={20} />
        </View>
      ))}
      <Skeleton.Box
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

  // Use profile data hook
  const {
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
  } = useProfileData(session);

  // Use profile save hook
  const { saving, saveProfileToServer } = useProfileSave({
    session,
    editingProfile,
    profile,
    currentImages,
    setProfile,
    setCurrentImages,
  });

  // Use bubble actions hook
  const { handleSetActiveBubble, handleLeaveGroup } = useBubbleActions({
    session,
    activeBubbleId,
    setActiveBubbleId,
    fetchMyBubbles,
  });

  const [activeTab, setActiveTab] = useState<string>(params.activeTab as string || "myBubble");
  const [showCreateBubbleModal, setShowCreateBubbleModal] = useState(false);

  // --- New states ---
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  // --- Data fetching moved to useProfileData hook ---

  // Fetch bubbles when myBubble tab is active
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

  // --- Save function moved to useProfileSave hook ---

  // --- Existing functions ---
  const navigateToSettings = () => {
    router.push("/settings");
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // --- Bubble actions moved to useBubbleActions hook ---

  const renderTabContent = () => {
    if (activeTab === "bubblePro") {
      return (
        <View style={styles.emptyTabContainer}>
          {/* Empty state - no content to match target design */}
        </View>
      );
    } else if (activeTab === "myBubble") {
      return (
        <ProfileBubbles
          bubbles={myBubbles}
          isLoading={bubblesLoading}
          activeBubbleId={activeBubbleId}
          onSetActiveBubble={handleSetActiveBubble}
          onLeaveGroup={handleLeaveGroup}
          onRefresh={fetchMyBubbles}
        />
      );
    } else if (activeTab === "myInfo") {
      return (
        <EditProfileTab
          editingProfile={editingProfile}
          onProfileChange={(profile) => setEditingProfile(profile)}
          currentImages={currentImages}
          onImageSelect={handleImageOptions}
          onSavePress={() => setShowSaveModal(true)}
          saving={saving}
        />
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
