import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InvitationBubble {
  id: string;
  name: string;
  status: string;
  members: any[];
  user_status: string;
  invited_at: string;
  group_size?: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface InvitationItemProps {
  bubble: InvitationBubble;
  onAccept: (bubbleId: string) => void;
  onDecline: (bubbleId: string) => void;
}

export const InvitationItem: React.FC<InvitationItemProps> = ({
  bubble,
  onAccept,
  onDecline,
}) => {
  const [creatorImageUrl, setCreatorImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Use avatar URL directly as it's already a public URL
  const createSignedUrlForCreator = useCallback(async () => {
    if (!bubble.creator?.avatar_url) return;

    try {
      // Use the avatar URL directly as it's already a permanent public URL
      setCreatorImageUrl(bubble.creator.avatar_url);
    } catch (error) {
      // Silently fail
    }
  }, [bubble.creator?.avatar_url]);

  useEffect(() => {
    createSignedUrlForCreator();
  }, [createSignedUrlForCreator]);

  const creatorName = bubble.creator
    ? `${bubble.creator.first_name}_${bubble.creator.last_name}`
    : "Someone";
  const groupSize = bubble.group_size || "2:2";

  return (
    <View style={styles.invitationCard}>
      {/* Creator Avatar */}
      <View style={styles.avatarContainer}>
        {!imageError && creatorImageUrl ? (
          <Image
            source={{ uri: creatorImageUrl }}
            style={styles.creatorAvatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.creatorAvatar, styles.placeholderAvatar]}>
            <Ionicons name="person" size={30} color="#999" />
          </View>
        )}
        <Text style={styles.creatorName}>{creatorName}</Text>
      </View>

      {/* Invitation Text and Buttons */}
      <View style={styles.invitationContent}>
        <View style={styles.invitationTextContainer}>
          <Text style={styles.invitationText}>
            <Text style={styles.normalText}> wants to form a </Text>
            <Text style={styles.bubbleSizeText}>{groupSize}</Text>
            <Text style={styles.normalText}> bubble</Text>
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => onDecline(bubble.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(bubble.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  invitationCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  placeholderAvatar: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  creatorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303030",
    fontFamily: "Quicksand-SemiBold",
  },
  invitationContent: {
    alignItems: "center",
  },
  invitationTextContainer: {
    marginBottom: 16,
  },
  invitationText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  normalText: {
    color: "#666",
    fontFamily: "Quicksand-Regular",
  },
  bubbleSizeText: {
    fontWeight: "700",
    color: "#80B7FF",
    fontFamily: "Quicksand-Bold",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  declineButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100,
  },
  declineButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: "Quicksand-SemiBold",
  },
  acceptButton: {
    backgroundColor: "#80B7FF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100,
  },
  acceptButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: "Quicksand-SemiBold",
  },
});
