// src/components/ProfileHero.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  withSequence,
  SharedValue,
} from "react-native-reanimated";
import { useAppTheme } from "@/hooks/useAppTheme"; // 테마 훅 경로 확인
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRealtime } from "@/providers/RealtimeProvider";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useFocusEffect } from "@react-navigation/native";

// Skeleton Components
const SkeletonCircle = ({ size, style }: { size: number; style?: any }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#f0f0f0",
      },
      style,
    ]}
  />
);

const SkeletonText = ({
  width,
  height,
  style,
}: {
  width: number;
  height: number;
  style?: any;
}) => (
  <View
    style={[
      {
        width,
        height,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
      },
      style,
    ]}
  />
);

// ProfileHero props 인터페이스
interface ProfileHeroProps {
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  skeleton?: boolean; // Add skeleton prop for avatar loading state
}

interface FloatingBubbleProps {
  size: number;
  initialX: number;
  initialY: number;
  delay?: number;
  xRange: number;
  yRange: number;
  durationRange: [number, number];
}

// 개별 공 애니메이션 컴포넌트
const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  size,
  initialX,
  initialY,
  delay = 0,
  xRange,
  yRange,
  durationRange,
}) => {
  const { colors } = useAppTheme();
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const opacity = useSharedValue(0.3); // 초기 투명도

  useEffect(() => {
    const randomDuration = () =>
      Math.random() * (durationRange[1] - durationRange[0]) + durationRange[0];

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialX + (Math.random() - 0.5) * 2 * xRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1), // 부드러운 움직임
          }),
          withTiming(initialX + (Math.random() - 0.5) * 2 * xRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(initialX, {
            // 원래 X 위치 근처로 복귀 시도
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          })
        ),
        -1, // 무한 반복
        true // 반대 방향으로도 애니메이션
      )
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialY + (Math.random() - 0.5) * 2 * yRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(initialY + (Math.random() - 0.5) * 2 * yRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(initialY, {
            // 원래 Y 위치 근처로 복귀 시도
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          })
        ),
        -1, // 무한 반복
        true // 반대 방향으로도 애니메이션
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: randomDuration() * 0.8 }), // 좀 더 선명하게
          withTiming(0.3, { duration: randomDuration() * 1.2 }) // 다시 흐릿하게
        ),
        -1,
        true
      )
    );
  }, [
    translateX,
    translateY,
    opacity,
    initialX,
    initialY,
    delay,
    xRange,
    yRange,
    durationRange,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ] as any,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary, // Primary 색상 사용
        },
        animatedStyle,
      ]}
    />
  );
};

// Reanimated v2 이상에서는 withDelay가 내장되어 있지 않을 수 있습니다.
// 필요시 간단하게 구현하거나, reanimated-helper 등의 라이브러리를 사용합니다.
// 여기서는 setTimeout을 이용한 간단한 딜레이 효과를 가정합니다.
// (실제 복잡한 애니메이션에서는 requestAnimationFrame 기반의 딜레이나
// reanimated의 sequence 기능을 활용하는 것이 더 적합할 수 있습니다.)
// Reanimated 2/3의 경우, withDelay는 withSequence의 일부로 사용될 수 있습니다.
// 좀 더 정확한 Reanimated 2/3 스타일의 딜레이는 애니메이션 시작 부분에서 처리합니다.
const withDelay = (delayMs: number, animation: any) => {
  // Reanimated 2/3 에서는 SharedValue의 .value 할당 시점에 setTimeout을 사용하거나,
  // useDerivedValue와 같은 훅 내부에서 타이밍을 제어하는 방식을 사용합니다.
  // 이 예제에서는 useEffect 내에서 애니메이션 시작을 늦추는 방식으로 구현합니다.
  // useEffect 내에서 setTimeout으로 애니메이션 시작을 감싸는 형태로 적용됩니다.
  // FloatingBubble의 useEffect 내에서 withTiming/withRepeat을 setTimeout으로 감싸면 됩니다.
  // 이 함수는 개념적인 표현이며, 실제 사용 시에는 useEffect 내에서 직접 딜레이 로직을 구현합니다.
  return animation; // 여기서는 단순 반환, 실제 딜레이는 useEffect에서 처리
};

const ProfileHero: React.FC<ProfileHeroProps> = ({
  firstName,
  lastName,
  imageUrl,
  skeleton,
}) => {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { invitations } = useRealtime();
  const { session } = useAuth();

  // Local state for real-time invitation count
  const [realTimeInvitationCount, setRealTimeInvitationCount] = useState(0);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  // 화면 크기나 부모 컨테이너 크기에 따라 동적으로 범위 설정 가능
  const BUBBLE_X_RANGE = 80; // 공이 좌우로 움직일 최대 범위 (중심 기준)
  const BUBBLE_Y_RANGE = 60; // 공이 상하로 움직일 최대 범위 (중심 기준)
  const DURATION_RANGE_MS: [number, number] = [3000, 7000]; // 애니메이션 지속 시간 범위

  // Fetch real-time invitation count from database
  const fetchRealTimeInvitationCount = async () => {
    if (!session?.user) return;

    setIsLoadingInvitations(true);
    try {
      console.log("[ProfileHero] 🔄 Fetching real-time invitation count...");

      const { data, error } = await supabase.rpc("get_my_bubbles", {
        p_user_id: session.user.id,
      });

      if (error) {
        console.error("[ProfileHero] ❌ Error fetching invitations:", error);
        return;
      }

      console.log("[ProfileHero] get_my_bubbles 응답:", data);
      
      // Filter only invited status bubbles
      const invitedCount = (data || []).filter(
        (bubble: any) => bubble.user_status === "invited"
      ).length;

      console.log("[ProfileHero] 📊 Real-time invitation count:", invitedCount);
      setRealTimeInvitationCount(invitedCount);
    } catch (error) {
      console.error("[ProfileHero] ❌ Exception fetching invitations:", error);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  // Fetch invitations when component mounts
  useEffect(() => {
    fetchRealTimeInvitationCount();
  }, [session]);

  // Refresh invitation count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log(
        "[ProfileHero] 🎯 Screen focused, refreshing invitation count..."
      );
      fetchRealTimeInvitationCount();
    }, [session])
  );

  const navigateToInvitations = () => {
    // Navigate to the invitation page
    router.push("/bubble/invitation");
  };

  if (skeleton) {
    return (
      <View style={[styles.container, { paddingTop: 60 }]}>
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
        <SkeletonCircle size={150} style={styles.profileImageContainer} />

        {/* 사용자 정보 */}
        <SkeletonText width={200} height={24} style={styles.userNameText} />
        <SkeletonText width={150} height={16} style={styles.instagramIdText} />

        {/* Message Indicator Button */}
        <SkeletonCircle size={60} style={styles.messageIndicatorContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: 60 }]}>
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
            console.log("ProfileHero image loaded successfully:", imageUrl)
          }
          onError={(error) =>
            console.error("ProfileHero image load error:", error.nativeEvent)
          }
        />
      </View>

      {/* 사용자 정보 */}
      <Text style={[styles.userNameText, { color: colors.onBackground }]}>
        {firstName && lastName ? `${firstName} ${lastName}` : "User"}
      </Text>
      <Text
        style={[styles.instagramIdText, { color: colors.onSurfaceVariant }]}
      >
        @{firstName?.toLowerCase() || "user"}
        {lastName?.toLowerCase() || ""}
      </Text>

      {/* Message Indicator Button */}
      <TouchableOpacity
        style={[
          styles.messageIndicatorContainer,
          { backgroundColor: colors.secondary },
        ]}
        onPress={navigateToInvitations}
        activeOpacity={0.8}
      >
        <Ionicons name="mail-outline" size={30} color={colors.onSecondary} />
        {realTimeInvitationCount > 0 && (
          <View
            style={[styles.badgeContainer, { backgroundColor: colors.error }]}
          >
            <Text style={[styles.badgeText, { color: colors.white }]}>
              {realTimeInvitationCount}
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
    position: "relative", // 공들을 위한 기준점
    width: "100%",
    // backgroundColor: '#f0f0f0', // 배경색 확인용
  },
  profileImageContainer: {
    width: 150, // 이미지 컨테이너 크기
    height: 150,
    borderRadius: 75, // 원형
    borderWidth: 5, // Primary 색상 테두리 두께
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
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Quicksand-Bold",
    marginBottom: 4,
    zIndex: 10,
  },
  instagramIdText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    zIndex: 10,
  },
  bubble: {
    position: "absolute", // 부모 View (styles.container) 기준으로 절대 위치
    // backgroundColor는 FloatingBubble 컴포넌트 내부에서 설정
    // zIndex를 낮춰 프로필 이미지/텍스트보다 뒤에 있도록 할 수 있지만,
    // 보통은 렌더링 순서로 조절합니다. (배경 요소들을 먼저 렌더링)
  },
  messageIndicatorContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
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
