import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Platform,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ProfileFormData, ProfileImage } from "@/types/profile";
import { Bubble, BubblePost } from "@/types/bubble";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useRouter } from "expo-router";

interface BubbleComponentProps {
  bubble: Bubble;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface HorizontalFeedItem {
  id: string;
  type: "profile" | "post";
  sourceUri: string | number;
  profileData?: ProfileFormData;
  postData?: BubblePost;
}

const BubbleComponent: React.FC<BubbleComponentProps> = ({ bubble }) => {
  const { colors } = useAppTheme();
  const router = useRouter();

  const horizontalFeedItems = useMemo((): HorizontalFeedItem[] => {
    const items: HorizontalFeedItem[] = [];
    bubble.members.forEach((member) => {
      if (member.images && member.images[0]?.uri) {
        items.push({
          id: `profile-${member.userId}`,
          type: "profile",
          sourceUri: member.images[0].uri,
          profileData: member,
        });
      }
    });
    bubble.posts.forEach((post) => {
      const uploaderProfile = bubble.members.find(
        (m) => m.userId === post.uploaderUserId
      );
      if (uploaderProfile && post.uri) {
        items.push({
          id: `post-${post.id}`,
          type: "post",
          sourceUri: post.uri,
          profileData: uploaderProfile,
          postData: post,
        });
      }
    });
    return items.filter(
      (item) => item.sourceUri !== null && item.sourceUri !== undefined
    );
  }, [bubble]);

  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ item: HorizontalFeedItem; index: number | null }>;
    }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  if (horizontalFeedItems.length === 0) {
    return (
      <View
        style={[
          styles.fullScreenContainer,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.surfaceVariant,
          },
        ]}
      >
        <Text style={{ color: colors.onSurfaceVariant }}>
          No content in this bubble yet.
        </Text>
      </View>
    );
  }

  const currentItem = horizontalFeedItems[activeIndex];
  if (!currentItem) {
    return (
      <View
        style={[
          styles.fullScreenContainer,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.surfaceVariant,
          },
        ]}
      >
        <Text style={{ color: colors.onSurfaceVariant }}>
          Loading content...
        </Text>
      </View>
    );
  }

  const displayProfile = currentItem.profileData;
  const displayPost =
    currentItem.type === "post" ? currentItem.postData : undefined;

  const nameMbtiLine = displayProfile
    ? `${displayProfile.firstName}${
        displayProfile.mbti ? ` · ${displayProfile.mbti}` : ""
      }`
    : bubble.name;

  let ageHeightGenderLine = "";
  if (displayProfile) {
    if (displayProfile.age !== null)
      ageHeightGenderLine += `${displayProfile.age}세`;
    if (displayProfile.height !== null)
      ageHeightGenderLine += `${ageHeightGenderLine ? " · " : ""}${
        displayProfile.height
      }cm`;
    if (displayProfile.gender && displayProfile.genderVisibleOnProfile)
      ageHeightGenderLine += `${ageHeightGenderLine ? " · " : ""}${
        displayProfile.gender
      }`;
  }

  const handleLearnMorePress = () => {
    if (displayProfile) {
      console.log("Learn More for:", displayProfile.firstName);
    } else {
      console.log("Learn More for bubble:", bubble.name);
    }
  };

  const renderHorizontalItem = ({ item }: { item: HorizontalFeedItem }) => {
    return (
      <ImageBackground
        source={
          typeof item.sourceUri === "string"
            ? { uri: item.sourceUri }
            : item.sourceUri
        }
        resizeMode="contain"
        style={styles.horizontalItemImage}
      />
    );
  };

  return (
    <View style={styles.fullScreenContainer}>
      <FlatList
        data={horizontalFeedItems}
        renderItem={renderHorizontalItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.horizontalFlatList}
      />

      <LinearGradient
        colors={[
          "transparent",
          "rgba(0,0,0,0.1)",
          "rgba(0,0,0,0.7)",
          "rgba(0,0,0,0.9)",
        ]}
        locations={[0, 0.5, 0.75, 1]}
        style={styles.gradientOverlay}
      />

      <View style={styles.textInfoOuterContainer}>
        <View style={styles.textInfoInnerContainer}>
          <Text
            style={[styles.nameMbtiText, { color: colors.inverseOnSurface }]}
          >
            {nameMbtiLine}
          </Text>

          {displayPost?.caption ? (
            <Text
              style={[styles.captionText, { color: colors.inverseOnSurface }]}
              numberOfLines={2}
            >
              {displayPost.caption}
            </Text>
          ) : ageHeightGenderLine.length > 0 ? (
            <Text
              style={[
                styles.ageHeightGenderText,
                { color: colors.inverseOnSurface },
              ]}
            >
              {ageHeightGenderLine}
            </Text>
          ) : null}

          {currentItem.type === "profile" && displayProfile?.aboutMe && (
            <Text
              style={[styles.aboutMeText, { color: colors.inverseOnSurface }]}
              numberOfLines={3}
            >
              {displayProfile.aboutMe}
            </Text>
          )}

          {displayProfile && (
            <TouchableOpacity
              style={[
                styles.learnMoreButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={handleLearnMorePress}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.learnMoreButtonText, { color: colors.primary }]}
              >
                Learn More
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  horizontalFlatList: {
    flex: 1,
  },
  horizontalItemImage: {
    width: screenWidth,
    height: screenHeight,
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight * 0.55,
    zIndex: 1,
  },
  textInfoOuterContainer: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    paddingBottom: Platform.OS === "ios" ? 80 : 70,
    zIndex: 2,
  },
  textInfoInnerContainer: {
    paddingHorizontal: 20,
  },
  nameMbtiText: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ageHeightGenderText: {
    fontSize: 16,
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captionText: {
    fontSize: 16,
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  aboutMeText: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  learnMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  learnMoreButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BubbleComponent;
