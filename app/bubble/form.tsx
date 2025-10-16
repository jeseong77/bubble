import React, { useState, useEffect } from "react"; // useEffect added
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase"; // supabase client added
import { useAuth } from "@/providers/AuthProvider";

// Skeleton components
const SkeletonView = ({
  width,
  height,
  style,
}: {
  width: number;
  height: number;
  style?: any;
}) => (
  <View
    style={[
      {
        width,
        height,
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
      },
      style,
    ]}
  />
);

const SkeletonCircle = ({ size, style }: { size: number; style?: any }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#f0f0f0",
      },
      style,
    ]}
  />
);

const SkeletonText = ({
  width,
  height,
  style,
}: {
  width: number;
  height: number;
  style?: any;
}) => (
  <View
    style={[
      {
        width,
        height,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
      },
      style,
    ]}
  />
);

// Member type definition (simple version)
interface BubbleMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function BubbleFormScreen() {
  const router = useRouter();
  const { session } = useAuth(); // Needed for handlePopBubble

  // Get parameters passed from previous screen
  const {
    groupId, // Receive groupId
    isExistingBubble, // Whether it's an existing bubble
  } = useLocalSearchParams<{
    groupId: string;
    isExistingBubble?: string;
  }>();

  // Bubble name is managed in this screen
  const [bubbleName, setBubbleName] = useState("");
  const [creatorSignedUrl, setCreatorSignedUrl] = useState<string | null>(null); // Image URL state added
  const [bubbleMembers, setBubbleMembers] = useState<BubbleMember[]>([]); // Bubble member info
  const [memberSignedUrls, setMemberSignedUrls] = useState<{
    [key: string]: string;
  }>({}); // Signed URL per member
  const [bubbleInfo, setBubbleInfo] = useState<any>(null); // Complete bubble info
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [isMembersLoading, setIsMembersLoading] = useState(false); // Members loading state

  // Fetch bubble info using get_bubble RPC
  useEffect(() => {
    const fetchBubbleInfo = async () => {
      if (groupId) { // Fetch for both new and existing bubbles
        setIsLoading(true);
        try {
          console.log("=== 🔍 FORM.TSX DEBUG ===");
          console.log("groupId:", groupId);
          console.log("isExistingBubble:", isExistingBubble);
          
          const { data, error } = await supabase.rpc("get_bubble", {
            p_group_id: groupId,
          });

          console.log("=== 📡 GET_BUBBLE RPC RESULT ===");
          console.log("Data:", data);
          console.log("Error:", error);
          console.log("Data type:", typeof data);
          console.log("Data length:", data?.length || 0);

          if (error) {
            console.error("Error fetching bubble info:", error);
            console.error("Error details:", {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
          } else if (data && data.length > 0) {
            const bubbleInfo = data[0];
            console.log("=== ✅ BUBBLE INFO ===");
            console.log("Bubble Info:", bubbleInfo);
            console.log("Bubble ID:", bubbleInfo.id);
            console.log("Bubble Name:", bubbleInfo.name);
            console.log("Bubble Max Size:", bubbleInfo.max_size);
            console.log("Members field:", bubbleInfo.members);
            console.log("Members field type:", typeof bubbleInfo.members);

            // Set bubble name
            setBubbleName(bubbleInfo.name || "");

            // Store complete bubble info
            setBubbleInfo(bubbleInfo);

            // Set member info (JSON parsing)
            if (bubbleInfo.members) {
              try {
                const members = Array.isArray(bubbleInfo.members)
                  ? bubbleInfo.members
                  : JSON.parse(bubbleInfo.members);
                setBubbleMembers(members || []);
                console.log("=== ✅ PARSED MEMBERS ===");
                console.log("Parsed members:", members);
                console.log("Members count:", members.length);
              } catch (parseError) {
                console.error("Failed to parse member info:", parseError);
                console.log("Raw members data:", bubbleInfo.members);
                setBubbleMembers([]);
              }
            } else {
              console.log("❌ No members field in bubble info");
              setBubbleMembers([]);
            }
          } else {
            console.log("❌ No bubble data or empty array");
          }
        } catch (error) {
          console.error("Error in fetchBubbleInfo:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchBubbleInfo();
  }, [isExistingBubble, groupId]);

  // Set member profile image URLs (according to new structure)
  useEffect(() => {
    if (bubbleMembers.length === 0) return;

    setIsMembersLoading(true);
    const urls: { [key: string]: string } = {};

    for (const member of bubbleMembers) {
      // Simple structure: use member.avatar_url directly
      if (member.avatar_url) {
        urls[member.id] = member.avatar_url;
      }
    }

    setMemberSignedUrls(urls);
    setIsMembersLoading(false);
  }, [bubbleMembers]);

  // Check if this is a new bubble to show simplified interface
  const isNewBubble = isExistingBubble === "false";
  
  // Calculate bubble size (use max_size for existing bubbles, default 2 for new bubbles)
  const bubbleMemberCount = bubbleInfo?.max_size || 2;
  
  console.log("=== 🎯 BUBBLE SIZE DEBUG ===");
  console.log("bubbleInfo:", bubbleInfo);
  console.log("bubbleInfo?.max_size:", bubbleInfo?.max_size);
  console.log("bubbleMemberCount:", bubbleMemberCount);
  console.log("isNewBubble:", isNewBubble);

  // Set creator image URL (according to simple structure)
  useEffect(() => {
    if (bubbleMembers.length > 0 && bubbleMembers[0]?.avatar_url) {
      // Set creator image URL
      setCreatorSignedUrl(bubbleMembers[0].avatar_url);
    }
  }, [bubbleMembers]);

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

  const handlePopBubble = () => {
    Alert.alert(
      "Do you want to pop this bubble?",
      "Popped bubbles can't be restored.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Pop",
          style: "destructive",
          onPress: async () => {
            try {
              // Use the leave_group RPC function to properly handle foreign key constraints
              const { data, error } = await supabase.rpc("leave_group", {
                p_user_id: session?.user?.id,
                p_group_id: groupId,
              });

              if (error) {
                console.error("Error popping bubble:", error);
                Alert.alert("Error", "Failed to pop bubble. Please try again.");
                return;
              }

              if (!data || !data.success) {
                console.error("Failed to pop bubble:", data?.message || "Unknown error");
                Alert.alert("Error", data?.message || "Failed to pop bubble. Please try again.");
                return;
              }

              // Log the bubble destruction details
              console.log(`[PopBubble] "${data.group_name}" was popped by ${data.popper_name}`);
              if (data.affected_users && data.affected_users.length > 0) {
                console.log(`[PopBubble] ${data.affected_users.length} other users were in the bubble`);
                // TODO: Send push notifications to affected users
                // Format: "{popper_name} popped the bubble"
              }

              // Show success message
              Alert.alert(
                "Bubble Popped! 💥", 
                `"${data.group_name}" has been destroyed.`,
                [{ text: "OK" }]
              );

              // Navigate back to profile and trigger refresh
              router.replace("/(tabs)/profile");
            } catch (error) {
              console.error("Error in handlePopBubble:", error);
              Alert.alert("Error", "Failed to pop bubble. Please try again.");
            }
          },
        },
      ]
    );
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
          {bubbleMemberCount === 2 ? (
            /* Size 2: Keep existing overlapping layout unchanged */
            <View style={styles.membersContainer}>
              {/* Current user full name - positioned above profile image */}
              <View style={styles.memberWithName}>
                <Text style={styles.creatorName}>
                  {bubbleMembers[0]?.first_name && bubbleMembers[0]?.last_name 
                    ? `${bubbleMembers[0].first_name} ${bubbleMembers[0].last_name}` 
                    : bubbleMembers[0]?.first_name || "Me"
                  }
                </Text>
                
                {/* Creator circle */}
                <View style={styles.memberCircle}>
                  {creatorSignedUrl ? (
                    <Image
                      source={{ uri: creatorSignedUrl }}
                      style={styles.memberImage}
                    />
                  ) : (
                    <View style={[styles.memberImage, styles.placeholderImage]}>
                      <Feather name="user" size={40} color="#999" />
                    </View>
                  )}
                </View>
              </View>
              
              {/* Add member circle - overlapping */}
              <TouchableOpacity
                style={[styles.addMemberCircle, styles.overlappingCircle]}
                onPress={() => {
                  router.push({
                    pathname: "/search",
                    params: { groupId },
                  });
                }}
              >
                <Feather name="plus" size={40} color="#5A99E5" />
              </TouchableOpacity>
            </View>
          ) : bubbleMemberCount === 3 ? (
            /* Size 3: Triangle layout - 1 on top, 2 on bottom */
            <View style={styles.triangleContainer}>
              {/* Top member (creator) */}
              <View style={styles.triangleTop}>
                <Text style={styles.creatorName}>
                  {bubbleMembers[0]?.first_name && bubbleMembers[0]?.last_name 
                    ? `${bubbleMembers[0].first_name} ${bubbleMembers[0].last_name}` 
                    : bubbleMembers[0]?.first_name || "Me"
                  }
                </Text>
                <View style={styles.memberCircle}>
                  {creatorSignedUrl ? (
                    <Image
                      source={{ uri: creatorSignedUrl }}
                      style={styles.triangleMemberImage}
                    />
                  ) : (
                    <View style={[styles.triangleMemberImage, styles.placeholderImage]}>
                      <Feather name="user" size={35} color="#999" />
                    </View>
                  )}
                </View>
              </View>
              
              {/* Bottom row - 2 members */}
              <View style={styles.triangleBottom}>
                {/* Second member slot */}
                {bubbleMembers[1] ? (
                  <View style={styles.triangleMemberSlot}>
                    <Text style={styles.triangleMemberName}>
                      {bubbleMembers[1].first_name || "Member"}
                    </Text>
                    <Image
                      source={{ uri: memberSignedUrls[bubbleMembers[1].id] || bubbleMembers[1].avatar_url }}
                      style={styles.triangleMemberImage}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.triangleMemberSlot}
                    onPress={() => {
                      router.push({
                        pathname: "/search",
                        params: { groupId },
                      });
                    }}
                  >
                    <View style={[styles.triangleMemberImage, { backgroundColor: "#D9D9D9" }]}>
                      <Feather name="plus" size={35} color="#5A99E5" />
                    </View>
                  </TouchableOpacity>
                )}
                
                {/* Third member slot */}
                {bubbleMembers[2] ? (
                  <View style={styles.triangleMemberSlot}>
                    <Text style={styles.triangleMemberName}>
                      {bubbleMembers[2].first_name || "Member"}
                    </Text>
                    <Image
                      source={{ uri: memberSignedUrls[bubbleMembers[2].id] || bubbleMembers[2].avatar_url }}
                      style={styles.triangleMemberImage}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.triangleMemberSlot}
                    onPress={() => {
                      router.push({
                        pathname: "/search",
                        params: { groupId },
                      });
                    }}
                  >
                    <View style={[styles.triangleMemberImage, { backgroundColor: "#D9D9D9" }]}>
                      <Feather name="plus" size={35} color="#5A99E5" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            /* Size 4: Diamond/Square layout - 2x2 arrangement */
            <View style={styles.diamondContainer}>
              {/* Top row */}
              <View style={styles.diamondRow}>
                {/* Creator (top-left) */}
                <View style={styles.diamondMemberSlot}>
                  <Text style={styles.diamondMemberName}>
                    {bubbleMembers[0]?.first_name && bubbleMembers[0]?.last_name 
                      ? `${bubbleMembers[0].first_name} ${bubbleMembers[0].last_name}` 
                      : bubbleMembers[0]?.first_name || "Me"
                    }
                  </Text>
                  <View style={styles.memberCircle}>
                    {creatorSignedUrl ? (
                      <Image
                        source={{ uri: creatorSignedUrl }}
                        style={styles.diamondMemberImage}
                      />
                    ) : (
                      <View style={[styles.diamondMemberImage, styles.placeholderImage]}>
                        <Feather name="user" size={30} color="#999" />
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Second member (top-right) */}
                {bubbleMembers[1] ? (
                  <View style={styles.diamondMemberSlot}>
                    <Text style={styles.diamondMemberName}>
                      {bubbleMembers[1].first_name || "Member"}
                    </Text>
                    <Image
                      source={{ uri: memberSignedUrls[bubbleMembers[1].id] || bubbleMembers[1].avatar_url }}
                      style={styles.diamondMemberImage}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.diamondMemberSlot}
                    onPress={() => {
                      router.push({
                        pathname: "/search",
                        params: { groupId },
                      });
                    }}
                  >
                    <View style={[styles.diamondMemberImage, { backgroundColor: "#D9D9D9" }]}>
                      <Feather name="plus" size={30} color="#5A99E5" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Bottom row */}
              <View style={styles.diamondRow}>
                {/* Third member (bottom-left) */}
                {bubbleMembers[2] ? (
                  <View style={styles.diamondMemberSlot}>
                    <Text style={styles.diamondMemberName}>
                      {bubbleMembers[2].first_name || "Member"}
                    </Text>
                    <Image
                      source={{ uri: memberSignedUrls[bubbleMembers[2].id] || bubbleMembers[2].avatar_url }}
                      style={styles.diamondMemberImage}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.diamondMemberSlot}
                    onPress={() => {
                      router.push({
                        pathname: "/search",
                        params: { groupId },
                      });
                    }}
                  >
                    <View style={[styles.diamondMemberImage, { backgroundColor: "#D9D9D9" }]}>
                      <Feather name="plus" size={30} color="#5A99E5" />
                    </View>
                  </TouchableOpacity>
                )}
                
                {/* Fourth member (bottom-right) */}
                {bubbleMembers[3] ? (
                  <View style={styles.diamondMemberSlot}>
                    <Text style={styles.diamondMemberName}>
                      {bubbleMembers[3].first_name || "Member"}
                    </Text>
                    <Image
                      source={{ uri: memberSignedUrls[bubbleMembers[3].id] || bubbleMembers[3].avatar_url }}
                      style={styles.diamondMemberImage}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.diamondMemberSlot}
                    onPress={() => {
                      router.push({
                        pathname: "/search",
                        params: { groupId },
                      });
                    }}
                  >
                    <View style={[styles.diamondMemberImage, { backgroundColor: "#D9D9D9" }]}>
                      <Feather name="plus" size={30} color="#5A99E5" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          {/* Waiting text */}
          <Text style={styles.waitingText}>waiting for invitation ...</Text>
          
          {/* Bottom button - only right side */}
          <TouchableOpacity
            style={styles.bottomRightButton}
            onPress={handlePopBubble}
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
              <SkeletonView width={200} height={40} style={styles.titleInput} />
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

              // For existing bubbles: find member at corresponding index in member array or empty slot
              // For new bubbles: first is creator, rest are invitation slots
              let member = null;
              let isCreator = false;

              if (isExisting) {
                // Existing bubble: all slots displayed side by side
                member = bubbleMembers[index];
              } else {
                // New bubble: first is creator
                if (index === 0) {
                  isCreator = true;
                }
              }

              return (
                <View
                  key={index}
                  style={[
                    styles.bubbleContainer,
                    {
                      position: "absolute",
                      left: index * overlapOffset,
                      top: 0,
                      zIndex: bubbleMemberCount - index, // Different zIndex to overlap
                      alignItems: "center",
                    },
                  ]}
                >
                  {isCreator ? (
                    // Display creator (first slot of new bubble)
                    <View style={styles.bubbleContent}>
                      {isLoading || isMembersLoading ? (
                        <>
                          <SkeletonText
                            width={60}
                            height={20}
                            style={{ marginBottom: 12 }}
                          />
                          <SkeletonCircle
                            size={bubbleSize}
                            style={styles.bubbleImage}
                          />
                        </>
                      ) : (
                        <>
                          <Text style={[styles.nameText, { marginBottom: 12 }]}>
                            {bubbleMembers[0]?.first_name || "Me"}
                          </Text>
                          {creatorSignedUrl ? (
                            <Image
                              source={{ uri: creatorSignedUrl }}
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
                          ) : (
                            <View
                              style={[
                                styles.bubbleImage,
                                {
                                  width: bubbleSize,
                                  height: bubbleSize,
                                  borderRadius: bubbleSize / 2,
                                  marginBottom: 0,
                                  backgroundColor: "#e0e0e0",
                                  justifyContent: "center",
                                  alignItems: "center",
                                },
                              ]}
                            >
                              <Feather
                                name="user"
                                size={bubbleSize * 0.4}
                                color="#999"
                              />
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  ) : isExisting && member ? (
                    // Display existing member
                    <View style={styles.bubbleContent}>
                      {isMembersLoading ? (
                        <>
                          <SkeletonText
                            width={60}
                            height={20}
                            style={{ marginBottom: 12 }}
                          />
                          <SkeletonCircle
                            size={bubbleSize}
                            style={styles.bubbleImage}
                          />
                        </>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.nameText,
                              {
                                marginBottom: 12,
                                color:
                                  member.status === "invited"
                                    ? "#D9D9D9"
                                    : "#222", // disabledButton color if invited
                              },
                            ]}
                          >
                            {member.first_name || "Member"}
                          </Text>
                          <View style={{ position: "relative" }}>
                            <Image
                              source={{
                                uri:
                                  memberSignedUrls[member.id] ||
                                  member.avatar_url ||
                                  undefined,
                              }}
                              style={[
                                styles.bubbleImage,
                                {
                                  width: bubbleSize,
                                  height: bubbleSize,
                                  borderRadius: bubbleSize / 2,
                                  marginBottom: 0,
                                  opacity:
                                    member.status === "invited" ? 0.6 : 1, // 0.6 opacity if invited
                                },
                              ]}
                            />
                            {member.status === "invited" && (
                              <View
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Feather
                                  name="more-horizontal"
                                  size={32}
                                  color="#999"
                                />
                              </View>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  ) : isExisting ? (
                    // Empty slot for existing bubble (when no member)
                    <View style={styles.bubbleContent}>
                      {isLoading ? (
                        <>
                          <SkeletonText
                            width={80}
                            height={20}
                            style={{ marginBottom: 12 }}
                          />
                          <SkeletonCircle
                            size={bubbleSize}
                            style={styles.emptyBubble}
                          />
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            router.push({
                              pathname: "/search",
                              params: {
                                groupId,
                              },
                            });
                          }}
                          activeOpacity={0.7}
                          style={styles.bubbleContent}
                        >
                          <Text
                            style={[
                              styles.nameText,
                              { marginBottom: 12, color: "#80B7FF" },
                            ]}
                          >
                            Add Member
                          </Text>
                          <View
                            style={[
                              styles.emptyBubble,
                              {
                                width: bubbleSize,
                                height: bubbleSize,
                                borderRadius: bubbleSize / 2,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "#D9D9D9", // mediumGray
                              },
                            ]}
                          >
                            <Feather name="plus" size={32} color="#80B7FF" />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    // Invitation slot for new bubble
                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: "/search",
                          params: {
                            groupId,
                          },
                        });
                      }}
                      activeOpacity={0.7}
                      style={styles.bubbleContent}
                    >
                      <Text
                        style={[
                          styles.nameText,
                          { marginBottom: 12, color: "#80B7FF" },
                        ]}
                      >
                        Invite Friend
                      </Text>
                      <View
                        style={[
                          styles.emptyBubble,
                          {
                            width: bubbleSize,
                            height: bubbleSize,
                            borderRadius: bubbleSize / 2,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "#D9D9D9", // mediumGray
                          },
                        ]}
                      >
                        <Feather name="plus" size={32} color="#80B7FF" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
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
  creatorName: {
    fontSize: 20,
    fontFamily: "Quicksand-Bold",
    color: "#000",
    marginBottom: 15,
    textAlign: "center",
  },
  membersContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 60,
    justifyContent: "center",
  },
  memberWithName: {
    alignItems: "center",
    zIndex: 2,
  },
  memberCircle: {
    zIndex: 2,
  },
  memberImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "#eee",
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  addMemberCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#eee",
  },
  overlappingCircle: {
    marginLeft: -40,
    zIndex: 1,
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
  
  // Triangle layout styles (Size 3)
  triangleContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  triangleTop: {
    alignItems: "center",
    marginBottom: 30,
    zIndex: 2,
  },
  triangleBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 260,
    zIndex: 1,
  },
  triangleMemberSlot: {
    alignItems: "center",
  },
  triangleMemberName: {
    fontSize: 16,
    fontFamily: "Quicksand-Bold",
    color: "#000",
    marginBottom: 10,
    textAlign: "center",
  },
  triangleMemberImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Diamond layout styles (Size 4)
  diamondContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  diamondRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    marginBottom: 20,
  },
  diamondMemberSlot: {
    alignItems: "center",
  },
  diamondMemberName: {
    fontSize: 14,
    fontFamily: "Quicksand-Bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  diamondMemberImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
});
