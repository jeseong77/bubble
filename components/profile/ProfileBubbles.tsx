import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";
import BubbleTabItem from "@/components/bubble/BubbleTabItem";
import CreateBubbleModal from "@/components/ui/CreateBubbleModal";
import { Skeleton } from "@/components/feedback/SkeletonLoader";

interface Bubble {
  id: string;
  name: string;
  status: string;
  max_size: number;
  creator_id: string;
}

interface ProfileBubblesProps {
  bubbles: Bubble[];
  isLoading: boolean;
  activeBubbleId: string | null;
  onSetActiveBubble: (bubbleId: string) => void;
  onLeaveGroup: (bubbleId: string) => void;
  onRefresh: () => void;
}

// Skeleton Bubble Item Component
const SkeletonBubbleItem = () => {
  return (
    <View style={styles.skeletonBubbleItem}>
      <View style={styles.skeletonBubbleContent}>
        <View style={styles.skeletonBubbleAvatars}>
          <Skeleton.Circle size={40} />
          <Skeleton.Circle size={40} style={{ marginLeft: -15 }} />
        </View>
        <View style={styles.skeletonBubbleText}>
          <Skeleton.Box width={100} height={16} style={{ marginBottom: 4 }} />
          <Skeleton.Box width={60} height={12} />
        </View>
      </View>
      <Skeleton.Box width={24} height={24} />
    </View>
  );
};

export const ProfileBubbles: React.FC<ProfileBubblesProps> = ({
  bubbles,
  isLoading,
  activeBubbleId,
  onSetActiveBubble,
  onLeaveGroup,
  onRefresh,
}) => {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [showCreateBubbleModal, setShowCreateBubbleModal] = useState(false);

  return (
    <View style={styles.myBubbleContainer}>
      {/* Show skeleton UI while loading bubbles */}
      {isLoading ? (
        <>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBubbleItem key={index} />
          ))}
        </>
      ) : (
        <>
          {/* When there are bubbles in the list */}
          {bubbles.length > 0 ? (
            bubbles.map((bubble) => (
              <BubbleTabItem
                key={bubble.id}
                bubble={bubble}
                isActive={activeBubbleId === bubble.id}
                onPress={() => {
                  // Navigate to different interfaces based on bubble status
                  router.push({
                    pathname: "/bubble/form",
                    params: {
                      groupId: bubble.id,
                      isExistingBubble: bubble.status === "full" ? "true" : "false",
                    },
                  });
                }}
                onSetActive={() => onSetActiveBubble(bubble.id)}
                onLeaveGroup={() => onLeaveGroup(bubble.id)}
              />
            ))
          ) : (
            // When there are no bubbles - Show "Make new bubble" UI
            <View style={styles.makeNewBubbleContainer}>
              <Text style={[styles.makeNewBubbleText, { color: colors.black }]}>
                Make a new bubble !
              </Text>
              <TouchableOpacity
                style={[styles.makeNewBubbleButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateBubbleModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={40} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <CreateBubbleModal
        visible={showCreateBubbleModal}
        onClose={() => setShowCreateBubbleModal(false)}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  myBubbleContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skeletonBubbleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonBubbleContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  skeletonBubbleAvatars: {
    flexDirection: "row",
    marginRight: 16,
  },
  skeletonBubbleText: {
    flex: 1,
  },
  makeNewBubbleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  makeNewBubbleText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
  },
  makeNewBubbleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
