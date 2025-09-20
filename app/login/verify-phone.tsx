import * as React from "react";
import { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomAppBar from "../../components/CustomAppBar";
import CircleButton from "@/components/CircleButton";
import MobileNumberInputPhase from "./verify-phases/MobileNumberInputPhase";
import VerificationCodeInputPhase from "./verify-phases/VerificationCodeInputPhase";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/hooks/useAppTheme";

const VerifyPhoneScreenNested = () => {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();

  const [sentVerification, setSentVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const handleCountryCodePress = () => {
    console.log("Country code pressed!");
  };

  const handleSendCodePress = async () => {
    console.log("Continue Pressed: Sending SMS OTP");
    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    
    if (!cleanedPhone) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }

    if (cleanedPhone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit US phone number.");
      return;
    }

    // Format phone number for Supabase (US numbers only)
    const formattedPhone = `${countryCode}${cleanedPhone}`;
    console.log("Formatted phone number:", formattedPhone);

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        console.error("SMS sending error:", error);
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      console.log("SMS OTP sent successfully:", data);
      setSentVerification(true);
      setCanResend(false);
      
      // Start 60-second cooldown timer
      let timer = 60;
      setResendTimer(timer);
      const interval = setInterval(() => {
        timer -= 1;
        setResendTimer(timer);
        if (timer <= 0) {
          clearInterval(interval);
          setCanResend(true);
          setResendTimer(0);
        }
      }, 1000);

      Alert.alert(
        "Verification Code Sent",
        "We've sent a 6-digit code to your phone number via SMS."
      );
    } catch (error) {
      console.error("Unexpected error sending SMS:", error);
      setError("Failed to send verification code. Please try again.");
      Alert.alert("Error", "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCodePress = async () => {
    console.log("Verifying OTP code:", verificationCodeInput);
    
    if (!verificationCodeInput.trim() || verificationCodeInput.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code.");
      return;
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    const formattedPhone = `${countryCode}${cleanedPhone}`;
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: verificationCodeInput,
        type: 'sms'
      });

      if (error) {
        console.error("OTP verification error:", error);
        setError(error.message);
        Alert.alert("Verification Error", error.message);
        return;
      }

      if (session) {
        console.log("Phone verification successful! User authenticated:", session.user.id);
        // User is now authenticated in Supabase
        // Navigate directly to profile setup (skip email collection for phone users)
        router.replace("/onboarding/profile-setup");
      } else {
        console.error("No session created after verification");
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Unexpected error during verification:", error);
      setError("Verification failed. Please try again.");
      Alert.alert("Error", "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = isLoading || (sentVerification
    ? verificationCodeInput.length !== 6
    : !phoneNumber.trim() || phoneNumber.replace(/\D/g, "").length !== 10);

  return (
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
                    { marginTop: 27, color: colors.black },
                  ]}
                >
                  We sent you a 6-digit code to your SMS messages
                  {resendTimer > 0 && ` (Resend in ${resendTimer}s)`}
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
                    { marginTop: 27, color: colors.black },
                  ]}
                ></Text>
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

        {sentVerification && (
          <View style={styles.resendContainer}>
            <TouchableOpacity
              onPress={handleSendCodePress}
              disabled={!canResend || isLoading}
              style={[
                styles.resendButton,
                (!canResend || isLoading) && styles.disabledResendButton
              ]}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  { color: canResend && !isLoading ? colors.primary : colors.mediumGray }
                ]}
              >
                {isLoading ? "Sending..." : canResend ? "Resend Code" : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTextArea: {
    marginTop: "25%",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
  },
  headerSubtitle: {
    fontFamily: "Quicksand-Medium",
    fontSize: 12,
    marginBottom: 40,
  },
  circleButton: {
    position: "absolute",
    right: 22,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  disabledResendButton: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    fontFamily: "Quicksand-Medium",
    textAlign: "center",
  },
});

export default VerifyPhoneScreenNested;
