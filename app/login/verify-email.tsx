import * as React from "react";
import { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";
import CircleButton from "@/components/CircleButton";
import { useAuth } from "@/providers/AuthProvider";

const VerifyEmailScreen = () => {
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [localPart, setLocalPart] = useState("");
  const [domainPart, setDomainPart] = useState("");
  const [touched, setTouched] = useState(false);
  const { completeOnboarding } = useAuth();

  const email = `${localPart}@${domainPart}`;
  const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

  const handleNext = () => {
    if (isValidEmail(email)) {
      // 이메일 검증 완료 후 온보딩으로 이동
      router.replace("/onboarding");
    }
  };

  const handleNotNow = () => {
    // 이메일 없이 온보딩으로 이동
    router.replace("/onboarding");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        style={[styles.screenContainer, { backgroundColor: colors.white }]}
      >
        <View style={[styles.contentContainer]}>
          <View style={styles.headerTextArea}>
            <Text style={[styles.headerTitle, { color: colors.black }]}>
              What's your email?
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.darkGray }]}>
              We'll use it to recover your account if you can't log in.
            </Text>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.emailBoxRow}>
              <TextInput
                style={[
                  styles.emailInputBox,
                  { backgroundColor: colors.lightGray, color: colors.black },
                ]}
                placeholder=""
                placeholderTextColor={colors.mediumGray}
                value={localPart}
                onChangeText={setLocalPart}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                autoCorrect={false}
                maxLength={64}
              />
              <View style={styles.atSymbolContainer}>
                <Text style={styles.atSymbol}>@</Text>
              </View>
              <TextInput
                style={[
                  styles.emailInputBox,
                  { backgroundColor: colors.lightGray, color: colors.black },
                ]}
                placeholder=""
                placeholderTextColor={colors.mediumGray}
                value={domainPart}
                onChangeText={setDomainPart}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="none"
                autoCorrect={false}
                maxLength={255}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.notNowButton}
            onPress={handleNotNow}
            activeOpacity={0.7}
          >
            <Text style={[styles.notNowText, { color: colors.navy }]}>
              Not Now
            </Text>
          </TouchableOpacity>
        </View>
        <CircleButton
          onPress={handleNext}
          disabled={!isValidEmail(email)}
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
    marginTop: "35%",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    marginBottom: 50,
  },
  headerSubtitle: {
    fontFamily: "Quicksand-Medium",
    fontSize: 12,
    marginBottom: 30,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    justifyContent: "center",
  },
  emailBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 12,
  },
  emailInputBox: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    paddingHorizontal: 26,
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
    fontWeight: "500",
    minWidth: 120,
    textAlign: "left",
  },
  atSymbolContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: 64,
    width: 32,
  },
  atSymbol: {
    fontSize: 28,
    color: "#999",
    fontFamily: "Quicksand-Regular",
    fontWeight: "500",
    textAlign: "center",
  },
  circleButton: {
    position: "absolute",
    right: 22,
  },
  notNowButton: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  notNowText: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    fontWeight: "500",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});

export default VerifyEmailScreen;
