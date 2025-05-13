import React, { useState, useEffect } from "react"; // useEffect 추가
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform, // Platform 추가
  Alert, // Alert 추가
  Image, // Image는 원래 있었음
  // 사용하지 않는 임포트는 사용자의 요청에 따라 유지
  Button,
  ImageBackground,
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

// 목업 프로필 데이터 (images 필드는 currentImages 상태로 관리)
const mockProfileData: ProfileFormData = {
  userId: "john_doe_123",
  firstName: "John",
  lastName: "Doe",
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
  images: Array(6).fill(null), // 초기에는 6개의 빈 슬롯으로 설정
};

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
  // girl2Image, logoSource는 현재 JSX에서 직접 사용되지 않지만 유지
  const girl2Image = require("../../assets/images/girl4.png");
  const logoSource = require("../../assets/images/logo.png");

  const [activeTab, setActiveTab] = useState<string>(TABS_DATA[0].id);

  // [추가] 이미지 상태 관리
  const [currentImages, setCurrentImages] = useState<(ProfileImage | null)[]>(
    mockProfileData.images.slice(0, MAX_IMAGES_DEFAULT)
  );

  const navigateToSettings = () => {
    router.push("/settings");
  };

  const iconColorForAppBar = colors.onBackground;
  const logoTextColor = colors.onBackground;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // [추가] 이미지 그리드 레이아웃 계산
  const screenWidth = Dimensions.get("window").width;
  // "Edit Profile" 탭 콘텐츠 전체의 좌우 패딩 (styles.editProfileTabContent.paddingHorizontal과 일치)
  const contentPaddingHorizontal =
    styles.editProfileTabContent.paddingHorizontal; // StyleSheet 참조
  const itemGap = 10; // 슬롯 간 간격
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  // [추가] 이미지 선택 로직
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
        aspect: [1, 1], // 정사각형 이미지
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

  // [추가] 각 이미지 슬롯 렌더링 함수
  const renderImageSlot = (index: number) => {
    const imageAsset = currentImages[index];

    return (
      <View
        key={index}
        style={[
          styles.imageSlotContainer, // StyleSheet 참조
          { width: itemSize, height: itemSize },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.imageSlotButton, // StyleSheet 참조
            {
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surface, // 이전 답변에서 surfaceContainerHighest 대신 surface로 변경
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
              style={styles.imagePreview} // StyleSheet 참조
            />
          ) : (
            <>
              <Text
                style={[
                  styles.imageSlotNumber, // StyleSheet 참조
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {index + 1}.
              </Text>
              <View style={styles.imagePlusIconContainer}>
                <Ionicons
                  name="add-circle-outline"
                  size={Math.min(itemSize * 0.3, 32)}
                  color={colors.onSurfaceVariant}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
        {imageAsset && (
          <TouchableOpacity
            onPress={() => handleRemoveImage(index)}
            style={[
              styles.removeImageIconContainer, // StyleSheet 참조
              { backgroundColor: colors.background },
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
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          First name
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.firstName}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          Last name
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.lastName}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          Age
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.age ?? "N/A"}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          Height
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.height ? `${profile.height} cm` : "N/A"}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          MBTI
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.mbti ?? "N/A"}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          Description
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.aboutMe || "No information provided."}
        </Text>
      </View>
      <View
        style={[
          styles.detailItem, // StyleSheet 참조
          {
            borderBottomColor: colors.outlineVariant, // 마지막 아이템에도 선이 보이도록 borderBottomWidth:1 유지
            borderBottomWidth: 1, // 명시적으로 1로 설정 (이전 코드에서 마지막은 0이었음)
          },
        ]}
      >
        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
          Gender
        </Text>
        <Text style={[styles.detailValue, { color: colors.onBackground }]}>
          {profile.gender}
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === "bubblePro") {
      return (
        <View style={styles.tabContentPlaceholder}>
          {/* StyleSheet 참조 */}
          <Text style={{ color: colors.onBackground }}>Bubble Pro Content</Text>
        </View>
      );
    } else if (activeTab === "myBubble") {
      return (
        <View style={styles.tabContentPlaceholder}>
          {/* StyleSheet 참조 */}
          <Text style={{ color: colors.onBackground }}>My Bubble Content</Text>
        </View>
      );
    } else if (activeTab === "myInfo") {
      // "Edit Profile" 탭
      return (
        <View style={styles.editProfileTabContent}>
          {/* StyleSheet 참조 */}
          {/* 이미지 입력 그리드 */}
          <View style={styles.imageGridContainer}>
            {/* StyleSheet 참조 */}
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
    <CustomView style={{ backgroundColor: colors.background }}>
      <CustomAppBar
        leftComponent={
          <Text
            style={{
              fontFamily: "Literata",
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
            style={styles.appBarIconButton} // StyleSheet 참조
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={iconColorForAppBar}
            />
          </TouchableOpacity>
        }
        background={true}
        blurIntensity={70} // 사용자가 제공한 값 (이전엔 10)
        extendStatusBar
      />
      <ScrollView
        style={[
          styles.container,
          { marginBottom: bottomHeight, paddingTop: topPadding },
        ]} // StyleSheet 참조
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero />
        <ProfileTab
          tabs={TABS_DATA}
          activeTabId={activeTab}
          onTabPress={(tabId) => handleTabChange(tabId)}
        />
        {/* SafeAreaView를 제거하고, Tab Content의 루트 View에서 패딩을 관리하도록 변경 */}
        {/* 이전에는 renderTabContent() 결과를 View로 한번 더 감쌌었음 */}
        {renderTabContent()}
      </ScrollView>
    </CustomView>
  );
}

// StyleSheet.create(...)는 이 아래에 위치합니다.
// ... (기존 StyleSheet 코드는 여기에 그대로 유지됩니다) ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingBottom: 30, // marginBottom: bottomHeight로 대체됨
  },
  appBarIconButton: {
    padding: 10,
  },
  // "Edit Profile" 탭 전체 콘텐츠를 감싸는 View의 스타일
  editProfileTabContent: {
    paddingHorizontal: 20, // 이 값은 itemSize 계산 시 contentPaddingHorizontal로 사용됨
    paddingBottom: 30, // 스크롤 하단 여유 공간
  },
  profileDetailsContainer: {
    // paddingHorizontal은 editProfileTabContent에서 이미 적용됨
    paddingTop: 30, // 이미지 그리드와의 간격
    // paddingBottom: 20, // editProfileTabContent의 paddingBottom으로 대체
  },
  detailItem: {
    marginBottom: 20,
    borderBottomWidth: 1,
    // borderBottomColor는 인라인으로 적용
    paddingBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Literata",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontFamily: "Literata",
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
  // --- ImageUploadStep에서 가져온 스타일 (수정 적용) ---
  imageGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    // paddingHorizontal은 editProfileTabContent에서 이미 적용됨
    paddingTop: 20, // 탭 바 또는 이전 요소와의 간격
  },
  imageSlotContainer: {
    marginBottom: 10, // 아이템 간 하단 간격 (itemGap과 유사)
    position: "relative",
  },
  // requiredImageText: { // 현재 사용 안 함
  //   position: "absolute", top: -18, left: 0, fontSize: 12,
  //   fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium", fontWeight: "500",
  // },
  imageSlotButton: {
    flex: 1,
    justifyContent: "space-between", // 내부 요소 (숫자, +아이콘) 배치
    alignItems: "stretch", // 내부 요소가 stretch되도록 (필요시 center로)
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 8,
    // borderColor, backgroundColor는 인라인으로 적용
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10, // 버튼의 borderRadius보다 약간 작게
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
    // backgroundColor: 'rgba(0,0,0,0.1)', // 아이콘 배경 (선택 사항)
    // borderRadius: 16,
  },
  removeImageIconContainer: {
    position: "absolute",
    top: -10, // 아이콘 위치 조정
    right: -10, // 아이콘 위치 조정
    borderRadius: 15, // 아이콘 배경의 둥근 처리
    padding: 1,
    // backgroundColor는 인라인으로 적용 (예: colors.background 또는 반투명)
  },
});

export default ProfileScreen;
