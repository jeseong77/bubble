import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Keyboard,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import CustomAppBar from "@/components/CustomAppBar";
import { ProfileFormData, ProfileImage } from "@/types/profile";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import NameInputStep from "./profile-setup-steps/NameInputStep";
import UserIdInputStep from "./profile-setup-steps/UserIdInputStep";
import AgeInputStep from "./profile-setup-steps/AgeInputStep";
import HeightInputStep from "./profile-setup-steps/HeightInputStep";
import LocationInputStep from "./profile-setup-steps/LocationInputStep";
import MbtiInputStep from "./profile-setup-steps/MbtiInputStep";
import GenderInputStep from "./profile-setup-steps/GenderInputStep";
import PreferredGenderInputStep from "./profile-setup-steps/PreferredGenderInputStep";
import AboutMeInputStep from "./profile-setup-steps/AboutMeInputStep";
import ImageUploadStep from "./profile-setup-steps/ImageUploadStep";
import { useAppTheme } from "@/hooks/useAppTheme";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

const MAX_IMAGES = 6;
const TOTAL_STEPS = 10;

const isStepValid = (step: number, data: ProfileFormData): boolean => {
  switch (step) {
    case 0:
      return !!data.firstName;
    case 1:
      return !!data.username;
    case 2:
      const dayNum = parseInt(data.birthDay, 10);
      const monthNum = parseInt(data.birthMonth, 10);
      const yearNum = parseInt(data.birthYear, 10);
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
      if (
        data.birthDay.length !== 2 ||
        data.birthMonth.length !== 2 ||
        data.birthYear.length !== 4
      )
        return false;
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31)
        return false;
      const date = new Date(yearNum, monthNum - 1, dayNum);
      return (
        date.getFullYear() === yearNum &&
        date.getMonth() === monthNum - 1 &&
        date.getDate() === dayNum &&
        date <= new Date()
      );
    case 3:
      return true; // Height is optional, always valid
    case 4:
      return true; // Location is optional, always valid
    case 5:
      return (
        data.mbti === null ||
        (typeof data.mbti === "string" && data.mbti.length === 4)
      );
    case 6:
      return !!data.gender;
    case 7:
      return !!data.preferredGender;
    case 8:
      return !!data.aboutMe;
    case 9:
      return (
        data.images &&
        data.images.length >= 2 &&
        data.images[0] !== null &&
        data.images[1] !== null
      );
    default:
      return false;
  }
};

const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const authenticatedUserId = session?.user?.id;

  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    userId: authenticatedUserId || "",
    username: "",
    firstName: "",
    lastName: "",
    age: null,
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    height: null,
    location: null,
    mbti: null,
    gender: "",
    genderVisibleOnProfile: true,
    preferredGender: "",
    aboutMe: "",
    images: Array(MAX_IMAGES).fill(null) as (ProfileImage | null)[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { completeProfileSetup } = useAuth();

  const updateProfileField = useCallback(
    <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
      setProfileData((prevData) => ({
        ...prevData,
        [field]: value,
      }));
    },
    []
  );

  const handleFirstNameChange = useCallback(
    (value: string) => {
      updateProfileField("firstName", value);
    },
    [updateProfileField]
  );

  const handleLastNameChange = useCallback(
    (value: string) => {
      updateProfileField("lastName", value);
    },
    [updateProfileField]
  );

  const handleUsernameChange = useCallback(
    (value: string) => {
      updateProfileField("username", value);
    },
    [updateProfileField]
  );

  const handleBirthDayChange = useCallback(
    (value: string) => {
      updateProfileField("birthDay", value);
    },
    [updateProfileField]
  );
  const handleBirthMonthChange = useCallback(
    (value: string) => {
      updateProfileField("birthMonth", value);
    },
    [updateProfileField]
  );
  const handleBirthYearChange = useCallback(
    (value: string) => {
      updateProfileField("birthYear", value);
    },
    [updateProfileField]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      updateProfileField("height", newHeight);
    },
    [updateProfileField]
  );

  const handleMbtiChange = useCallback(
    (value: string | null) => {
      updateProfileField("mbti", value);
    },
    [updateProfileField]
  );

  const handleGenderChange = useCallback(
    (genderValue: string) => {
      updateProfileField("gender", genderValue);
    },
    [updateProfileField]
  );

  const handleGenderVisibilityChange = useCallback(
    (isVisible: boolean) => {
      updateProfileField("genderVisibleOnProfile", isVisible);
    },
    [updateProfileField]
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      updateProfileField("location", value);
    },
    [updateProfileField]
  );

  const handleLocationSkip = useCallback(() => {
    updateProfileField("location", null);
  }, [updateProfileField]);

  const handleHeightSkip = useCallback(() => {
    updateProfileField("height", null);
  }, [updateProfileField]);

  const handlePreferredGenderChange = useCallback(
    (value: string) => {
      updateProfileField("preferredGender", value);
    },
    [updateProfileField]
  );

  const handleAboutMeChange = useCallback(
    (text: string) => {
      updateProfileField("aboutMe", text);
    },
    [updateProfileField]
  );

  const handleImagesChange = useCallback(
    (newImages: (ProfileImage | null)[]) => {
      updateProfileField("images", newImages);
    },
    [updateProfileField]
  );

  // 👇 [추가] 컴포넌트가 렌더링될 때 서버에서 기존 프로필 정보를 가져오는 로직
  useEffect(() => {
    const fetchUserProfile = async () => {
      // session.user.id가 없으면 실행하지 않음
      if (!session?.user?.id) return;

      console.log("[ProfileSetup] 기존 사용자 프로필을 가져오는 중...");

      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", session.user.id)
        .single();

      // 'PGRST116'는 행을 찾지 못했다는 의미로, 신규 사용자의 경우 정상적인 상황입니다.
      if (error && error.code !== "PGRST116") {
        console.error("프로필 정보를 가져오는 데 실패했습니다.", error);
        return;
      }

      if (data) {
        console.log("[ProfileSetup] 기존 프로필 발견, 이름 필드를 채웁니다.");
        // 서버에서 가져온 이름으로 상태를 업데이트합니다.
        updateProfileField("firstName", data.first_name || "");
        updateProfileField("lastName", data.last_name || "");
      }
    };

    fetchUserProfile();
  }, [session, updateProfileField]); // session 정보가 준비되면 이 로직이 실행됩니다.

  // [추가] 이미지 업로드 함수
  const handleImageUpload = async (index: number) => {
    if (!session?.user) {
      Alert.alert("Error", "You must be logged in to upload images.");
      return;
    }

    // 1. 앨범 접근 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant access to your photo library."
      );
      return;
    }

    // 2. 이미지 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;
    const imageAsset = result.assets[0];

    // 3. 상태 업데이트 (로딩 시작)
    const newImages = [...profileData.images];
    newImages[index] = { url: imageAsset.uri, isLoading: true };
    handleImagesChange(newImages);

    try {
      // 4. Supabase Storage에 업로드
      const fileExt = imageAsset.uri.split(".").pop()?.toLowerCase() ?? "jpeg";
      const filePath = `${session.user.id}/${new Date().getTime()}.${fileExt}`;
      const contentType = `image/${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("user-images")
        .upload(filePath, decode(imageAsset.base64), { contentType });

      if (uploadError) throw uploadError;

      // 5. 업로드된 파일의 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-images").getPublicUrl(data.path);

      // 6. 상태 업데이트 (URL 저장, 로딩 종료)
      const finalImages = [...profileData.images];
      finalImages[index] = { url: publicUrl, isLoading: false };
      handleImagesChange(finalImages);
    } catch (error) {
      console.error("Image upload failed:", error);
      Alert.alert("Error", "Failed to upload image.");
      // 실패 시 로딩 상태 되돌리기
      const revertedImages = [...profileData.images];
      revertedImages[index] = null;
      handleImagesChange(revertedImages);
    }
  };

  const handleNextStep = () => {
    if (!isStepValid(currentStep, profileData)) return;
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      if (router.canGoBack()) router.back();
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !session?.user) return;
    setIsSubmitting(true);

    try {
      // 1. 프로필 정보(텍스트)를 public.users에 저장
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
        profile_setup_completed: true, // 완료 상태를 true로 설정
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("users")
        .upsert(userProfile);
      if (profileError) throw profileError;

      // 2. 업로드된 이미지 URL들을 public.user_images에 저장
      const uploadedImageUrls = profileData.images
        .map((img) => img?.url)
        .filter((url): url is string => !!url);

      if (uploadedImageUrls.length > 0) {
        // 기존 이미지를 모두 삭제하고 새로 추가 (멱등성 보장)
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

      // 3. 모든 과정 완료 처리
      await completeProfileSetup();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Profile submission failed:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCurrentStepComponent = () => {
    switch (currentStep) {
      case 0:
        return (
          <NameInputStep
            firstName={profileData.firstName}
            lastName={profileData.lastName}
            onFirstNameChange={handleFirstNameChange}
            onLastNameChange={handleLastNameChange}
          />
        );
      case 1:
        return (
          <UserIdInputStep
            username={profileData.username}
            onUsernameChange={handleUsernameChange}
          />
        );
      case 2:
        return (
          <AgeInputStep
            day={profileData.birthDay}
            month={profileData.birthMonth}
            year={profileData.birthYear}
            onDayChange={handleBirthDayChange}
            onMonthChange={handleBirthMonthChange}
            onYearChange={handleBirthYearChange}
          />
        );
      case 3:
        return (
          <HeightInputStep
            initialHeightCm={profileData.height ?? undefined}
            onHeightChange={handleHeightChange}
            onSkip={handleHeightSkip}
          />
        );
      case 4:
        return (
          <LocationInputStep
            location={profileData.location}
            onLocationChange={handleLocationChange}
            onSkip={handleLocationSkip}
          />
        );
      case 5:
        return (
          <MbtiInputStep
            currentMbti={profileData.mbti}
            onMbtiChange={handleMbtiChange}
          />
        );
      case 6:
        return (
          <GenderInputStep
            currentGender={profileData.gender}
            currentVisibility={profileData.genderVisibleOnProfile}
            onGenderChange={handleGenderChange}
            onVisibilityChange={handleGenderVisibilityChange}
          />
        );
      case 7:
        return (
          <PreferredGenderInputStep
            preferredGender={profileData.preferredGender}
            onPreferredGenderChange={handlePreferredGenderChange}
          />
        );
      case 8:
        return (
          <AboutMeInputStep
            currentAboutMe={profileData.aboutMe}
            onAboutMeChange={handleAboutMeChange}
          />
        );
      case 9:
        return (
          <ImageUploadStep
            currentImages={profileData.images}
            onImagesChange={handleImagesChange}
            onUploadImage={handleImageUpload}
            maxImages={MAX_IMAGES}
          />
        );
      default:
        return null;
    }
  };

  const isCurrentInputValid = isStepValid(currentStep, profileData);
  const isButtonDisabled = !isCurrentInputValid || isSubmitting;

  const buttonBackgroundColor = isButtonDisabled
    ? colors.disableButton
    : colors.primary;
  const buttonIconColor = isButtonDisabled ? colors.black : colors.white;

  return (
    <SafeAreaView
      style={[styles.screenContainer, { backgroundColor: colors.white }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <CustomAppBar
        onBackPress={handlePreviousStep}
        showBackButton={currentStep >= 1}
      />
      <View style={styles.contentContainer}>
        {renderCurrentStepComponent()}

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.circularButtonWrapper}
            onPress={handleNextStep}
            disabled={isButtonDisabled}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.circularButton,
                { backgroundColor: buttonBackgroundColor },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={30}
                color={buttonIconColor}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingBottom: 16,
    paddingRight: 16,
  },
  circularButtonWrapper: {},
  circularButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
