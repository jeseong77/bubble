import React from "react";
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

const loginBgImage = require("../../assets/images/bg.png"); // 배경 이미지 경로 확인

// 소셜 로그인 버튼들의 고정 색상 정의
const APPLE_BUTTON_BACKGROUND = "#FFFFFF"; // Apple 버튼 배경색 (일반적으로 흰색)
const APPLE_BUTTON_TEXT = "#000000"; // Apple 버튼 텍스트색 (일반적으로 검은색)

const FACEBOOK_BUTTON_BACKGROUND = "#1877F2"; // Facebook 공식 브랜드 파란색
const FACEBOOK_BUTTON_TEXT = "#FFFFFF"; // Facebook 버튼 텍스트색 (흰색)

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useAppTheme(); // 앱 테마 색상 가져오기 (전화번호 로그인 버튼에 사용)

  const handlePhoneSignInPress = () => {
    router.push("/login/verify-phone");
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
            <Text style={styles.betterTogether}>Better Together.</Text>
          </View>
        </View>

        {/* 하단 버튼 및 약관 영역 */}
        <View style={[styles.container, { marginBottom: 40 }]}>
          <View style={styles.termsandConditionsContainer}>
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
          <CustomButton
            title="Sign in with Apple"
            onPress={() => {
              /* Apple 로그인 로직 */
            }}
            buttonColor={APPLE_BUTTON_BACKGROUND} // <--- [변경] Apple 고정 배경색
            textColor={APPLE_BUTTON_TEXT} // <--- [변경] Apple 고정 텍스트색
            width="80%"
            style={{ marginTop: 28 }}
          />

          <CustomButton
            title="Sign in with Facebook"
            onPress={() => {
              /* Facebook 로그인 로직 */
            }}
            buttonColor={FACEBOOK_BUTTON_BACKGROUND} // <--- [변경] Facebook 고정 배경색
            textColor={FACEBOOK_BUTTON_TEXT} // <--- [변경] Facebook 고정 텍스트색
            width="80%"
            style={{ marginTop: 16 }}
          />

          <CustomButton
            title="Sign in with Phone Number"
            onPress={handlePhoneSignInPress}
            buttonColor={colors.primary} // <--- [유지/확정] 앱 테마의 primary 색상
            textColor={colors.onPrimary} // <--- [유지/확정] 앱 테마의 onPrimary 색상
            width="80%"
            style={{ marginTop: 16 }}
          />
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
    height: 62,
  },
  logoContainer: {
    marginTop: 60,
    marginBottom: 24,
  },
  betterTogether: {
    fontSize: 18,
    fontWeight: "400",
    color: "#fff", // 배경 이미지 위에 표시되므로 흰색 유지
  },
  termsandConditionsContainer: {
    alignItems: "center",
  },
  termsAndConditions: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff", // 배경 이미지 위에 표시되므로 흰색 유지
    // fontFamily: "LeagueSpartan", // 해당 폰트가 로드되었는지 확인 필요
  },
});
