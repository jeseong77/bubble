import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/useAppTheme";
import CustomAppBar from "@/components/CustomAppBar";
import CustomView from "@/components/CustomView";
import { Ionicons } from "@expo/vector-icons";
import { ProfileFormData, ProfileImage } from "@/types/profile";
import ProfileHero from "@/components/ProfileHero";
import ProfileTab, { TabInfo } from "@/components/ProfileTab";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BubbleItem from "@/components/bubble/BubbleItem";
import CreateBubbleModal from "@/components/ui/CreateBubbleModal";
import * as Camera from "expo-camera";

// --- 데이터 연동을 위한 import 추가 ---
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { decode } from "base64-arraybuffer"; // base64 디코딩 라이브러리 추가

// Mock bubble data for My Bubble section (요청에 따라 유지)
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

  // --- 상태 관리 ---
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [editingProfile, setEditingProfile] = useState<ProfileFormData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentImages, setCurrentImages] = useState<(ProfileImage | null)[]>(
    Array(MAX_IMAGES_DEFAULT).fill(null)
  );
  const [activeTab, setActiveTab] = useState<string>(TABS_DATA[0].id);
  const [showCreateBubbleModal, setShowCreateBubbleModal] = useState(false);

  // --- 새로운 상태들 ---
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  // --- [수정됨] 데이터 Fetching useEffect ---
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { user } = session;

        // 1. public.users 테이블에서 프로필 정보 가져오기 (변경 없음)
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error("Profile not found.");

        // 2. public.user_images 테이블에서 이미지 경로(URL) 가져오기 (변경 없음)
        const { data: imagesData, error: imagesError } = await supabase
          .from("user_images")
          .select("image_url, position")
          .eq("user_id", user.id)
          .order("position", { ascending: true });

        if (imagesError) throw imagesError;

        // --- 👇 [핵심 수정] Signed URL 생성 로직 추가 ---
        // 3. 가져온 이미지 경로로 Signed URL 생성
        const imagePaths = imagesData.map((item) => {
          // 전체 URL에서 파일 경로만 추출합니다.
          // 예: https://.../user-images/folder/image.jpg -> folder/image.jpg
          const urlParts = item.image_url.split("/user-images/");
          return { path: urlParts[1], position: item.position };
        });

        // 서명된 URL을 생성할 파일 경로 목록
        const pathsToSign = imagePaths.map((p) => p.path);

        // 한 번에 여러 개의 Signed URL을 효율적으로 생성합니다. (유효시간: 60초)
        const { data: signedUrlsData, error: signedUrlError } =
          await supabase.storage
            .from("user-images")
            .createSignedUrls(pathsToSign, 60);

        if (signedUrlError) throw signedUrlError;

        // 4. 데이터 가공 및 상태 업데이트
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
          age: age,
          birthDay: birthDay,
          birthMonth: birthMonth,
          birthYear: birthYear,
          height: profileData.height_cm,
          mbti: profileData.mbti,
          gender: profileData.gender,
          genderVisibleOnProfile: true,
          aboutMe: profileData.bio,
          images: [],
        };
        setProfile(fetchedProfile);
        setEditingProfile(JSON.parse(JSON.stringify(fetchedProfile)));

        // 최종적으로 화면에 표시할 이미지 상태를 Signed URL로 업데이트합니다.
        const updatedImages: (ProfileImage | null)[] =
          Array(MAX_IMAGES_DEFAULT).fill(null);

        signedUrlsData.forEach((signedUrl) => {
          const originalImage = imagePaths.find(
            (p) => p.path === signedUrl.path
          );
          if (originalImage) {
            updatedImages[originalImage.position] = {
              url: signedUrl.signedUrl,
            };
          }
        });

        setCurrentImages(updatedImages);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchProfileData();
    }
  }, [session]);

  // --- 이미지 관련 함수들 ---
  const handleImageOptions = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageOptionsModal(true);
  };

  // --- [수정됨] handleTakePhoto 함수 ---
  const handleTakePhoto = async () => {
    setShowImageOptionsModal(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // base64 옵션 추가
    });

    if (!result.canceled && result.assets?.[0]) {
      const { uri, base64 } = result.assets[0];
      const newProfileImage: ProfileImage = { uri, base64 }; // uri와 base64 모두 저장
      const updatedImages = [...currentImages];
      if (selectedImageIndex !== null) {
        updatedImages[selectedImageIndex] = newProfileImage;
        setCurrentImages(updatedImages);
      }
    }
    setSelectedImageIndex(null);
  };

  // --- [수정됨] handlePickImage 함수 ---
  const handlePickImage = async () => {
    setShowImageOptionsModal(false);
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Photo library permission is required."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // base64 옵션 추가
    });

    if (!result.canceled && result.assets?.[0]) {
      const { uri, base64 } = result.assets[0];
      const newProfileImage: ProfileImage = { uri, base64 }; // uri와 base64 모두 저장
      const updatedImages = [...currentImages];
      if (selectedImageIndex !== null) {
        updatedImages[selectedImageIndex] = newProfileImage;
        setCurrentImages(updatedImages);
      }
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

  // --- [완전히 교체됨] 서버 저장 함수 ---
  const saveProfileToServer = async () => {
    if (!session?.user || !editingProfile) return;

    setSaving(true);
    setShowSaveModal(false);

    try {
      const { user } = session;

      // 1. 새로 추가/변경 된 이미지만 필터링하여 업로드
      const uploadPromises = currentImages.map(async (image, index) => {
        if (!image) return { position: index, url: null }; // 빈 슬롯

        // base64가 있다면 새로운 이미지이므로 업로드
        if (image.base64) {
          const fileExt = image.uri?.split(".").pop()?.toLowerCase() ?? "jpeg";
          const filePath = `${user.id}/${new Date().getTime()}.${fileExt}`;
          const contentType = `image/${fileExt}`;

          const { data, error: uploadError } = await supabase.storage
            .from("user-images")
            .upload(filePath, decode(image.base64), { contentType });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("user-images")
            .getPublicUrl(data.path);

          return { position: index, url: publicUrlData.publicUrl };
        }
        // base64가 없다면 기존 이미지이므로 URL만 유지
        return { position: index, url: image.url || image.uri };
      });

      const resolvedImages = await Promise.all(uploadPromises);

      // 2. DB에 저장할 최종 이미지 목록 생성
      const imagesToInsert = resolvedImages
        .filter((img): img is { position: number; url: string } => !!img?.url)
        .map((img) => ({
          user_id: user.id,
          image_url: img.url,
          position: img.position,
        }));

      // 3. DB 이미지 목록 원자적으로 교체 (삭제 후 삽입)
      await supabase.from("user_images").delete().eq("user_id", user.id);
      if (imagesToInsert.length > 0) {
        const { error: imagesError } = await supabase
          .from("user_images")
          .insert(imagesToInsert);
        if (imagesError) throw imagesError;
      }

      // 4. 프로필 텍스트 정보 업데이트
      const birthDate =
        editingProfile.birthYear &&
        editingProfile.birthMonth &&
        editingProfile.birthDay
          ? `${editingProfile.birthYear}-${editingProfile.birthMonth}-${editingProfile.birthDay}`
          : profile?.birthDay
          ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
          : null;

      const { error: profileError } = await supabase.from("users").upsert({
        id: user.id,
        first_name: editingProfile.firstName,
        last_name: editingProfile.lastName,
        birth_date: birthDate,
        height_cm: editingProfile.height,
        mbti: editingProfile.mbti,
        gender: editingProfile.gender,
        bio: editingProfile.aboutMe,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      // 5. 로컬 상태 업데이트
      setProfile(JSON.parse(JSON.stringify(editingProfile))); // Deep copy to reflect changes
      // Update currentImages to remove base64 and only keep final URLs
      setCurrentImages(
        resolvedImages.map((img) => (img.url ? { url: img.url } : null))
      );

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // --- 기존 함수들 ---
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
          onPress={() => handleImageOptions(index)}
          activeOpacity={0.7}
        >
          {imageAsset ? (
            <Image
              source={{ uri: imageAsset.url || imageAsset.uri }}
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
      </View>
    );
  };

  const renderProfileDetails = (profile: ProfileFormData) => (
    <View style={styles.profileDetailsContainer}>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          First name
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.firstName || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) =>
              prev ? { ...prev, firstName: text } : null
            )
          }
          placeholder="Enter first name"
          placeholderTextColor={colors.darkGray}
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Last name
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.lastName || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) =>
              prev ? { ...prev, lastName: text } : null
            )
          }
          placeholder="Enter last name"
          placeholderTextColor={colors.darkGray}
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Age
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.age?.toString() || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) =>
              prev ? { ...prev, age: parseInt(text) || 0 } : null
            )
          }
          placeholder="Enter age"
          placeholderTextColor={colors.darkGray}
          keyboardType="numeric"
        />
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
              height: 80,
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
          multiline
          textAlignVertical="top"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Gender
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.gender || ""}
          onChangeText={(text) =>
            setEditingProfile((prev) =>
              prev ? { ...prev, gender: text } : null
            )
          }
          placeholder="Enter gender"
          placeholderTextColor={colors.darkGray}
        />
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
      return (
        <View style={styles.editProfileTabContent}>
          {/* 이미지 입력 그리드 */}
          <View style={styles.imageGridContainer}>
            {Array.from({ length: MAX_IMAGES_DEFAULT }).map((_, index) =>
              renderImageSlot(index)
            )}
          </View>
          {/* 프로필 상세 정보 (편집 필드) */}
          {editingProfile && renderProfileDetails(editingProfile)}
        </View>
      );
    }
    return null;
  };

  // --- 로딩 및 데이터 없음 UI 처리 ---
  if (loading) {
    return (
      <CustomView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </CustomView>
    );
  }

  if (!profile) {
    return (
      <CustomView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <CustomAppBar
          leftComponent={<Text style={styles.appBarTitle}>Bubble</Text>}
          background={true}
          blurIntensity={70}
          extendStatusBar
        />
        <Text style={{ color: colors.black }}>
          Could not load profile. Please try again later.
        </Text>
      </CustomView>
    );
  }

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
        {/* ProfileHero에 실제 데이터 전달 */}
        <ProfileHero
          firstName={profile.firstName}
          lastName={profile.lastName}
          imageUrl={currentImages[0]?.url || currentImages[0]?.uri}
        />
        <ProfileTab
          tabs={TABS_DATA}
          activeTabId={activeTab}
          onTabPress={(tabId) => handleTabChange(tabId)}
        />
        {renderTabContent()}
      </ScrollView>

      {/* 저장 확인 모달 */}
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
              변경사항을 저장하시겠습니까?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.darkGray }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text
                  style={[styles.modalButtonText, { color: colors.darkGray }]}
                >
                  취소
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
                  확인
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 이미지 옵션 모달 */}
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
              이미지 옵션
            </Text>
            <TouchableOpacity
              style={styles.imageOptionButton}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={[styles.imageOptionText, { color: colors.black }]}>
                사진 찍기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageOptionButton}
              onPress={handlePickImage}
            >
              <Ionicons name="images" size={24} color={colors.primary} />
              <Text style={[styles.imageOptionText, { color: colors.black }]}>
                갤러리에서 선택
              </Text>
            </TouchableOpacity>
            {currentImages[selectedImageIndex || 0] && (
              <TouchableOpacity
                style={styles.imageOptionButton}
                onPress={handleRemoveImage}
              >
                <Ionicons name="trash" size={24} color={colors.error} />
                <Text style={[styles.imageOptionText, { color: colors.error }]}>
                  삭제
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
                취소
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
  appBarTitle: {
    fontFamily: "Quicksand-Bold",
    fontSize: 22,
  },
  appBarIconButton: {
    padding: 10,
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
});

export default ProfileScreen;
