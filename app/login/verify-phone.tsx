import React, { useState, useEffect } from "react"; // useEffect는 현재 직접 사용되지 않지만, 향후를 위해 유지 가능
import { View, StyleSheet, SafeAreaView, Text, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import CustomAppBar from "../../components/CustomAppBar";
import CustomButton from "@/components/CustomButton";
import { generateVerificationCode } from "@/utils/auth/verification";
import MobileNumberInputPhase from "./verify-phases/MobileNumberInputPhase";
import VerificationCodeInputPhase from "./verify-phases/VerificationCodeInputPhase";
import useAuthStore from "../../stores/authStore";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function VerifyPhoneScreenNested() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [sentVerification, setSentVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);

  const handleCountryCodePress = () => {
    console.log("Country code pressed!");
  };

  const handleSendCodePress = () => {
    console.log("Continue Pressed: Sending code");
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }
    const code = generateVerificationCode();
    setGeneratedCode(code);
    console.log("Generated Verification Code (for testing):", code);
    Alert.alert(
      "Verification Code Sent",
      `Code: ${code} (For testing purposes)`
    );
    setSentVerification(true);
  };

  const handleVerifyCodePress = () => {
    console.log("Verifying code:", verificationCodeInput);
    if (verificationCodeInput === generatedCode) {
      console.log(
        "Verification successful! Updating auth state and navigating..."
      );
      const fakeToken = `verified-token-${Date.now()}`;
      const fakeUser = { id: countryCode + phoneNumber, name: "Verified User" };
      login(fakeToken, fakeUser);
      router.replace("/onboarding");
    } else {
      console.log("Verification failed: Codes do not match.");
      Alert.alert(
        "Verification Error",
        "The verification code does not match. Please try again."
      );
    }
  };

  const isButtonDisabled = sentVerification
    ? verificationCodeInput.length !== 5
    : !phoneNumber.trim();

  return (
    // SafeAreaView에 동적 배경색 적용
    <SafeAreaView
      style={[styles.screenContainer, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <CustomAppBar />
      {/* contentContainer에 동적 배경색 적용 */}
      <View
        style={[
          styles.contentContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerTextArea}>
          {sentVerification ? (
            <>
              {/* headerTitle에 동적 텍스트 색상 적용 */}
              <Text
                style={[styles.headerTitle, { color: colors.onBackground }]}
              >
                Verify your
              </Text>
              <Text
                style={[styles.headerTitle, { color: colors.onBackground }]}
              >
                phone number
              </Text>
              {/* headerSubtitle에 동적 텍스트 색상 적용 */}
              <Text
                style={[
                  styles.headerSubtitle,
                  { marginTop: 10, color: colors.onSurfaceVariant },
                ]}
              >
                We sent you a 5 digit code (
                {generatedCode ? `Test: ${generatedCode}` : ""}) to your SMS
                messages
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[styles.headerTitle, { color: colors.onBackground }]}
              >
                What's your
              </Text>
              <Text
                style={[styles.headerTitle, { color: colors.onBackground }]}
              >
                phone number?
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { marginTop: 10, color: colors.onSurfaceVariant },
                ]}
              >
                Please confirm your country code and enter your phone number.
              </Text>
            </>
          )}
        </View>

        {/* 자식 컴포넌트들은 내부적으로 useAppTheme를 사용하거나 props로 colors를 전달받아 테마 적용 필요 */}
        {sentVerification ? (
          <VerificationCodeInputPhase
            verificationCodeInput={verificationCodeInput}
            setVerificationCodeInput={setVerificationCodeInput}
          />
        ) : (
          <MobileNumberInputPhase
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            countryCode={countryCode}
            onCountryCodePress={handleCountryCodePress}
          />
        )}

        <CustomButton
          title={"Continue"}
          onPress={
            sentVerification ? handleVerifyCodePress : handleSendCodePress
          }
          width={"100%"}
          buttonColor={colors.primary}
          textColor={colors.onPrimary}
          buttonColorDisabled={colors.surfaceVariant}
          textColorDisabled={colors.onSurfaceVariant}
          style={styles.continueButton}
          disabled={isButtonDisabled}
        />
      </View>
    </SafeAreaView>
  );
}

// StyleSheet.create는 이제 정적인 스타일만 포함합니다.
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    // backgroundColor는 동적으로 적용되므로 여기서 제거
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    // backgroundColor는 동적으로 적용되므로 여기서 제거
  },
  headerTextArea: {
    marginTop: 115,
    marginBottom: 55,
  },
  headerTitle: {
    fontFamily: "Literata", // 해당 폰트가 로드되었는지 확인 필요
    fontSize: 32,
    // color는 동적으로 적용되므로 여기서 제거
  },
  headerSubtitle: {
    fontFamily: "LeagueSpartan-Medium", // 해당 폰트가 로드되었는지 확인 필요
    fontSize: 12,
    // color는 동적으로 적용되므로 여기서 제거
  },
  continueButton: {
    marginBottom: 20,
  },
});
