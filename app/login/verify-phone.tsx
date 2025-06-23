import React, { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
  TouchableWithoutFeedback, // 1. 추가
  Keyboard, // 1. 추가
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomAppBar from "../../components/CustomAppBar";
import CircleButton from "@/components/CircleButton";
import { generateVerificationCode } from "@/utils/auth/verification";
import MobileNumberInputPhase from "./verify-phases/MobileNumberInputPhase";
import VerificationCodeInputPhase from "./verify-phases/VerificationCodeInputPhase";
import useAuthStore from "../../stores/authStore";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function VerifyPhoneScreenNested() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();

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
    // 2. TouchableWithoutFeedback으로 화면 전체를 감싸기
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        style={[styles.screenContainer, { backgroundColor: colors.white }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <CustomAppBar />
        <View style={[styles.contentContainer]}>
          <View style={styles.headerTextArea}>
            {sentVerification ? (
              <>
                <Text style={[styles.headerTitle, { color: colors.black }]}>
                  Verify your
                </Text>
                <Text style={[styles.headerTitle, { color: colors.black }]}>
                  phone number
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { marginTop: 10, color: colors.black },
                  ]}
                >
                  We sent you a 5 digit code (
                  {generatedCode ? `Test: ${generatedCode}` : ""}) to your SMS
                  messages
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.headerTitle, { color: colors.black }]}>
                  What's your
                </Text>
                <Text style={[styles.headerTitle, { color: colors.black }]}>
                  phone number?
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { marginTop: 10, color: colors.black },
                  ]}
                >
                  Please confirm your country code and enter your phone number.
                </Text>
              </>
            )}
          </View>

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
        </View>

        <CircleButton
          onPress={
            sentVerification ? handleVerifyCodePress : handleSendCodePress
          }
          disabled={isButtonDisabled}
          style={[styles.circleButton, { bottom: bottom + 4 }]}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTextArea: {
    marginTop: 115,
    marginBottom: 55,
  },
  headerTitle: {
    fontFamily: "Literata",
    fontSize: 32,
  },
  headerSubtitle: {
    fontFamily: "LeagueSpartan-Medium",
    fontSize: 12,
  },
  circleButton: {
    position: "absolute",
    right: 22,
  },
});
