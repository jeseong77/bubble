import React, { useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Text, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import CustomAppBar from "../../components/CustomAppBar";
import CustomButton from "@/components/CustomButton";
import { generateVerificationCode } from "@/utils/auth/verification";
// --- 분리된 컴포넌트 import ---
import {
  MobileNumberInputPhase,
  VerificationCodeInputPhase,
} from "./verify-phases"; // index.ts 또는 각 파일에서 import
// --------------------------
import useAuthStore from "../../stores/authStore"; // Zustand 스토어 import

// --- 외부 컴포넌트 정의는 여기에 없어야 합니다 ---
// interface MobileNumberInputProps { ... }
// const MobileNumberInputPhase: React.FC<...> = (...) => { ... };
// interface VerificationCodeInputProps { ... }
// const VerificationCodeInputPhase: React.FC<...> = (...) => { ... };
// --- ---

export default function VerifyPhoneScreenNested() {
  const router = useRouter();
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
    console.log("Continue Pressed");
    console.log("Country Code:", countryCode);
    console.log("Phone Number:", phoneNumber);

    const code = generateVerificationCode();
    setGeneratedCode(code);
    console.log("Generated Verification Code:", code);

    setSentVerification(true);
  };

  const handleVerifyCodePress = () => {
    console.log("Verifying code:", verificationCodeInput);
    if (verificationCodeInput === generatedCode) {
      console.log(
        "Verification successful! Updating auth state and navigating..."
      );
      const fakeToken = `verified-token-${Date.now()}`;
      const fakeUser = { id: phoneNumber, name: "Verified User" };
      login(fakeToken, fakeUser);
      router.replace("/onboarding");
    } else {
      console.log("Verification failed: Codes do not match.");
      Alert.alert("Error", "Verification code does not match.");
    }
  };

  const isButtonDisabled = sentVerification
    ? verificationCodeInput.length !== 5
    : !phoneNumber;

  return (
    <SafeAreaView style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomAppBar />
      <View style={styles.contentContainer}>
        <View style={styles.headerTextArea}>
          {sentVerification ? (
            <>
              <Text style={styles.headerTitle}>Verify your</Text>
              <Text style={styles.headerTitle}>phone number</Text>
              <Text style={[styles.headerSubtitle, { marginTop: 10 }]}>
                We sent you a 5 digit code ({generatedCode}) to your SMS
                messages
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.headerTitle}>What's your</Text>
              <Text style={styles.headerTitle}>phone number?</Text>
              <Text style={[styles.headerSubtitle, { marginTop: 10 }]}>
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

        <CustomButton
          title={"Continue"}
          onPress={
            sentVerification ? handleVerifyCodePress : handleSendCodePress
          }
          width={"100%"}
          buttonColor="#6363D3"
          buttonColorDisabled="#A6A6FF"
          style={styles.continueButton}
          disabled={isButtonDisabled}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
  },
  headerTextArea: {
    marginTop: 115,
    marginBottom: 55,
  },
  headerTitle: {
    fontFamily: "Literata",
    fontSize: 32,
    color: "#000000",
  },
  headerSubtitle: {
    fontFamily: "LeagueSpartan-Medium",
    fontSize: 12,
    color: "#7A7A7A",
  },
  continueButton: {
    marginBottom: 20,
  },
  // 분리된 컴포넌트들의 스타일은 각자의 파일에 있어야 합니다.
});
