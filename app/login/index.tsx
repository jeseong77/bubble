import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity, // 현재 직접 사용되지 않지만, 향후 사용 가능성을 위해 유지
} from "react-native";
import CustomButton from "@/components/CustomButton"; // CustomButton 경로 확인
import { useAppTheme } from "@/hooks/useAppTheme"; // 테마 훅 임포트
import { useAuth } from "@/providers/AuthProvider"; // AuthProvider 훅 추가
import * as AppleAuthentication from "expo-apple-authentication";

const loginBgImage = require("../../assets/images/bg.png");

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useAppTheme(); // 앱 테마 색상 가져오기 (전화번호 로그인 버튼에 사용)
  // 👇 isAuthenticating을 AuthProvider로부터 가져옴
  const { signInWithApple, signInWithGoogle, isAuthenticating } = useAuth(); // Auth 훅 사용
  // const [isLoading, setIsLoading] = useState(false); // 👈 제거
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    // Apple 로그인 사용 가능 여부 확인
    const checkAppleAuthAvailability = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(isAvailable);
      } catch (error) {
        console.error(
          "[LoginScreen] Apple 로그인 사용 가능 여부 확인 실패:",
          error
        );
        setIsAppleAuthAvailable(false);
      }
    };

    checkAppleAuthAvailability();
  }, []);

  const handlePhoneSignInPress = () => {
    router.push("/login/verify-phone");
  };

  const handleAppleSignIn = async () => {
    console.log("[LoginScreen] Apple 로그인 시작");
    // setIsLoading(true); // 👈 제거
    try {
      await signInWithApple();
      // '성공' 로그는 AuthProvider가 담당하므로 여기서 제거해도 무방
    } catch (error) {
      // 에러 처리는 AuthProvider에서 이미 하고 있으므로 여기서는 최소화 가능
      console.error("[LoginScreen] Apple 로그인 호출 실패:", error);
    }
    // finally 블록 및 setIsLoading(false) 제거
  };

  const handleGoogleSignIn = async () => {
    console.log("[LoginScreen] Google 로그인 시작");
    // setIsLoading(true); // 👈 제거
    try {
      await signInWithGoogle();
      // '성공' 로그는 AuthProvider가 담당하므로 여기서 제거해도 무방
    } catch (error) {
      // 에러 처리는 AuthProvider에서 이미 하고 있으므로 여기서는 최소화 가능
      console.error("[LoginScreen] Google 로그인 호출 실패:", error);
    }
    // finally 블록 및 setIsLoading(false) 제거
  };

  return (
    <ImageBackground
      source={loginBgImage}
      resizeMode="cover"
      style={styles.background}
    >
      <SafeAreaView style={styles.background}>
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo.png")} // 로고 이미지 경로 확인
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.betterTogether}>Be Popping Together</Text>
          </View>
        </View>

        <View style={[styles.container, { marginBottom: 40 }]}>
          {isAppleAuthAvailable && (
            <CustomButton
              title={isAuthenticating ? "Signing in..." : "Sign in with Apple"}
              onPress={handleAppleSignIn}
              buttonColor={colors.white}
              textColor={colors.black}
              width="80%"
              style={{ marginTop: 28 }}
              disabled={isAuthenticating}
              loading={isAuthenticating}
            />
          )}

          <CustomButton
            title={isAuthenticating ? "Signing in..." : "Sign in with Google"}
            onPress={handleGoogleSignIn}
            buttonColor={colors.facebookBlue}
            textColor={colors.white}
            width="80%"
            style={{ marginTop: 16 }}
            disabled={isAuthenticating}
            loading={isAuthenticating}
          />

          <CustomButton
            title="Sign in with Phone Number"
            onPress={handlePhoneSignInPress}
            buttonColor={colors.secondary}
            textColor={colors.bubbleFont}
            width="80%"
            style={{ marginTop: 16 }}
          />

          <View style={[styles.termsandConditionsContainer, { marginTop: 21 }]}>
            <Text style={styles.termsAndConditions}>
              By signing up to The Bubble, you agree to our
            </Text>
            <Text style={styles.termsAndConditions}>
              Terms of Service. Learn how we process your data
            </Text>
            <Text style={styles.termsAndConditions}>
              in our Privacy Policy and our Cookies Policy.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "space-between",
  },
  container: {
    alignItems: "center",
  },
  logo: {
    height: 73.45,
  },
  logoContainer: {
    marginTop: 60 + 95.55,
    paddingLeft: 20,
    marginBottom: 24,
  },
  betterTogether: {
    fontSize: 18,
    fontWeight: "400",
    color: "#fff",
  },
  termsandConditionsContainer: {
    alignItems: "center",
  },
  termsAndConditions: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
});
