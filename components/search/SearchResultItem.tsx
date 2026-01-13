import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  mbti: string;
  gender: string;
  displayName: string;
  invitationStatus: "invited" | "joined" | "declined" | null;
}

interface SearchResultItemProps {
  user: SearchUser;
  sendInvitation: (userId: string, userName: string, userGender: string) => Promise<void>;
  getSafeImageUrl: (userId: string, avatarUrl: string | null) => string;
  colors: {
    black: string;
    darkGray: string;
    primary: string;
    error: string;
  };
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  user,
  sendInvitation,
  getSafeImageUrl,
  colors,
}) => {
  const isInvited = user.invitationStatus === "invited";
  const isJoined = user.invitationStatus === "joined";
  const isDeclined = user.invitationStatus === "declined";
  const canInvite = !user.invitationStatus; // Can only invite when there's no invitation status

  return (
    <View style={styles.userRow}>
      <Image
        source={{ uri: getSafeImageUrl(user.id, user.avatar_url) }}
        style={styles.userAvatar}
        defaultSource={{ uri: "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User" }}
        onError={(error) => {
          console.error(
            `User ${user.id} image load failed:`,
            error.nativeEvent,
            `Used URL: ${getSafeImageUrl(user.id, user.avatar_url)}`
          );
          // Image load failed, but fallback will be handled automatically
        }}
      />
      <View style={styles.userInfo}>
        <Text
          style={[
            styles.userName,
            {
              color: colors.black,
            },
          ]}
        >
          {user.displayName}
        </Text>
        <Text
          style={[
            styles.userMbti,
            {
              color: colors.darkGray,
            },
          ]}
        >
          {user.mbti}
        </Text>
      </View>

      {/* Invite button or status display */}
      {canInvite ? (
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => sendInvitation(user.id, user.displayName, user.gender)}
        >
          <Ionicons
            name="add"
            size={24}
            color={colors.darkGray}
          />
        </TouchableOpacity>
      ) : isInvited ? (
        <View style={styles.inviteButton}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={colors.primary}
          />
        </View>
      ) : isJoined ? (
        <View style={styles.inviteButton}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={colors.primary}
          />
        </View>
      ) : isDeclined ? (
        <View style={styles.inviteButton}>
          <Ionicons name="close-circle" size={24} color={colors.error} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: "Quicksand-Bold",
    marginBottom: 4,
  },
  userMbti: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
  },
  inviteButton: {
    padding: 8,
  },
});
