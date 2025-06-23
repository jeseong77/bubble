import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router"; // useRouter 추가
import CustomAppBar from "@/components/CustomAppBar";
import { useUIStore } from "@/stores/uiStore";
import { useAppTheme } from "@/hooks/useAppTheme";
import useAuthStore from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";

// SettingsItem 컴포넌트는 변경 없음 (내부 텍스트는 label prop으로 받으므로)
const SettingsItem: React.FC<{
  label: string;
  onPress: () => void;
  iconColor: string;
  textColor: string;
  borderColor: string;
  isLastItem?: boolean;
}> = ({
  label,
  onPress,
  iconColor,
  textColor,
  borderColor,
  isLastItem = false,
}) => (
  <TouchableOpacity
    style={[
      styles.settingsItemBase,
      { borderBottomColor: borderColor },
      isLastItem && styles.settingsItemLast,
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.settingsItemText, { color: textColor }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color={iconColor} />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { hideTabBar, showTabBar } = useUIStore();
  const { colors } = useAppTheme();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      hideTabBar();
      return () => {
        showTabBar();
      };
    }, [hideTabBar, showTabBar])
  );

  const handleLogout = () => {
    console.log("Logout pressed");
    logout();
    // Example: Navigate to a login or initial screen after logout
    // router.replace("/login");
  };

  // 섹션 데이터 영어로 변경
  const sections = [
    {
      title: "Account", // "계정" -> "Account"
      items: [
        {
          label: "Edit Profile", // "프로필 수정" -> "Edit Profile"
          onPress: () => {
            console.log("Edit Profile pressed");
            // router.push("/settings/edit-profile"); // 예시 경로
          },
        },
        {
          label: "Privacy and Security", // "알림 설정" -> 이미지 기반 "Privacy and Security"
          onPress: () => {
            console.log("Privacy and Security pressed");
            // router.push("/settings/privacy-security");
          },
        },
        {
          label: "Share Profile", // 이미지에 있는 "Share Profile" 추가
          onPress: () => console.log("Share Profile pressed"),
          isLast: false, // 이 섹션의 마지막 항목이 아님
        },
        // 이미지에는 "Account" 항목이 하나 더 있었으나, 레이블이 명확하지 않아 생략 또는 추가 가능
        // 예: { label: "Account Settings", onPress: () => console.log("Account Settings pressed"), isLast: true },
      ],
    },
    {
      title: "Content", // "지원" 섹션 대신 이미지의 "Content" 섹션으로 변경
      items: [
        {
          label: "Preferences", // "이용약관" -> 이미지 기반 "Preferences"
          onPress: () => {
            console.log("Preferences pressed");
            // router.push("/settings/preferences");
          },
        },
        {
          label: "Notifications and Sounds", // "개인정보 처리방침" -> 이미지 기반 "Notifications and Sounds"
          onPress: () => {
            console.log("Notifications and Sounds pressed");
            // router.push("/settings/notifications");
          },
          isLast: true,
        },
      ],
    },
    {
      title: "Help & Support", // 이미지에 있는 "Help & Support" 섹션 추가
      items: [
        {
          label: "Help",
          onPress: () => console.log("Help pressed"),
          isLast: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeAreaContainer, { backgroundColor: colors.white }]}
      edges={["top", "left", "right"]}
    >
      <CustomAppBar
        title="Settings"
        showBackButton={true}
        backIconColor={colors.black}
        titleTextStyle={{color: colors.black}}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.sectionContainer}>
            {section.title && (
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.black },
                ]}
              >
                {section.title}
              </Text>
            )}
            {section.items.map((item, itemIndex) => (
              <SettingsItem
                key={itemIndex}
                label={item.label}
                onPress={item.onPress}
                iconColor={colors.black}
                textColor={colors.black}
                borderColor={colors.black}
                isLastItem={item.isLast}
              />
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={[
            styles.logoutButtonBase,
            {
              backgroundColor: colors.white, // 테마에 따라 surface 또는 투명 처리 가능
              borderColor: colors.error,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>
            Log out {/* "로그아웃" -> "Log out" */}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.black }]}>
        <Text style={[styles.versionText, { color: colors.black }]}>
          Version 1.0.0 {/* "버전 정보" -> "Version" */}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginTop: Platform.OS === "ios" ? 24 : 28,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Literata-Bold",
    paddingHorizontal: 16,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  settingsItemBase: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsItemLast: {
    borderBottomWidth: 0,
  },
  settingsItemText: {
    fontSize: 17,
    fontFamily: "Literata",
  },
  logoutButtonBase: {
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: "Literata-Bold",
    fontWeight: "600",
  },
  footer: {
    paddingVertical: Platform.OS === "ios" ? 24 : 20,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    // borderTopColor는 인라인으로 적용
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Literata",
  },
});
