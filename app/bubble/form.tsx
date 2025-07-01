import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  TouchableWithoutFeedback,
  Platform, // Platform 추가
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
// KeyboardAwareScrollView import 추가
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const mockProfileData = {
  userId: "john_doe_123",
  firstName: "Noah",
  lastName: "Kim",
  age: 30,
  birthDay: "15",
  birthMonth: "07",
  birthYear: "1994",
  height: 180,
  mbti: "INFP",
  gender: "Man",
  genderVisibleOnProfile: true,
  aboutMe:
    "Loves coding, hiking, and exploring new coffee shops. Always looking for new adventures and interesting people to meet!",
  images: [
    { uri: "https://picsum.photos/seed/noah_kim/200/200" },
    null,
    null,
    null,
    null,
    null,
  ],
};

const invitedUser = {
  firstName: "Brian",
  lastName: "Oh",
  image: { uri: "https://picsum.photos/seed/brian_02/200/200" },
  mbti: "ESTJ",
};

export default function BubbleFormScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [phase, setPhase] = useState<
    "naming" | "named" | "formed" | "poppable"
  >("naming");
  const [bubbleName, setBubbleName] = useState("");
  const screenWidth = Dimensions.get("window").width;
  const totalBubblesWidth = screenWidth * 0.9;
  const overlapRatio = 0.18;
  const bubbleSize = totalBubblesWidth / (2 - overlapRatio);
  const overlapOffset = bubbleSize * overlapRatio;
  const [showPoppableMent, setShowPoppableMent] = useState(false);
  const [poppableTimeout, setPoppableTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAccepted(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log(`[BubbleForm] accepted: ${accepted}, phase: ${phase}`);
    if (accepted && phase === "named") {
      console.log("[BubbleForm] Transitioning to phase: formed");
      setPhase("formed");
    }
  }, [accepted, phase]);

  useEffect(() => {
    console.log(`[BubbleForm] Phase changed: ${phase}`);
    if (phase === "formed") {
      setShowPoppableMent(false);
      if (poppableTimeout) clearTimeout(poppableTimeout);
      const timeout = setTimeout(() => {
        setShowPoppableMent(true);
        console.log("[BubbleForm] Transitioning to phase: poppable");
        setPhase("poppable");
      }, 2000);
      setPoppableTimeout(timeout);
      return () => clearTimeout(timeout);
    }
    return () => {
      if (poppableTimeout) clearTimeout(poppableTimeout);
    };
  }, [phase]);

  const handleScreenPress = () => {
    if (phase === "poppable") {
      console.log("[BubbleForm] Routing to ./match from poppable phase");
      router.push("./match");
    } else {
      console.log(
        `[BubbleForm] handleScreenPress called, but phase is ${phase}`
      );
    }
  };

  const handleNext = () => {
    if (phase === "naming" && bubbleName.trim()) {
      console.log("[BubbleForm] Transitioning to phase: named");
      setPhase("named");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* View를 KeyboardAwareScrollView로 교체 */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "android" ? -100 : 0}
        {...(phase === "poppable" ? { onTouchEnd: handleScreenPress } : {})}
      >
        {/* Top Section: Title and Ment */}
        {phase === "naming" && (
          <View style={styles.topSection}>
            <Text style={styles.boldTitle}>Name your Bubble!</Text>
          </View>
        )}
        {phase === "named" && (
          <View style={styles.topSection}>
            <Text style={styles.boldTitle}>Name your Bubble!</Text>
          </View>
        )}
        {phase === "formed" && (
          <View style={styles.topSection}>
            <Text style={styles.ment}>Your bubble is formed!</Text>
            <Text style={styles.formedBubbleName}>{bubbleName}</Text>
          </View>
        )}
        {phase === "poppable" && (
          <View style={styles.topSection}>
            <Text style={styles.ment}>You can always pop your bubble.</Text>
            <Text style={styles.formedBubbleName}>{bubbleName}</Text>
          </View>
        )}

        {/* Bubble Row */}
        <View
          style={{
            width: totalBubblesWidth,
            height: bubbleSize * 1.2,
            alignSelf: "center",
            marginBottom: 40,
            position: "relative",
          }}
        >
          {/* Left bubble (host) */}
          <View
            style={[
              styles.bubbleContainer,
              {
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 2,
                alignItems: "center",
              },
            ]}
          >
            <Image
              source={
                mockProfileData.images[0] || {
                  uri: "https://picsum.photos/seed/noah_kim/200/200",
                }
              }
              style={[
                styles.bubbleImage,
                {
                  width: bubbleSize,
                  height: bubbleSize,
                  borderRadius: bubbleSize / 2,
                  marginBottom: 0,
                },
              ]}
            />
            <Text style={[styles.nameText, { marginTop: 12 }]}>John Kim</Text>
          </View>
          {/* Right bubble (invitee) */}
          <View
            style={[
              styles.bubbleContainer,
              {
                position: "absolute",
                left: bubbleSize - overlapOffset,
                top: 0,
                zIndex: 1,
                alignItems: "center",
              },
            ]}
          >
            {accepted ? (
              <>
                <Image
                  source={invitedUser.image}
                  style={[
                    styles.bubbleImage,
                    {
                      width: bubbleSize,
                      height: bubbleSize,
                      borderRadius: bubbleSize / 2,
                      marginBottom: 0,
                    },
                  ]}
                />
                <Text style={[styles.nameText, { marginTop: 12 }]}>
                  Jaden Oak
                </Text>
              </>
            ) : (
              <View
                style={[
                  styles.emptyBubble,
                  {
                    width: bubbleSize,
                    height: bubbleSize,
                    borderRadius: bubbleSize / 2,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={styles.questionMark}>?</Text>
              </View>
            )}
          </View>
        </View>

        {/* Name input or display */}
        {(phase === "naming" || phase === "named") && (
          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Write your bubble name!"
              value={bubbleName}
              onChangeText={setBubbleName}
              editable={phase === "naming"}
              onSubmitEditing={handleNext}
              returnKeyType="done"
            />
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Buttons */}
      {((phase === "naming" && bubbleName.trim()) ||
        (phase === "named" && accepted)) && (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Feather name="chevron-right" size={36} color="#fff" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>✕</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // ScrollView의 내부 컨텐츠를 위한 스타일
  contentContainer: {
    flexGrow: 1, // flex: 1 대신 flexGrow: 1 사용
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  // 이하 기존 스타일은 동일
  waitingText: {
    fontSize: 22,
    color: "#222",
    marginBottom: 32,
    marginTop: 40,
    textAlign: "center",
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  bubbleContainer: {
    alignItems: "center",
  },
  bubbleImage: {
    borderWidth: 2,
    borderColor: "#eee",
  },
  nameText: {
    fontSize: 20,
    color: "#222",
    marginTop: 4,
  },
  emptyBubble: {
    backgroundColor: "#f7f7f7",
    borderWidth: 2,
    borderColor: "#eee",
  },
  questionMark: {
    fontSize: 48,
    color: "#bbb",
  },
  cancelButton: {
    position: "absolute",
    left: 32,
    bottom: 48,
    backgroundColor: "#8ec3ff",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    lineHeight: 40,
  },
  nextButton: {
    position: "absolute",
    right: 32,
    bottom: 48,
    backgroundColor: "#8ec3ff",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topSection: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 12,
  },
  boldTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  ment: {
    fontSize: 18,
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  formedBubbleName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  inputSection: {
    width: "90%",
    alignSelf: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  input: {
    fontSize: 18,
    paddingVertical: 8,
    color: "#222",
    fontWeight: "400",
    textAlign: "left",
  },
});
