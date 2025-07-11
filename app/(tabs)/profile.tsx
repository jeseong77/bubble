import React, { useState, useEffect } from "react"; // useEffect 추가
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
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/useAppTheme";
import CustomAppBar from "@/components/CustomAppBar";
import CustomView from "@/components/CustomView";
import { Ionicons } from "@expo/vector-icons";
import { ProfileFormData, ProfileImage } from "@/types/profile";
import ProfileHero from "@/components/ProfileHero";
import ProfileTab, { TabInfo } from "@/components/ProfileTab";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker"; // ImagePicker 임포트
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BubbleItem from "@/components/bubble/BubbleItem"; // BubbleItem import 추가
import CreateBubbleModal from "@/components/ui/CreateBubbleModal"; // CreateBubbleModal import 추가

// 목업 프로필 데이터 (images 필드는 currentImages 상태로 관리)
const mockProfileData: ProfileFormData = {
  userId: "john_doe_123",
  firstName: "Noah",
  lastName: "Kim",
  age: 30,
  birthDay: "15",
  birthMonth: "07",
  birthYear: "1994",
  height: 180,
  mbti: "INFP",
  gender: "Man",
  genderVisibleOnProfile: true,
  aboutMe:
    "Loves coding, hiking, and exploring new coffee shops. Always looking for new adventures and interesting people to meet!",
  images: Array(6).fill(null),
};

// Mock bubble data for My Bubble section
const mockBubbleData = [
  {
    id: "1",
    title: "Coffee Lovers",
    status: "Active",
    users: [
      {
        id: "user1",
        avatar: "https://picsum.photos/seed/noah_kim/200/200",
      },
      {
        id: "user2",
        avatar: "https://picsum.photos/seed/user2/200/200",
      },
    ],
  },
];

const TABS_DATA: TabInfo[] = [
  { id: "bubblePro", title: "Bubble pro" },
  { id: "myBubble", title: "My Bubble" },
  { id: "myInfo", title: "Edit Profile" },
];

// ImageUploadStep에서 가져온 상수들
const NUM_COLUMNS = 3;
const MAX_IMAGES_DEFAULT = 6;

function ProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const bottomHeight = useBottomTabBarHeight();
  const topPadding = useSafeAreaInsets().top + 56;

  const [activeTab, setActiveTab] = useState<string>(TABS_DATA[0].id);
  const [showCreateBubbleModal, setShowCreateBubbleModal] = useState(false);

  // 이미지 상태 관리
  const [currentImages, setCurrentImages] = useState<(ProfileImage | null)[]>(
    mockProfileData.images.slice(0, MAX_IMAGES_DEFAULT)
  );

  const navigateToSettings = () => {
    router.push("/settings");
  };

  const iconColorForAppBar = colors.black;
  const logoTextColor = colors.black;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleCreateBubble = (bubbleType: "2-2" | "3-3" | "4-4") => {
    console.log(`Creating new bubble: ${bubbleType}`);
    setShowCreateBubbleModal(false);
    // Navigate to bubble form page
    router.push("/bubble/form");
  };

  // 이미지 그리드 레이아웃 계산
  const screenWidth = Dimensions.get("window").width;
  const contentPaddingHorizontal =
    styles.editProfileTabContent.paddingHorizontal;
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  // 이미지 선택 로직
  const handlePickImage = async (index: number) => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Permission to access camera roll is required to upload images."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newProfileImage: ProfileImage = { uri: result.assets[0].uri };
        const updatedImages = [...currentImages];
        updatedImages[index] = newProfileImage;
        setCurrentImages(updatedImages);
      }
    } catch (error) {
      console.error("ImagePicker Error: ", error);
      Alert.alert("Image Error", "Could not select image. Please try again.");
    }
  };

  const handleRemoveImage = (index: number) => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const updatedImages = [...currentImages];
          updatedImages[index] = null;
          setCurrentImages(updatedImages);
        },
      },
    ]);
  };

  // 각 이미지 슬롯 렌더링 함수
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
          onPress={() =>
            imageAsset ? handleRemoveImage(index) : handlePickImage(index)
          }
          activeOpacity={0.7}
        >
          {imageAsset ? (
            <Image
              source={{ uri: imageAsset.uri }}
              style={styles.imagePreview}
            />
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
        {imageAsset && (
          <TouchableOpacity
            onPress={() => handleRemoveImage(index)}
            style={[
              styles.removeImageIconContainer,
              { backgroundColor: colors.white },
            ]}
          >
            <Ionicons
              name="close-circle"
              size={Math.min(itemSize * 0.25, 28)}
              color={colors.error}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderProfileDetails = (profile: ProfileFormData) => (
    <View style={styles.profileDetailsContainer}>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          First name
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.firstName}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Last name
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.lastName}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Age
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.age ?? "N/A"}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Height
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.height ? `${profile.height} cm` : "N/A"}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          MBTI
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.mbti ?? "N/A"}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Description
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.aboutMe || "No information provided."}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem,
          {
            borderBottomColor: colors.darkGray,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Gender
        </Text>
        <Text style={[styles.detailValue, { color: colors.black }]}>
          {profile.gender}
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === "bubblePro") {
      return (
        <View style={styles.tabContentPlaceholder}>
          <Text style={{ color: colors.black }}>Bubble Pro Content</Text>
        </View>
      );
    } else if (activeTab === "myBubble") {
      return (
        <View style={styles.myBubbleContainer}>
          {mockBubbleData.map((bubble) => (
            <BubbleItem
              key={bubble.id}
              bubble={bubble}
              onPress={() => console.log(`Bubble ${bubble.title} pressed`)}
            />
          ))}
          <TouchableOpacity
            style={styles.createBubbleRow}
            onPress={() => setShowCreateBubbleModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.createBubbleContent}>
              <Ionicons name="add-circle-outline" size={24} color="#5A99E5" />
              <Text style={styles.createBubbleText}>Create New Bubble</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#C0C0C0" />
          </TouchableOpacity>

          <CreateBubbleModal
            visible={showCreateBubbleModal}
            onClose={() => setShowCreateBubbleModal(false)}
            onCreate={handleCreateBubble}
          />
        </View>
      );
    } else if (activeTab === "myInfo") {
      // "Edit Profile" 탭
      return (
        <View style={styles.editProfileTabContent}>
          {/* 이미지 입력 그리드 */}
          <View style={styles.imageGridContainer}>
            {Array.from({ length: MAX_IMAGES_DEFAULT }).map((_, index) =>
              renderImageSlot(index)
            )}
          </View>
          {/* 프로필 상세 정보 (편집 필드) */}
          {renderProfileDetails(mockProfileData)}
        </View>
      );
    }
    return null;
  };

  return (
    <CustomView style={{ backgroundColor: colors.white }}>
      <CustomAppBar
        leftComponent={
          <Text
            style={{
              fontFamily: "Quicksand-Bold",
              fontSize: 22,
              color: logoTextColor,
            }}
          >
            Bubble
          </Text>
        }
        rightComponent={
          <TouchableOpacity
            onPress={navigateToSettings}
            style={styles.appBarIconButton}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={iconColorForAppBar}
            />
          </TouchableOpacity>
        }
        background={true}
        blurIntensity={70}
        extendStatusBar
      />
      <ScrollView
        style={[styles.container, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero />
        <ProfileTab
          tabs={TABS_DATA}
          activeTabId={activeTab}
          onTabPress={(tabId) => handleTabChange(tabId)}
        />
        {renderTabContent()}
      </ScrollView>
    </CustomView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBarIconButton: {
    padding: 10,
  },
  editProfileTabContent: {
    paddingHorizontal: 20, // 이 값은 itemSize 계산 시 contentPaddingHorizontal로 사용됨
    paddingBottom: Platform.OS === "ios" ? 30 : 100,
  },
  profileDetailsContainer: {
    paddingTop: 30,
  },
  detailItem: {
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
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
    fontSize: 16,
    fontWeight: "500",
    color: "#5A99E5",
    marginLeft: 10,
  },
  imageGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 20,
  },
  imageSlotContainer: {
    marginBottom: 10, // 아이템 간 하단 간격 (itemGap과 유사)
    position: "relative",
  },
  imageSlotButton: {
    flex: 1,
    justifyContent: "space-between", // 내부 요소 (숫자, +아이콘) 배치
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
    top: -10, // 아이콘 위치 조정
    right: -10, // 아이콘 위치 조정
    borderRadius: 15, // 아이콘 배경의 둥근 처리
    padding: 1,
  },
});

export default ProfileScreen;
