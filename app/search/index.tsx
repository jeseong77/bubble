import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import CustomAppBar from "@/components/CustomAppBar";
import CustomView from "@/components/CustomView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAvatarUrl } from "@/utils/avatarUtils";
import InviteModal from "@/components/InviteModal";
import { useUserSearch } from "@/hooks/useUserSearch";
import { useInvitationActions } from "@/hooks/useInvitationActions";

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

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const insets = useSafeAreaInsets();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Use search hook for all search-related logic
  const {
    searchResults,
    setSearchResults,
    isSearching,
    searchTerm,
    setSearchTerm,
    currentUserGender,
    checkGenderCompatibility,
  } = useUserSearch({
    userId: session?.user?.id,
    groupId,
  });

  // Use invitation actions hook
  const { sendInvitation, cancelInvitation } = useInvitationActions({
    userId: session?.user?.id,
    groupId,
    checkGenderCompatibility,
    setSearchResults,
  });

  // URL validity check function
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };

  // Get safe image URL - simplified to use public URLs directly
  const getSafeImageUrl = (userId: string, avatarUrl: string | null): string => {
    const fallbackUrl = "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User";

    // Use avatar URL directly if available and valid, otherwise fallback
    if (avatarUrl && isValidUrl(avatarUrl)) {
      return avatarUrl;
    }

    return fallbackUrl;
  };

  const renderUserRow = ({ item }: { item: SearchUser }) => {
    const isInvited = item.invitationStatus === "invited";
    const isJoined = item.invitationStatus === "joined";
    const isDeclined = item.invitationStatus === "declined";
    const canInvite = !item.invitationStatus; // Can only invite when there's no invitation status

    return (
      <View
        style={[
          styles.userRow,
        ]}
      >
        <Image
          source={{ uri: getSafeImageUrl(item.id, item.avatar_url) }}
          style={[
            styles.userAvatar,
          ]}
          defaultSource={{ uri: "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User" }}
          onError={(error) => {
            console.error(
              `User ${item.id} image load failed:`,
              error.nativeEvent,
              `Used URL: ${getSafeImageUrl(item.id, item.avatar_url)}`
            );
            // Image load failed, but fallback will be handled automatically
          }}
          onLoad={() => {
              `User ${item.id} image load successful:`,
              getSafeImageUrl(item.id, item.avatar_url)
            );
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
            {item.displayName}
          </Text>
          <Text
            style={[
              styles.userMbti,
              {
                color: colors.darkGray,
              },
            ]}
          >
            {item.mbti}
          </Text>
        </View>

        {/* Invite button or status display */}
        {canInvite ? (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => sendInvitation(item.id, item.displayName, item.gender)}
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {isSearching ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : searchTerm.length > 0 ? (
        <Text style={[styles.emptyText, { color: colors.darkGray }]}>
          No users found
        </Text>
      ) : (
        <Text style={[styles.emptyText, { color: colors.darkGray }]}>
          Invite your friends{'\n'}to form your Bubble
        </Text>
      )}
    </View>
  );

  return (
    <CustomView style={styles.container}>
      <CustomAppBar
        leftComponent={
          <TouchableOpacity 
            style={styles.profileIconContainer}
            onPress={() => setInviteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={24} color={colors.black} />
          </TouchableOpacity>
        }
        centerComponent={
          <Text style={[styles.title, { color: colors.black }]}>
            Search ID
          </Text>
        }
        rightComponent={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.black} />
          </TouchableOpacity>
        }
        background={false}
        extendStatusBar
      />

      <View style={styles.content}>
        {/* Search input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.darkGray} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
            placeholder="Search your friend's UserID"
            placeholderTextColor={colors.darkGray}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={20} color={colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results */}
        <FlatList
          data={searchResults}
          renderItem={renderUserRow}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={searchResults.length === 0 ? styles.listContainerEmpty : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Invite Modal */}
      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        groupId={groupId || ""}
        groupName="My Bubble"
        bubbleSize="2:2"
      />
    </CustomView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F0FF",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  listContainerEmpty: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: -50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
    textAlign: "center",
  },
  closeButton: {
    padding: 8,
  },
  profileIconContainer: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
