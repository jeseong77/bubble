// src/components/ProfileHero.tsx
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { SkeletonCircle, SkeletonText } from "@/components/ui/Skeleton";
import { FloatingBubble } from "@/components/animations/FloatingBubble";
import { useInvitationCount } from "@/hooks/useInvitationCount";

// ProfileHero props 인터페이스
interface ProfileHeroProps {
  firstName?: string;
  lastName?: string;
  username?: string;
  userId?: string;
  imageUrl?: string;
  skeleton?: boolean; // Add skeleton prop for avatar loading state
  onSettingsPress?: () => void; // Add settings button callback
}

const ProfileHero: React.FC<ProfileHeroProps> = ({
  firstName,
  lastName,
  username,
  userId,
  imageUrl,
  skeleton,
  onSettingsPress,
}) => {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // Use invitation count hook
  const { invitationCount } = useInvitationCount({
    userId: session?.user?.id,
  });

  // 화면 크기나 부모 컨테이너 크기에 따라 동적으로 범위 설정 가능
  const BUBBLE_X_RANGE = 80; // 공이 좌우로 움직일 최대 범위 (중심 기준)
  const BUBBLE_Y_RANGE = 60; // 공이 상하로 움직일 최대 범위 (중심 기준)
  const DURATION_RANGE_MS: [number, number] = [3000, 7000]; // 애니메이션 지속 시간 범위

  const navigateToInvitations = () => {
    router.push("/bubble/invitation");
  };

  if (skeleton) {
    return (
      <View style={[styles.container, { paddingTop: 110 }]}>
        {/* 떠다니는 공들 - 배경 */}
        {/* 다양한 크기와 초기 위치, 딜레이를 가진 공들을 배치합니다. */}
        <FloatingBubble
          size={80}
          initialX={-100}
          initialY={-40}
          delay={0}
          xRange={BUBBLE_X_RANGE}
          yRange={BUBBLE_Y_RANGE}
          durationRange={DURATION_RANGE_MS}
        />
        <FloatingBubble
          size={40}
          initialX={120}
          initialY={-80}
          delay={500}
          xRange={BUBBLE_X_RANGE * 0.8}
          yRange={BUBBLE_Y_RANGE * 0.8}
          durationRange={DURATION_RANGE_MS}
        />
        <FloatingBubble
          size={60}
          initialX={50}
          initialY={100}
          delay={1000}
          xRange={BUBBLE_X_RANGE * 1.2}
          yRange={BUBBLE_Y_RANGE * 1.2}
          durationRange={DURATION_RANGE_MS}
        />
        <FloatingBubble
          size={30}
          initialX={-80}
          initialY={120}
          delay={200}
          xRange={BUBBLE_X_RANGE * 0.7}
          yRange={BUBBLE_Y_RANGE * 0.7}
          durationRange={DURATION_RANGE_MS}
        />
        <FloatingBubble
          size={50}
          initialX={150}
          initialY={50}
          delay={700}
          xRange={BUBBLE_X_RANGE}
          yRange={BUBBLE_Y_RANGE}
          durationRange={DURATION_RANGE_MS}
        />

        {/* 프로필 이미지 컨테이너 */}
        <SkeletonCircle size={142} style={styles.profileImageContainer} />

        {/* 사용자 정보 */}
        <SkeletonText width={200} height={24} style={styles.userNameText} />
        <SkeletonText width={150} height={16} style={styles.instagramIdText} />

        {/* Settings Button */}
        <SkeletonCircle size={44} style={[styles.settingsButtonContainer, { top: 50 }]} />

        {/* Message Indicator Button */}
        <SkeletonCircle size={60} style={styles.messageIndicatorContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: 110 }]}>
      {/* 떠다니는 공들 - 배경 */}
      {/* 다양한 크기와 초기 위치, 딜레이를 가진 공들을 배치합니다. */}
      <FloatingBubble
        size={80}
        initialX={-100}
        initialY={-40}
        delay={0}
        xRange={BUBBLE_X_RANGE}
        yRange={BUBBLE_Y_RANGE}
        durationRange={DURATION_RANGE_MS}
      />
      <FloatingBubble
        size={40}
        initialX={120}
        initialY={-80}
        delay={500}
        xRange={BUBBLE_X_RANGE * 0.8}
        yRange={BUBBLE_Y_RANGE * 0.8}
        durationRange={DURATION_RANGE_MS}
      />
      <FloatingBubble
        size={60}
        initialX={50}
        initialY={100}
        delay={1000}
        xRange={BUBBLE_X_RANGE * 1.2}
        yRange={BUBBLE_Y_RANGE * 1.2}
        durationRange={DURATION_RANGE_MS}
      />
      <FloatingBubble
        size={30}
        initialX={-80}
        initialY={120}
        delay={200}
        xRange={BUBBLE_X_RANGE * 0.7}
        yRange={BUBBLE_Y_RANGE * 0.7}
        durationRange={DURATION_RANGE_MS}
      />
      <FloatingBubble
        size={50}
        initialX={150}
        initialY={50}
        delay={700}
        xRange={BUBBLE_X_RANGE}
        yRange={BUBBLE_Y_RANGE}
        durationRange={DURATION_RANGE_MS}
      />

      {/* 프로필 이미지 컨테이너 */}
      <View
        style={[styles.profileImageContainer, { borderColor: colors.primary }]}
      >
        <Image
          source={
            imageUrl ? { uri: imageUrl } : require("../assets/images/guy.png")
          }
          style={styles.profileImage}
          onLoad={() =>
          }
          onError={(error) =>
          }
        />
      </View>

      {/* 사용자 정보 */}
      <Text style={[styles.userNameText, { color: colors.onBackground }]}>
        {firstName && lastName ? `${firstName} ${lastName}` : "User"}
      </Text>
      <Text
        style={[styles.instagramIdText, { color: colors.primary }]}
      >
        @{username || "user"}
      </Text>

      {/* Settings Button */}
      {onSettingsPress && (
        <TouchableOpacity
          style={[
            styles.settingsButtonContainer,
            { 
              backgroundColor: colors.white,
              top: insets.top + 10,
            },
          ]}
          onPress={onSettingsPress}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={24} color={colors.black} />
        </TouchableOpacity>
      )}

      {/* Message Indicator Button */}
      <TouchableOpacity
        style={[
          styles.messageIndicatorContainer,
          { backgroundColor: '#CEE3FF' },
        ]}
        onPress={navigateToInvitations}
        activeOpacity={0.8}
      >
        <Ionicons name="mail-outline" size={30} color="white" />
        {invitationCount > 0 && (
          <View
            style={[styles.badgeContainer, { backgroundColor: '#FFD95C' }]}
          >
            <Text style={[styles.badgeText, { color: colors.white }]}>
              {invitationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingBottom: 30,
    position: "relative",
    width: "100%",
  },
  profileImageContainer: {
    width: 142, // 이미지 컨테이너 크기
    height: 142,
    borderRadius: 71, // 원형
    borderWidth: 9, // Primary 색상 테두리 두께
    overflow: "hidden", // 이미지가 테두리를 벗어나지 않도록
    marginBottom: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0", // 이미지 로딩 전 배경색
    zIndex: 10, // 공들보다 위에 있도록
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  userNameText: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Quicksand-Bold",
    marginBottom: 4,
    zIndex: 10,
  },
  instagramIdText: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    zIndex: 10,
  },
  settingsButtonContainer: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
    zIndex: 20,
  },
  messageIndicatorContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
  },
  badgeContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Quicksand-Bold",
  },
});

export default ProfileHero;
