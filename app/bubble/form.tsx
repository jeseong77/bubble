import React, { useState, useEffect } from "react"; // useEffect added
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton } from "@/components/feedback/SkeletonLoader";
import { useBubbleData } from "@/hooks/useBubbleData";
import { useBubbleActions } from "@/hooks/useBubbleActions";
import { BubbleMemberLayout } from "@/components/bubble/BubbleMemberLayout";
import { BubbleMemberSlot } from "@/components/bubble/BubbleMemberSlot";

// Member type definition (simple version)
interface BubbleMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status?: "invited" | "joined" | "declined";
}

export default function BubbleFormScreen() {
  const router = useRouter();
  const { session } = useAuth(); // Needed for bubble actions

  // Get parameters passed from previous screen
  const {
    groupId, // Receive groupId
    isExistingBubble, // Whether it's an existing bubble
  } = useLocalSearchParams<{
    groupId: string;
    isExistingBubble?: string;
  }>();

  // Use bubble data hook for all bubble-related data fetching and state
  const {
    bubbleName,
    setBubbleName,
    creatorSignedUrl,
    bubbleMembers,
    memberSignedUrls,
    bubbleInfo,
    isLoading,
    isMembersLoading,
    bubbleMemberCount,
  } = useBubbleData({ groupId });

  // Use bubble actions hook for popping bubble
  const { handleLeaveGroup } = useBubbleActions({
    session,
    onLeaveSuccess: () => {
      // Navigate back to profile after successful bubble pop
      router.replace("/(tabs)/profile");
    },
  });

  // Check if this is a new bubble to show simplified interface
  const isNewBubble = isExistingBubble === "false";

  console.log("isNewBubble:", isNewBubble);

  // Member info for existing bubbles already passed as parameters, no need for separate RPC call

  // ... (existing bubbleSize calculation logic)
  const screenWidth = Dimensions.get("window").width;
  const totalBubblesWidth = screenWidth * 0.9;
  const overlapRatio = 0.18;
  const bubbleSize =
    totalBubblesWidth /
    (bubbleMemberCount - (bubbleMemberCount - 1) * overlapRatio);
  const overlapOffset = bubbleSize * (1 - overlapRatio);

  const handleCancel = () => {
    router.back();
  };
  
  if (isNewBubble) {
    // Show simplified interface for new bubbles matching target design
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.newBubbleContainer}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={24} color="#000" />
          </TouchableOpacity>
          
          {/* Bubble name as title */}
          <Text style={styles.newBubbleTitle}>
            {bubbleName || "My Bubble"}
          </Text>
          
          {/* Member circles - dynamic layout based on bubble size */}
          <BubbleMemberLayout
            bubbleMemberCount={bubbleMemberCount}
            bubbleMembers={bubbleMembers}
            creatorSignedUrl={creatorSignedUrl}
            memberSignedUrls={memberSignedUrls}
            groupId={groupId!}
          />
          
          {/* Waiting text */}
          <Text style={styles.waitingText}>waiting for invitation ...</Text>
          
          {/* Bottom button - only right side */}
          <TouchableOpacity
            style={styles.bottomRightButton}
            onPress={() => handleLeaveGroup(groupId!)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Original complex interface for existing bubbles
  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.contentContainer, { flex: 1 }]}>
          <View style={styles.topSection}>
            {isLoading ? (
              <Skeleton.Box width={200} height={40} style={styles.titleInput} />
            ) : (
              <Text style={styles.titleInput}>
                {bubbleName || "My Bubble"}
              </Text>
            )}
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
            {/* Display all bubble slots side by side */}
            {Array.from({ length: bubbleMemberCount }).map((_, index) => {
              const isExisting = isExistingBubble === "true";
              const member = isExisting ? bubbleMembers[index] : null;
              const isCreator = !isExisting && index === 0;

              return (
                <BubbleMemberSlot
                  key={index}
                  index={index}
                  bubbleMemberCount={bubbleMemberCount}
                  isExisting={isExisting}
                  member={member}
                  isCreator={isCreator}
                  bubbleMembers={bubbleMembers}
                  creatorSignedUrl={creatorSignedUrl}
                  memberSignedUrls={memberSignedUrls}
                  bubbleSize={bubbleSize}
                  overlapOffset={overlapOffset}
                  groupId={groupId!}
                  isLoading={isLoading}
                  isMembersLoading={isMembersLoading}
                />
              );
            })}
          </View>


          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chevronButton}
              onPress={() => {
                // Go back and then replace to clear the stack
                router.back();
                router.replace("/(tabs)");
              }}
            >
              <Feather name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
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
    fontFamily: "Quicksand-Bold",
    color: "#222",
    textAlign: "center",
    paddingVertical: 8,
    width: "100%",
  },
  bubbleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleImage: {
    borderWidth: 2,
    borderColor: "#eee",
  },
  nameText: {
    fontSize: 20,
    fontFamily: "Quicksand-Bold",
    color: "#222",
    marginTop: 4,
    fontWeight: "600",
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
    fontFamily: "Quicksand-SemiBold",
    fontWeight: "600",
    textAlign: "center",
  },
  bottomButtonContainer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelButton: {
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
  chevronButton: {
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
  popButton: {
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
    fontFamily: "Quicksand-Bold",
    fontWeight: "bold",
    lineHeight: 40,
  },
  // New styles for simplified bubble interface
  newBubbleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
  newBubbleTitle: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "Quicksand-Bold",
    color: "#000",
    marginTop: 100,
    marginBottom: 80,
    textAlign: "center",
  },
  waitingText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 60,
  },
  bottomRightButton: {
    position: "absolute",
    bottom: 40,
    right: 20,
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
  bottomButtons: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
