import React, { useState, useEffect } from "react"; // useEffect 추가
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
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase"; // supabase 클라이언트 추가
import { useAuth } from "@/providers/AuthProvider";

// 스켈레톤 컴포넌트들
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

// 멤버 타입 정의 (간단한 버전)
interface BubbleMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function BubbleFormScreen() {
  const router = useRouter();
  const { session } = useAuth(); // Needed for handlePopBubble

  // 이전 화면에서 전달된 파라미터 가져오기
  const {
    groupId, // groupId를 받음
    isExistingBubble, // 기존 버블인지 여부
  } = useLocalSearchParams<{
    groupId: string;
    isExistingBubble?: string;
  }>();

  // 버블 이름은 이 화면에서 관리
  const [bubbleName, setBubbleName] = useState("");
  const [creatorSignedUrl, setCreatorSignedUrl] = useState<string | null>(null); // 이미지 URL 상태 추가
  const [bubbleMembers, setBubbleMembers] = useState<BubbleMember[]>([]); // 버블 멤버 정보
  const [memberSignedUrls, setMemberSignedUrls] = useState<{
    [key: string]: string;
  }>({}); // 멤버별 Signed URL
  const [bubbleInfo, setBubbleInfo] = useState<any>(null); // 전체 버블 정보
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태
  const [isMembersLoading, setIsMembersLoading] = useState(false); // 멤버 로딩 상태

  // get_bubble RPC를 사용하여 버블 정보 가져오기
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
            console.log("Members field:", bubbleInfo.members);
            console.log("Members field type:", typeof bubbleInfo.members);

            // 버블 이름 설정
            setBubbleName(bubbleInfo.name || "");

            // 전체 버블 정보 저장
            setBubbleInfo(bubbleInfo);

            // 멤버 정보 설정 (JSON 파싱)
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
                console.error("멤버 정보 파싱 실패:", parseError);
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

  // 멤버들의 프로필 이미지 URL 설정 (새로운 구조에 맞게)
  useEffect(() => {
    if (bubbleMembers.length === 0) return;

    setIsMembersLoading(true);
    const urls: { [key: string]: string } = {};

    for (const member of bubbleMembers) {
      // 간단한 구조: member.avatar_url을 직접 사용
      if (member.avatar_url) {
        urls[member.id] = member.avatar_url;
      }
    }

    setMemberSignedUrls(urls);
    setIsMembersLoading(false);
  }, [bubbleMembers]);

  // 버블 크기 계산 (기존 버블의 경우 max_size 사용, 새 버블의 경우 기본값 2)
  const bubbleMemberCount = bubbleInfo?.max_size || 2;

  // 생성자 이미지 URL 설정 (간단한 구조에 맞게)
  useEffect(() => {
    if (bubbleMembers.length > 0 && bubbleMembers[0]?.avatar_url) {
      // 생성자 이미지 URL 설정
      setCreatorSignedUrl(bubbleMembers[0].avatar_url);
    }
  }, [bubbleMembers]);

  // 기존 버블의 멤버 정보는 이미 파라미터로 전달받았으므로 별도 RPC 호출 불필요

  // ... (기존 bubbleSize 계산 로직)
  const screenWidth = Dimensions.get("window").width;
  const totalBubblesWidth = screenWidth * 0.9;
  const overlapRatio = 0.18;
  const bubbleSize =
    totalBubblesWidth /
    (bubbleMemberCount - (bubbleMemberCount - 1) * overlapRatio);
  const overlapOffset = bubbleSize * (1 - overlapRatio);

  const handleInviteFriend = async () => {
    if (!bubbleName.trim()) {
      alert("버블 이름을 입력해주세요.");
      return;
    }

    try {
      // 기존 버블인지 새 버블인지 확인
      const isExisting = isExistingBubble === "true";

      if (isExisting) {
        // 기존 버블의 경우 이름만 업데이트
        const { error } = await supabase
          .from("groups")
          .update({ name: bubbleName })
          .eq("id", groupId);

        if (error) throw error;

        console.log("기존 버블 이름 업데이트 완료:", bubbleName);
        // TODO: 기존 버블의 경우 멤버 관리 화면으로 이동하거나 다른 처리
        alert("버블 이름이 업데이트되었습니다.");
      } else {
        // 새 버블의 경우 이름 업데이트 후 친구 초대 화면으로 이동
        const { error } = await supabase
          .from("groups")
          .update({ name: bubbleName })
          .eq("id", groupId);

        if (error) throw error;

        // Navigate to friend search screen for invitations
        router.push({
          pathname: "/search",
          params: {
            groupId,
          },
        });
      }
    } catch (error) {
      console.error("Error updating bubble name:", error);
      alert("버블 이름 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

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

  // Check if this is a new bubble to show simplified interface
  const isNewBubble = isExistingBubble === "false";
  
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
          
          {/* Member circles - overlapping layout */}
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
              <TextInput
                style={styles.titleInput}
                placeholder="Name your bubble"
                value={bubbleName}
                onChangeText={setBubbleName}
                placeholderTextColor="#999"
                autoFocus={true}
              />
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
            {/* 모든 버블 슬롯을 나란히 표시 */}
            {Array.from({ length: bubbleMemberCount }).map((_, index) => {
              const isExisting = isExistingBubble === "true";

              // 기존 버블의 경우: 멤버 배열에서 해당 인덱스의 멤버를 찾거나 빈 슬롯
              // 새 버블의 경우: 첫 번째는 생성자, 나머지는 초대 슬롯
              let member = null;
              let isCreator = false;

              if (isExisting) {
                // 기존 버블: 모든 슬롯이 나란히 표시
                member = bubbleMembers[index];
              } else {
                // 새 버블: 첫 번째는 생성자
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
                      zIndex: bubbleMemberCount - index, // zIndex를 다르게 주어 겹치게 함
                      alignItems: "center",
                    },
                  ]}
                >
                  {isCreator ? (
                    // 생성자 표시 (새 버블의 첫 번째 슬롯)
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
                    // 기존 멤버 표시
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
                                    : "#222", // invited면 disabledButton 색
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
                                    member.status === "invited" ? 0.6 : 1, // invited면 0.6 opacity
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
                    // 기존 버블의 빈 슬롯 (멤버가 없는 경우)
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
                    // 새 버블의 초대 슬롯
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

          {isLoading ? (
            <SkeletonView width={150} height={50} style={styles.inviteButton} />
          ) : (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInviteFriend}
              activeOpacity={0.7}
            >
              <Text style={styles.inviteButtonText}>
                {isExistingBubble === "true"
                  ? "Update Bubble"
                  : "Invite Friend"}
              </Text>
            </TouchableOpacity>
          )}

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
    color: "#222",
    textAlign: "center",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
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
    color: "#000",
    marginTop: 100,
    marginBottom: 80,
    textAlign: "center",
  },
  creatorName: {
    fontSize: 20,
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
