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
import { useFocusEffect, useRouter } from "expo-router";
import CustomAppBar from "@/components/CustomAppBar";
import { useUIStore } from "@/stores/uiStore";
import { useAppTheme } from "@/hooks/useAppTheme";
import useAuthStore from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";

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
  };

  const sections = [
    {
      title: "Account",
      items: [
        {
          label: "Edit Profile",
          onPress: () => {
            console.log("Edit Profile pressed");
          },
        },
        {
          label: "Privacy and Security",
          onPress: () => {
            console.log("Privacy and Security pressed");
          },
        },
        {
          label: "Share Profile",
          onPress: () => console.log("Share Profile pressed"),
          isLast: false,
        },
      ],
    },
    {
      title: "Content",
      items: [
        {
          label: "Preferences",
          onPress: () => {
            console.log("Preferences pressed");
          },
        },
        {
          label: "Notifications and Sounds",
          onPress: () => {
            console.log("Notifications and Sounds pressed");
          },
          isLast: true,
        },
      ],
    },
    {
      title: "Help & Support",
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
        titleTextStyle={{ color: colors.black }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.sectionContainer}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: colors.black }]}>
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
              backgroundColor: colors.white,
              borderColor: colors.error,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>
            Log out
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.black }]}>
        <Text style={[styles.versionText, { color: colors.black }]}>
          Version 1.0.0
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
    fontFamily: "Quicksand-Bold",
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
    fontFamily: "Quicksand-Regular",
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
    fontFamily: "Quicksand-Bold",
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
    fontFamily: "Quicksand-Regular",
  },
});
