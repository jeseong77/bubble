import React from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from "react-native";
import CustomButton from "@/components/CustomButton";

const loginBgImage = require("../../assets/images/bg.jpg");

export default function LoginScreen() {
  const router = useRouter();

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
              source={require("../../assets/images/logo.png")}
              // 1. styles.logo 적용
              style={styles.logo}
              // 3. resizeMode="contain" 설정
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.betterTogether}>Better Together.</Text>
          </View>
        </View>

        {/* upper part / lower part */}

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
            onPress={() => {}}
            buttonColor="#FFFFFF"
            textColor="#000000"
            width="80%"
            style={{ marginTop: 28 }}
          />

          <CustomButton
            title="Sign in with Facebook"
            onPress={() => {}}
            buttonColor="#6363D3"
            textColor="#FFFFFF"
            width="80%"
            style={{ marginTop: 16 }}
          />

          <CustomButton
            title="Sign in with Phone Number"
            onPress={handlePhoneSignInPress}
            buttonColor="#FFAC59"
            textColor="#000000"
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
  mainContainer: {
    flex: 1,
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
    color: "#fff",
  },
  button: {
    borderRadius: 30,
  },
  termsandConditionsContainer: {
    alignItems: "center",
  },
  termsAndConditions: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
    fontFamily: "LeagueSpartan",
  },
});
