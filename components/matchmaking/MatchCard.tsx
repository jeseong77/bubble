import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { MatchingGroup, GroupMember } from "@/hooks/useMatchmaking";

interface MatchCardProps {
  group: MatchingGroup;
  onUserPress: (user: GroupMember) => void;
  style?: any;
}

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export const MatchCard: React.FC<MatchCardProps> = ({
  group,
  onUserPress,
  style,
}) => {
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Reset to first member when group changes
  useEffect(() => {
    setCurrentMemberIndex(0);
    setImageError(false);
  }, [group?.group_id]);

  if (!group || !group.members || group.members.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholderContainer}>
          <Feather name="users" size={80} color="#999" />
          <Text style={styles.placeholderText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const currentMember = group.members[currentMemberIndex];

  const handleImageTap = () => {
    // Cycle to next member
    const nextIndex = (currentMemberIndex + 1) % group.members.length;
    setCurrentMemberIndex(nextIndex);
    setImageError(false);
    console.log(`[MatchCard] Cycling to member ${nextIndex + 1}/${group.members.length}`);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Top progress bar */}
      <View style={styles.topBarContainer}>
        {group.members.map((_, index) => (
          <View
            key={index}
            style={[
              styles.topBarSegment,
              index === currentMemberIndex && styles.topBarSegmentActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleImageTap}
        style={styles.imageWrapper}
      >
        {currentMember.avatar_url && !imageError ? (
          <Image
            key={`${group.group_id}-${currentMemberIndex}`}
            source={{ uri: currentMember.avatar_url }}
            style={styles.fullScreenImage}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Feather name="user" size={120} color="#999" />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Member info overlay */}
      <View style={styles.memberInfoOverlay}>
        <Text style={styles.memberName}>
          {currentMember.first_name}
          {currentMember.age ? `, ${currentMember.age}` : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  topBarContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    zIndex: 10,
  },
  topBarSegment: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2.5,
  },
  topBarSegmentActive: {
    backgroundColor: '#FFFFFF',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 18,
    color: "#999",
    marginTop: 16,
    fontWeight: "500",
  },
  memberInfoOverlay: {
    position: "absolute",
    bottom: 115,
    left: 40,
    alignItems: "flex-start",
  },
  memberName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "left",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
