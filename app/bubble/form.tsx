import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
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

export default function BubbleFormScreen() {
  const router = useRouter();
  const [bubbleName, setBubbleName] = useState("");
  const screenWidth = Dimensions.get("window").width;
  const totalBubblesWidth = screenWidth * 0.9;
  const overlapRatio = 0.18;
  const bubbleSize = totalBubblesWidth / (2 - overlapRatio);
  const overlapOffset = bubbleSize * overlapRatio;

  const handleInviteFriend = () => {
    console.log("Invite friend button pressed");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "android" ? -100 : 0}
      >
        <View style={styles.topSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="Name your bubble"
            value={bubbleName}
            onChangeText={setBubbleName}
            placeholderTextColor="#999"
            autoFocus={true}
          />
        </View>

        <View
          style={{
            width: totalBubblesWidth,
            height: bubbleSize * 1.2,
            alignSelf: "center",
            marginBottom: 40,
            position: "relative",
          }}
        >
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

          {/* Right bubble (invitee) - Gray and blank */}
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
              <Feather name="plus" size={32} color="#999" />
            </View>
            <Text style={[styles.nameText, { marginTop: 12, color: "#999" }]}>
              Invite Friend
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.inviteButton}
          onPress={handleInviteFriend}
          activeOpacity={0.7}
        >
          <Text style={styles.inviteButtonText}>Invite Friend</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  topSection: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32,
    width: "90%",
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#5A99E5",
    paddingVertical: 8,
    width: "100%",
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
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  inviteButton: {
    backgroundColor: "#5A99E5",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
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
});
