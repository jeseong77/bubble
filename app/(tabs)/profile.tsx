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

// --- 데이터 연동을 위한 import 추가 ---
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { decode } from "base64-arraybuffer"; // base64 디코딩 라이브러리 추가

// BubbleTabItem에서 사용하는 타입을 import
import { BubbleTabItemData } from "@/components/bubble/BubbleTabItem";

// 화면에 표시될 버블의 정보 (BubbleTabItemData와 동일한 구조)
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
  const [activeTab, setActiveTab] = useState<string>("bubblePro");
  const [showCreateBubbleModal, setShowCreateBubbleModal] = useState(false);
  const [myBubbles, setMyBubbles] = useState<Bubble[]>([]);
  const [bubblesLoading, setBubblesLoading] = useState(true);
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  // --- 새로운 상태들 ---
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  // --- [수정됨] 데이터 Fetching useEffect ---
  useEffect(() => {
    const fetchProfileData = async () => {
      console.log("[ProfileScreen] fetchProfileData 시작");

      if (!session?.user) {
        console.log("[ProfileScreen] 세션이 없어 로딩을 중단합니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { user } = session;
        console.log(`[ProfileScreen] 사용자 ID: ${user.id}`);

        // 1. public.users 테이블에서 프로필 정보 가져오기
        console.log(
          "[ProfileScreen] 1단계: users 테이블에서 프로필 정보 조회 시작"
        );
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error(
            "[ProfileScreen] 프로필 데이터 조회 실패:",
            profileError
          );
          throw profileError;
        }
        if (!profileData) {
          console.error("[ProfileScreen] 프로필 데이터가 없습니다.");
          throw new Error("Profile not found.");
        }
        console.log("[ProfileScreen] 프로필 데이터 조회 성공:", {
          id: profileData.id,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
        });

        // 2. public.user_images 테이블에서 이미지 경로(URL) 가져오기
        console.log(
          "[ProfileScreen] 2단계: user_images 테이블에서 이미지 정보 조회 시작"
        );
        const { data: imagesData, error: imagesError } = await supabase
          .from("user_images")
          .select("image_url, position")
          .eq("user_id", user.id)
          .order("position", { ascending: true });

        if (imagesError) {
          console.error(
            "[ProfileScreen] 이미지 데이터 조회 실패:",
            imagesError
          );
          throw imagesError;
        }
        console.log("[ProfileScreen] 이미지 데이터 조회 성공:", {
          count: imagesData?.length || 0,
          images: imagesData,
        });

        // --- 👇 [핵심 수정] 이제 이미지 URL이 이미 영구적인 공개 URL입니다 ---
        // 3. 이미지 URL을 그대로 사용 (Signed URL 생성 불필요)
        console.log("[ProfileScreen] 3단계: 이미지 URL 처리 시작");
        console.log("[ProfileScreen] 이미지 데이터:", imagesData);

        // 4. 데이터 가공 및 상태 업데이트
        console.log("[ProfileScreen] 5단계: 데이터 가공 시작");
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
          aboutMe: profileData.bio,
          images: [],
        };
        console.log("[ProfileScreen] 프로필 데이터 가공 완료:", fetchedProfile);
        setProfile(fetchedProfile);
        setEditingProfile(JSON.parse(JSON.stringify(fetchedProfile)));

        // 최종적으로 화면에 표시할 이미지 상태를 영구 URL로 업데이트합니다.
        console.log("[ProfileScreen] 6단계: 이미지 상태 업데이트 시작");
        const updatedImages: (ProfileImage | null)[] =
          Array(MAX_IMAGES_DEFAULT).fill(null);

        // 이미지 URL을 그대로 사용 (Signed URL 생성 불필요)
        imagesData.forEach((imageData) => {
          updatedImages[imageData.position] = {
            url: imageData.image_url, // 영구적인 공개 URL을 그대로 사용
          };
          console.log(
            `[ProfileScreen] 이미지 ${imageData.position} 위치에 URL 설정:`,
            imageData.image_url
          );
        });

        console.log("[ProfileScreen] 최종 이미지 상태:", updatedImages);
        setCurrentImages(updatedImages);
        console.log("[ProfileScreen] fetchProfileData 완료");
      } catch (error) {
        console.error("[ProfileScreen] fetchProfileData 에러 발생:", error);
        console.error("[ProfileScreen] 에러 상세:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        console.log(
          "[ProfileScreen] fetchProfileData 종료 - loading을 false로 설정"
        );
        setLoading(false);
      }
    };

    console.log("[ProfileScreen] useEffect 실행 - session 상태:", !!session);
    if (session) {
      console.log("[ProfileScreen] 세션이 있으므로 fetchProfileData 호출");
      fetchProfileData();
    } else {
      console.log(
        "[ProfileScreen] 세션이 없어 fetchProfileData를 호출하지 않음"
      );
    }
  }, [session]);

  // My Bubble 데이터 로딩
  useEffect(() => {
    const fetchMyBubbles = async () => {
      if (!session?.user) return;

      setBubblesLoading(true);
      try {
        // Supabase RPC(Remote Procedure Call)를 사용하여 복잡한 쿼리를 한번에 처리합니다.
        const { data, error } = await supabase.rpc("get_my_bubbles", {
          p_user_id: session.user.id,
        });

        if (error) throw error;

        // RPC 결과가 없을 경우를 대비한 처리
        const allBubbles = data || [];

        // 서버에서 내려오는 원본 데이터 로깅
        console.log("[ProfileScreen] 🔍 서버에서 내려온 원본 버블 데이터:");
        console.log(
          "[ProfileScreen] 전체 데이터:",
          JSON.stringify(allBubbles, null, 2)
        );

        if (allBubbles.length > 0) {
          console.log("[ProfileScreen] 첫 번째 버블 상세 구조:");
          console.log("[ProfileScreen] - 버블 ID:", allBubbles[0].id);
          console.log("[ProfileScreen] - 버블 이름:", allBubbles[0].name);
          console.log("[ProfileScreen] - 버블 상태:", allBubbles[0].status);
          console.log(
            "[ProfileScreen] - 유저 상태:",
            allBubbles[0].user_status
          );
          console.log("[ProfileScreen] - 멤버 배열:", allBubbles[0].members);
        }

        // joined 상태인 버블만 My Bubble 탭에 표시
        const joinedBubbles = allBubbles.filter(
          (bubble: any) => bubble.user_status === "joined"
        );

        console.log("[ProfileScreen] get_my_bubbles 응답:", allBubbles);
        
        // 데이터 구조를 BubbleTabItem에서 사용하는 형태로 변환
        const transformedBubbles: Bubble[] = joinedBubbles.map((bubble: any) => {
          // 멤버 정보 파싱 (새로운 구조에 맞게)
          let members: Array<{ id: string; first_name: string; last_name: string; images: Array<{ image_url: string; position: number }> }> = [];
          if (bubble.members) {
            try {
              members = Array.isArray(bubble.members)
                ? bubble.members
                : JSON.parse(bubble.members);
            } catch (parseError) {
              console.error("[ProfileScreen] 멤버 정보 파싱 실패:", parseError);
              members = [];
            }
          }

          // 새로운 구조에 맞게 멤버 데이터 변환
          const transformedMembers = members.map((member) => {
            // 첫 번째 이미지를 아바타로 사용
            const avatarUrl = member.images && member.images.length > 0 
              ? member.images[0].image_url 
              : null;
            
            return {
              id: member.id,
              first_name: member.first_name,
              last_name: member.last_name,
              avatar_url: avatarUrl,
              signedUrl: avatarUrl, // 이미 공개 URL이므로 그대로 사용
            };
          });

          return {
            id: bubble.id,
            name: bubble.name,
            status: bubble.status,
            members: transformedMembers,
          };
        });

        console.log("[ProfileScreen] joined 상태 버블:", transformedBubbles);
        setMyBubbles(transformedBubbles);
        
        // Active 버블 ID 가져오기
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("active_group_id")
          .eq("id", session.user.id)
          .single();
          
        if (!userError && userData) {
          setActiveBubbleId(userData.active_group_id);
          console.log("[ProfileScreen] Active 버블 ID:", userData.active_group_id);
        }
      } catch (error) {
        console.error("Error fetching my bubbles:", error);
        setMyBubbles([]); // 에러 발생 시 빈 배열로 초기화
      } finally {
        setBubblesLoading(false);
      }
    };

    // 'myBubble' 탭이 활성화되었을 때만 데이터를 가져옵니다.
    if (activeTab === "myBubble") {
      fetchMyBubbles();
    }
  }, [activeTab, session]);

  // --- 이미지 관련 함수들 ---
  const handleImageOptions = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageOptionsModal(true);
  };

  // --- [수정됨] handleTakePhoto 함수 ---
  const handleTakePhoto = async () => {
    console.log("[ProfileScreen] handleTakePhoto 시작");
    setShowImageOptionsModal(false);

    console.log("[ProfileScreen] 카메라 권한 요청");
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      console.log("[ProfileScreen] 카메라 권한 거부됨");
      Alert.alert("Permission Required", "Camera permission is required.");
      return;
    }
    console.log("[ProfileScreen] 카메라 권한 승인됨");

    console.log("[ProfileScreen] 카메라 실행");
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // base64 옵션 추가
    });

    console.log("[ProfileScreen] 카메라 결과:", {
      canceled: result.canceled,
      hasAssets: !!result.assets,
      assetCount: result.assets?.length || 0,
      selectedIndex: selectedImageIndex,
    });

    if (!result.canceled && result.assets?.[0]) {
      const { uri, base64 } = result.assets[0];
      console.log("[ProfileScreen] 카메라로 촬영된 이미지:", {
        uri,
        base64Length: base64?.length || 0,
        selectedIndex: selectedImageIndex,
      });

      const newProfileImage: ProfileImage = { uri, base64 }; // uri와 base64 모두 저장
      const updatedImages = [...currentImages];
      if (selectedImageIndex !== null) {
        updatedImages[selectedImageIndex] = newProfileImage;
        setCurrentImages(updatedImages);
        console.log(
          `[ProfileScreen] 이미지 ${selectedImageIndex} 위치에 카메라 이미지 설정 완료`
        );
      }
    }
    setSelectedImageIndex(null);
  };

  // --- [수정됨] handlePickImage 함수 ---
  const handlePickImage = async () => {
    console.log("[ProfileScreen] handlePickImage 시작");
    setShowImageOptionsModal(false);

    console.log("[ProfileScreen] 갤러리 권한 요청");
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      console.log("[ProfileScreen] 갤러리 권한 거부됨");
      Alert.alert(
        "Permission Required",
        "Photo library permission is required."
      );
      return;
    }
    console.log("[ProfileScreen] 갤러리 권한 승인됨");

    console.log("[ProfileScreen] 갤러리 실행");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // base64 옵션 추가
    });

    console.log("[ProfileScreen] 갤러리 결과:", {
      canceled: result.canceled,
      hasAssets: !!result.assets,
      assetCount: result.assets?.length || 0,
      selectedIndex: selectedImageIndex,
    });

    if (!result.canceled && result.assets?.[0]) {
      const { uri, base64 } = result.assets[0];
      console.log("[ProfileScreen] 갤러리에서 선택된 이미지:", {
        uri,
        base64Length: base64?.length || 0,
        selectedIndex: selectedImageIndex,
      });

      const newProfileImage: ProfileImage = { uri, base64 }; // uri와 base64 모두 저장
      const updatedImages = [...currentImages];
      if (selectedImageIndex !== null) {
        updatedImages[selectedImageIndex] = newProfileImage;
        setCurrentImages(updatedImages);
        console.log(
          `[ProfileScreen] 이미지 ${selectedImageIndex} 위치에 갤러리 이미지 설정 완료`
        );
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
    console.log("[ProfileScreen] saveProfileToServer 시작");

    if (!session?.user || !editingProfile) {
      console.log(
        "[ProfileScreen] 세션이나 편집 프로필이 없어 저장을 중단합니다."
      );
      return;
    }

    setSaving(true);
    setShowSaveModal(false);

    try {
      const { user } = session;
      console.log(`[ProfileScreen] 사용자 ID: ${user.id}`);

      // 1. 새로 추가/변경 된 이미지만 필터링하여 업로드
      console.log("[ProfileScreen] 1단계: 이미지 업로드 준비 시작");
      console.log(
        "[ProfileScreen] 현재 이미지 상태:",
        currentImages.map((img, idx) => ({
          index: idx,
          hasImage: !!img,
          hasBase64: !!img?.base64,
          hasUrl: !!img?.url,
          hasUri: !!img?.uri,
          uri: img?.uri,
          url: img?.url,
        }))
      );

      const uploadPromises = currentImages.map(async (image, index) => {
        console.log(`[ProfileScreen] 이미지 ${index} 처리 시작:`, {
          hasImage: !!image,
          hasBase64: !!image?.base64,
          hasUrl: !!image?.url,
          hasUri: !!image?.uri,
        });

        if (!image) {
          console.log(`[ProfileScreen] 이미지 ${index}: 빈 슬롯`);
          return { position: index, url: null }; // 빈 슬롯
        }

        // base64가 있다면 새로운 이미지이므로 업로드
        if (image.base64) {
          console.log(
            `[ProfileScreen] 이미지 ${index}: 새로운 이미지 업로드 시작`
          );

          const fileExt = image.uri?.split(".").pop()?.toLowerCase() ?? "jpeg";
          const filePath = `${user.id}/${new Date().getTime()}.${fileExt}`;
          const contentType = `image/${fileExt}`;

          console.log(`[ProfileScreen] 이미지 ${index} 업로드 정보:`, {
            fileExt,
            filePath,
            contentType,
            base64Length: image.base64?.length || 0,
            uri: image.uri,
          });

          try {
            console.log(`[ProfileScreen] 이미지 ${index}: Storage 업로드 시작`);
            const { data, error: uploadError } = await supabase.storage
              .from("user-images")
              .upload(filePath, decode(image.base64), { contentType });

            if (uploadError) {
              console.error(
                `[ProfileScreen] 이미지 ${index} 업로드 실패:`,
                uploadError
              );
              throw uploadError;
            }

            console.log(`[ProfileScreen] 이미지 ${index} 업로드 성공:`, {
              path: data.path,
              id: data.id,
            });

            console.log(
              `[ProfileScreen] 이미지 ${index}: Public URL 생성 시작`
            );
            const { data: publicUrlData } = supabase.storage
              .from("user-images")
              .getPublicUrl(data.path);

            console.log(
              `[ProfileScreen] 이미지 ${index} Public URL 생성 성공:`,
              publicUrlData.publicUrl
            );
            return { position: index, url: publicUrlData.publicUrl };
          } catch (uploadErr) {
            console.error(
              `[ProfileScreen] 이미지 ${index} 업로드 중 예외 발생:`,
              uploadErr
            );
            throw uploadErr;
          }
        }

        // base64가 없다면 기존 이미지이므로 URL만 유지
        console.log(
          `[ProfileScreen] 이미지 ${index}: 기존 이미지 URL 유지:`,
          image.url || image.uri
        );
        return { position: index, url: image.url || image.uri };
      });

      console.log("[ProfileScreen] 2단계: 모든 이미지 업로드 완료 대기");
      const resolvedImages = await Promise.all(uploadPromises);
      console.log("[ProfileScreen] 업로드된 이미지 결과:", resolvedImages);

      // 2. DB에 저장할 최종 이미지 목록 생성
      console.log("[ProfileScreen] 3단계: DB 저장용 이미지 목록 생성");
      const imagesToInsert = resolvedImages
        .filter((img): img is { position: number; url: string } => !!img?.url)
        .map((img) => ({
          user_id: user.id,
          image_url: img.url,
          position: img.position,
        }));

      console.log("[ProfileScreen] DB에 저장할 이미지 목록:", imagesToInsert);

      // 3. DB 이미지 목록 원자적으로 교체 (삭제 후 삽입)
      console.log("[ProfileScreen] 4단계: 기존 이미지 데이터 삭제");
      const { error: deleteError } = await supabase
        .from("user_images")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) {
        console.error("[ProfileScreen] 기존 이미지 삭제 실패:", deleteError);
        throw deleteError;
      }
      console.log("[ProfileScreen] 기존 이미지 삭제 성공");

      if (imagesToInsert.length > 0) {
        console.log("[ProfileScreen] 5단계: 새 이미지 데이터 삽입");
        const { error: imagesError } = await supabase
          .from("user_images")
          .insert(imagesToInsert);
        if (imagesError) {
          console.error(
            "[ProfileScreen] 새 이미지 데이터 삽입 실패:",
            imagesError
          );
          throw imagesError;
        }
        console.log("[ProfileScreen] 새 이미지 데이터 삽입 성공");
      } else {
        console.log("[ProfileScreen] 삽입할 이미지가 없습니다.");
      }

      // 4. 프로필 텍스트 정보 업데이트
      console.log("[ProfileScreen] 6단계: 프로필 텍스트 정보 업데이트");
      const birthDate =
        editingProfile.birthYear &&
        editingProfile.birthMonth &&
        editingProfile.birthDay
          ? `${editingProfile.birthYear}-${editingProfile.birthMonth}-${editingProfile.birthDay}`
          : profile?.birthDay
          ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
          : null;

      console.log("[ProfileScreen] 업데이트할 프로필 데이터:", {
        id: user.id,
        firstName: editingProfile.firstName,
        lastName: editingProfile.lastName,
        birthDate,
        height: editingProfile.height,
        mbti: editingProfile.mbti,
        gender: editingProfile.gender,
        bio: editingProfile.aboutMe,
      });

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
      if (profileError) {
        console.error("[ProfileScreen] 프로필 업데이트 실패:", profileError);
        throw profileError;
      }
      console.log("[ProfileScreen] 프로필 업데이트 성공");

      // 5. 로컬 상태 업데이트
      console.log("[ProfileScreen] 7단계: 로컬 상태 업데이트");
      setProfile(JSON.parse(JSON.stringify(editingProfile))); // Deep copy to reflect changes

      // Update currentImages to remove base64 and only keep final URLs
      const updatedCurrentImages = resolvedImages.map((img) =>
        img.url ? { url: img.url } : null
      );
      console.log(
        "[ProfileScreen] 업데이트된 로컬 이미지 상태:",
        updatedCurrentImages
      );
      setCurrentImages(updatedCurrentImages);

      console.log("[ProfileScreen] saveProfileToServer 완료");
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("[ProfileScreen] saveProfileToServer 에러 발생:", error);
      console.error("[ProfileScreen] 에러 상세:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      console.log(
        "[ProfileScreen] saveProfileToServer 종료 - saving을 false로 설정"
      );
      setSaving(false);
    }
  };

  // --- 기존 함수들 ---
  const navigateToSettings = () => {
    router.push("/settings");
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Active 버블 설정 함수
  const handleSetActiveBubble = async (bubbleId: string) => {
    if (!session?.user) return;
    
    try {
      console.log("[ProfileScreen] Active 버블 설정 시작:", bubbleId);
      
      const { data, error } = await supabase.rpc("set_user_active_bubble", {
        p_user_id: session.user.id,
        p_group_id: bubbleId,
      });
      
      if (error) {
        console.error("[ProfileScreen] Active 버블 설정 실패:", error);
        Alert.alert("오류", "Active 버블 설정에 실패했습니다.");
        return;
      }
      
      if (data) {
        setActiveBubbleId(bubbleId);
        console.log("[ProfileScreen] Active 버블 설정 성공:", bubbleId);
        Alert.alert("성공", "Active 버블이 설정되었습니다.");
      }
    } catch (error) {
      console.error("[ProfileScreen] Active 버블 설정 중 에러:", error);
      Alert.alert("오류", "Active 버블 설정에 실패했습니다.");
    }
  };

  // 그룹에서 나가기 함수
  const handleLeaveGroup = async (bubbleId: string) => {
    if (!session?.user) return;
    
    Alert.alert(
      "그룹 나가기",
      "정말로 이 그룹에서 나가시겠습니까?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "나가기",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[ProfileScreen] 그룹 나가기 시작:", bubbleId);
              
              const { data, error } = await supabase.rpc("leave_group", {
                p_user_id: session.user.id,
                p_group_id: bubbleId,
              });
              
              if (error) {
                console.error("[ProfileScreen] 그룹 나가기 실패:", error);
                Alert.alert("오류", "그룹 나가기에 실패했습니다.");
                return;
              }
              
              if (data) {
                console.log("[ProfileScreen] 그룹 나가기 성공:", bubbleId);
                
                // Active 버블이 삭제된 버블이었다면 Active 상태 제거
                if (activeBubbleId === bubbleId) {
                  setActiveBubbleId(null);
                }
                
                // 버블 목록 새로고침
                if (activeTab === "myBubble") {
                  // fetchMyBubbles 함수를 다시 호출
                  const fetchMyBubbles = async () => {
                    // ... 기존 fetchMyBubbles 로직
                  };
                  fetchMyBubbles();
                }
                
                Alert.alert("성공", "그룹에서 나갔습니다.");
              }
            } catch (error) {
              console.error("[ProfileScreen] 그룹 나가기 중 에러:", error);
              Alert.alert("오류", "그룹 나가기에 실패했습니다.");
            }
          },
        },
      ]
    );
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
              {/* 2. 버블 목록이 있을 때 */}
              {myBubbles.length > 0 ? (
                myBubbles.map((bubble) => (
                  <BubbleTabItem
                    key={bubble.id}
                    bubble={bubble}
                    isActive={activeBubbleId === bubble.id}
                    onPress={() => {
                      // 기존 버블을 form.tsx로 이동 (get_bubble RPC 사용)
                      router.push({
                        pathname: "/bubble/form",
                        params: {
                          groupId: bubble.id,
                          isExistingBubble: "true", // 기존 버블임을 표시
                        },
                      });
                    }}
                    onSetActive={() => handleSetActiveBubble(bubble.id)}
                    onLeaveGroup={() => handleLeaveGroup(bubble.id)}
                  />
                ))
              ) : (
                // 3. 버블 목록이 없을 때 - "Make new bubble" UI 표시
                <View style={styles.makeNewBubbleContainer}>
                  <Text style={[styles.makeNewBubbleText, { color: colors.black }]}>
                    Make new bubble !
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
          />
          <ProfileTab
            tabs={TABS_DATA}
            activeTabId={activeTab}
            onTabPress={(tabId) => handleTabChange(tabId)}
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
        {/* ProfileHero에 실제 데이터 전달 */}
        <ProfileHero
          firstName={profile.firstName}
          lastName={profile.lastName}
          username={profile.username}
          userId={profile.userId}
          imageUrl={currentImages[0]?.url || currentImages[0]?.uri}
          skeleton={false}
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
