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
import { useProfileSubmission } from "@/hooks/useProfileSubmission";
import { isStepValid } from "@/utils/profileValidation";

const MAX_IMAGES = 6;
const TOTAL_STEPS = 10;

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

  // Use profile submission hook
  const { isSubmitting, submitProfile } = useProfileSubmission();

  const updateProfileField = useCallback(
    <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
      setProfileData((prevData) => ({
        ...prevData,
        [field]: value,
      }));
    },
    []
  );

  const handleLocationSkip = useCallback(() => {
    updateProfileField("location", null);
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [updateProfileField, currentStep]);

  const handleHeightSkip = useCallback(() => {
    updateProfileField("height", null);
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [updateProfileField, currentStep]);

  const handleAboutMeSkip = useCallback(() => {
    updateProfileField("aboutMe", "");
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [updateProfileField, currentStep]);

  // Fetch existing user profile when component renders
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", session.user.id)
        .single();

      // 'PGRST116' means row not found, which is normal for new users
      if (error && error.code !== "PGRST116") {
        console.error("Failed to fetch profile information:", error);
        return;
      }

      if (data) {
        // Update state with existing name from server
        updateProfileField("firstName", data.first_name || "");
        updateProfileField("lastName", data.last_name || "");
      }
    };

    fetchUserProfile();
  }, [session, updateProfileField]);


  const handleNextStep = () => {
    if (!isStepValid(currentStep, profileData)) return;
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      submitProfile(profileData);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      if (router.canGoBack()) router.back();
    }
  };

  const renderCurrentStepComponent = () => {
    switch (currentStep) {
      case 0:
        return (
          <NameInputStep
            firstName={profileData.firstName}
            lastName={profileData.lastName}
            onFirstNameChange={(value) => updateProfileField("firstName", value)}
            onLastNameChange={(value) => updateProfileField("lastName", value)}
          />
        );
      case 1:
        return (
          <UserIdInputStep
            username={profileData.username}
            onUsernameChange={(value) => updateProfileField("username", value)}
          />
        );
      case 2:
        return (
          <AgeInputStep
            day={profileData.birthDay}
            month={profileData.birthMonth}
            year={profileData.birthYear}
            onDayChange={(value) => updateProfileField("birthDay", value)}
            onMonthChange={(value) => updateProfileField("birthMonth", value)}
            onYearChange={(value) => updateProfileField("birthYear", value)}
          />
        );
      case 3:
        return (
          <HeightInputStep
            initialHeightCm={profileData.height ?? undefined}
            onHeightChange={(value) => updateProfileField("height", value)}
            onSkip={handleHeightSkip}
          />
        );
      case 4:
        return (
          <LocationInputStep
            location={profileData.location}
            onLocationChange={(value) => updateProfileField("location", value)}
            onSkip={handleLocationSkip}
          />
        );
      case 5:
        return (
          <MbtiInputStep
            currentMbti={profileData.mbti}
            onMbtiChange={(value) => updateProfileField("mbti", value)}
          />
        );
      case 6:
        return (
          <GenderInputStep
            currentGender={profileData.gender}
            currentVisibility={profileData.genderVisibleOnProfile}
            onGenderChange={(value) => updateProfileField("gender", value)}
            onVisibilityChange={(value) => updateProfileField("genderVisibleOnProfile", value)}
          />
        );
      case 7:
        return (
          <PreferredGenderInputStep
            preferredGender={profileData.preferredGender}
            onPreferredGenderChange={(value) => updateProfileField("preferredGender", value)}
          />
        );
      case 8:
        return (
          <AboutMeInputStep
            currentAboutMe={profileData.aboutMe}
            onAboutMeChange={(value) => updateProfileField("aboutMe", value)}
            onSkip={handleAboutMeSkip}
          />
        );
      case 9:
        return (
          <ImageUploadStep
            currentImages={profileData.images}
            onImagesChange={(value) => updateProfileField("images", value)}
            userId={session?.user?.id || ""}
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
