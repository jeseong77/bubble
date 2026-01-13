import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { userBubble, oppositeBubbles } from "./mockData";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Adaptive sizing
const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);
const userBubbleDiameter = Math.max(screenWidth * 0.32, 120);
const userBubbleImageSize = userBubbleDiameter * 0.54;
const overlapRatio = 0.32;
const centerBubbleImageSize = centerBubbleDiameter * 0.44;
const centerBubbleOverlap = centerBubbleImageSize * 0.18;

export default function MatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bubbleIdx, setBubbleIdx] = useState(0);
  const [displayedBubble, setDisplayedBubble] = useState(oppositeBubbles[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handleUserClick = (user: any) => {
    router.push({
      pathname: "/bubble/user/[userId]",
      params: {
        userId: user.id,
        name: user.name,
        age: user.age,
        mbti: user.mbti,
        height: user.height,
        location: user.location,
        bio: user.bio,
        images: JSON.stringify(user.images),
      },
    });
  };

  const changeBubbleAndAnimateIn = (direction: "left" | "right") => {
    const nextIdx = (bubbleIdx + 1) % oppositeBubbles.length;
    const nextBubbleData = oppositeBubbles[nextIdx];

    setBubbleIdx(nextIdx);
    setDisplayedBubble(nextBubbleData);

    const entryX =
      direction === "left" ? screenWidth * 0.5 : -screenWidth * 0.5;
    translateX.value = entryX;
    translateY.value = -screenHeight * 0.3;
    scale.value = 0.6;

    translateX.value = withTiming(0, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400 });
    scale.value = withTiming(1, { duration: 400 });
    opacity.value = withTiming(1, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(setIsAnimating)(false);
      }
    });
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (isAnimating) return;
    setIsAnimating(true);

    const targetX =
      direction === "left" ? -screenWidth * 0.5 : screenWidth * 0.5;
    translateX.value = withTiming(targetX, { duration: 400 });
    translateY.value = withTiming(screenHeight * 0.3, { duration: 400 });
    scale.value = withTiming(0.6, { duration: 400 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(changeBubbleAndAnimateIn)(direction);
      }
    });
  };

  const animatedBubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    } as ViewStyle;
  });

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top }]}
      edges={["top"]}
    >
      <LinearGradient
        colors={["#e3f0ff", "#cbe2ff", "#e3f0ff"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.userBubbleContainer,
          {
            left: Math.max(
              0,
              (screenWidth - centerBubbleDiameter) / 2 -
                userBubbleDiameter * 0.18
            ),
            top: insets.top + 24,
            width: userBubbleDiameter,
            height: userBubbleDiameter + 24,
          },
        ]}
      >
        <BlurView
          style={styles.userBubbleBlur}
          intensity={Platform.OS === "ios" ? 60 : 80}
          tint="light"
        >
          <Text style={styles.userBubbleName}>{userBubble.name}</Text>
          <View style={styles.userBubbleRow}>
            {userBubble.users.map((user, idx) => (
              <View
                key={user.name}
                style={{
                  marginLeft:
                    idx === 1 ? -userBubbleImageSize * overlapRatio : 0,
                  zIndex: idx === 0 ? 2 : 1,
                }}
              >
                <Image
                  source={user.image}
                  style={{
                    width: userBubbleImageSize,
                    height: userBubbleImageSize,
                    borderRadius: userBubbleImageSize / 2,
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                />
              </View>
            ))}
          </View>
        </BlurView>
        <View style={styles.pinIconWrap}>
          <View style={styles.pinCircle}>
            <Feather name="feather" size={18} color="#fff" />
          </View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.centerBubbleWrap,
          {
            top: screenHeight * 0.17 + insets.top,
            left: (screenWidth - centerBubbleDiameter) / 2,
            width: centerBubbleDiameter,
            height: centerBubbleDiameter,
          },
          animatedBubbleStyle,
        ]}
      >
        <BlurView
          style={styles.centerBubbleBlur}
          intensity={Platform.OS === "ios" ? 60 : 80}
          tint="light"
        >
          <Text style={styles.centerBubbleName}>{displayedBubble.name}</Text>
          <View style={styles.centerBubbleRow}>
            {displayedBubble.users.map((user, idx) => (
              <TouchableOpacity
                key={user.id}
                style={{
                  marginLeft: idx === 1 ? -centerBubbleOverlap : 0,
                  zIndex: idx === 0 ? 2 : 1,
                  alignItems: "center",
                }}
                onPress={() => handleUserClick(user)}
                activeOpacity={0.7}
              >
                <Text style={styles.centerBubbleUserName}>
                  {user.name} {user.age}
                </Text>
                <Image source={user.image} style={styles.centerBubbleImage} />
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      </Animated.View>

      <TouchableOpacity
        style={styles.xButton}
        onPress={() => handleSwipe("left")}
      >
        <Feather name="x" size={36} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.checkButton}
        onPress={() => handleSwipe("right")}
      >
        <Feather name="heart" size={36} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  userBubbleContainer: {
    position: "absolute",
    zIndex: 10,
    overflow: "visible",
  },
  userBubbleBlur: {
    width: userBubbleDiameter,
    height: userBubbleDiameter,
    borderRadius: userBubbleDiameter / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  userBubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  userBubbleName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
  },
  pinIconWrap: {
    position: "absolute",
    top: -0,
    right: -0,
    backgroundColor: "transparent",
    elevation: 50,
    pointerEvents: "box-none",
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8ec3ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 50,
    elevation: 50,
  },
  centerBubbleWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
  },
  centerBubbleBlur: {
    width: centerBubbleDiameter,
    height: centerBubbleDiameter,
    borderRadius: centerBubbleDiameter / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  centerBubbleName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#303030",
    marginBottom: 18,
    marginTop: 12,
    textAlign: "center",
  },
  centerBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
  },
  centerBubbleImage: {
    width: centerBubbleImageSize,
    height: centerBubbleImageSize,
    borderRadius: centerBubbleImageSize / 2,
    borderWidth: 2.5,
    borderColor: "#fff",
    backgroundColor: "#eee",
    marginBottom: 8,
  },
  centerBubbleUserName: {
    fontSize: 20,
    color: "#303030",
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  xButton: {
    position: "absolute",
    left: 32,
    bottom: 48,
    backgroundColor: "#8ec3ff",
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkButton: {
    position: "absolute",
    right: 32,
    bottom: 48,
    backgroundColor: "#8ec3ff",
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
