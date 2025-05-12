import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import CustomAppBar from "@/components/CustomAppBar";
import { ProfileFormData, ProfileImage } from "@/types/user/profile";
import useAuthStore from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import NameInputStep from "./profile-setup-steps/NameInputStep";
import AgeInputStep from "./profile-setup-steps/AgeInputStep";
import HeightInputStep from "./profile-setup-steps/HeightInputStep";
import MbtiInputStep from "./profile-setup-steps/MbtiInputStep";
import GenderInputStep from "./profile-setup-steps/GenderInputStep";
import AboutMeInputStep from "./profile-setup-steps/AboutMeInputStep";
import ImageUploadStep from "./profile-setup-steps/ImageUploadStep";

const MAX_IMAGES = 6;
const TOTAL_STEPS = 7;

const isStepValid = (step: number, data: ProfileFormData): boolean => {
  switch (step) {
    case 0:
      return !!data.firstName;
    case 1:
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
    case 2:
      return data.height !== null && data.height > 0;
    case 3:
      return (
        data.mbti === null ||
        (typeof data.mbti === "string" && data.mbti.length === 4)
      );
    case 4:
      return !!data.gender;
    case 5:
      return !!data.aboutMe;
    case 6:
      return data.images && data.images.length >= 2 && data.images[0] !== null && data.images[1] !== null;
    default:
      return false;
  }
};

// 나이 계산 유틸리티 함수 (여기 두거나 utils로 분리)
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

  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    age: null,
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    height: null,
    mbti: "",
    gender: "",
    genderVisibleOnProfile: true,
    aboutMe: "",
    images: Array(MAX_IMAGES).fill(null) as (ProfileImage | null)[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const completeProfileSetup = useAuthStore(
    (state) => state.completeProfileSetup
  );

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

  const handleAboutMeChange = useCallback(
    (text: string) => {
      updateProfileField("aboutMe", text);
    },
    [updateProfileField]
  );

  const handleImagesChange = useCallback(
    (newImages: (ProfileImage | null)[]) => {
      // Use ProfileImage type
      updateProfileField("images", newImages);
    },
    [updateProfileField]
  );
  // const handleImagesChange = useCallback(...)

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
    if (isSubmitting || !isStepValid(currentStep, profileData)) return;
    setIsSubmitting(true);

    // --- 제출 시 나이 계산 ---
    let calculatedAge: number | null = null;
    const { birthDay, birthMonth, birthYear } = profileData;
    const dayNum = parseInt(birthDay, 10);
    const monthNum = parseInt(birthMonth, 10);
    const yearNum = parseInt(birthYear, 10);
    if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum)) {
      const birthDate = new Date(yearNum, monthNum - 1, dayNum);
      if (
        birthDate.getFullYear() === yearNum &&
        birthDate.getMonth() === monthNum - 1 &&
        birthDate.getDate() === dayNum
      ) {
        calculatedAge = calculateAge(birthDate);
      }
    }
    console.log("Calculated Age on Submit:", calculatedAge);
    // ------------------------
    console.log("Submitting Profile Data:", profileData);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log(
      "Submission simulation complete. Updating state and navigating..."
    );
    completeProfileSetup();
    setIsSubmitting(false);
    router.replace("/(tabs)");
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
          <AgeInputStep
            day={profileData.birthDay} // <<< day prop 전달
            month={profileData.birthMonth} // <<< month prop 전달
            year={profileData.birthYear} // <<< year prop 전달
            onDayChange={handleBirthDayChange} // <<< day 변경 핸들러 전달
            onMonthChange={handleBirthMonthChange} // <<< month 변경 핸들러 전달
            onYearChange={handleBirthYearChange} // <<< year 변경 핸들러 전달
          />
        );
      case 2: // This is the Height Input Step
        return (
          <HeightInputStep
            initialHeightCm={profileData.height ?? undefined} // Use initialHeightCm and handle null case
            onHeightChange={handleHeightChange}
          />
        );
      case 3: // Assuming MBTI is step 3
        return (
          <MbtiInputStep
            currentMbti={profileData.mbti}
            onMbtiChange={handleMbtiChange}
          />
        );
      case 4: // GENDER STEP
        return (
          <GenderInputStep
            currentGender={profileData.gender}
            currentVisibility={profileData.genderVisibleOnProfile} // Ensure this field exists in your profileData state
            onGenderChange={handleGenderChange}
            onVisibilityChange={handleGenderVisibilityChange}
          />
        );
      case 5: // ABOUT ME STEP
        return (
          <AboutMeInputStep
            currentAboutMe={profileData.aboutMe}
            onAboutMeChange={handleAboutMeChange}
          />
        );
      case 6: // IMAGE UPLOAD STEP
        return (
          <ImageUploadStep
            currentImages={profileData.images}
            onImagesChange={handleImagesChange}
            maxImages={MAX_IMAGES} // Pass maxImages if you made it configurable
          />
        );
      default:
        return null;
    }
  };

  const isCurrentInputValid = isStepValid(currentStep, profileData);
  const isButtonDisabled = !isCurrentInputValid || isSubmitting;
  const buttonBgColor = isButtonDisabled ? "#A6A6FF" : "#6363D3";

  return (
    <SafeAreaView style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomAppBar
        onBackPress={handlePreviousStep}
        showBackButton={currentStep > 0}
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
                { backgroundColor: buttonBgColor },
              ]}
            >
              <Ionicons name="chevron-forward" size={30} color="#FFFFFF" />
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
    backgroundColor: "#f0f0f0",
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
