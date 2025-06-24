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

const loginBgImage = require("../../assets/images/bg.png");

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
            <Text style={styles.betterTogether}>Be Popping Together</Text>
          </View>
        </View>

        <View style={[styles.container, { marginBottom: 40 }]}>
          <CustomButton
            title="Sign in with Apple"
            onPress={() => {
              /* Apple 로그인 로직 */
            }}
            buttonColor={colors.white}
            textColor={colors.black}
            width="80%"
            style={{ marginTop: 28 }}
          />

          <CustomButton
            title="Sign in with Facebook"
            onPress={() => {
              /* Facebook 로그인 로직 */
            }}
            buttonColor={colors.facebookBlue}
            textColor={colors.white}
            width="80%"
            style={{ marginTop: 16 }}
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
