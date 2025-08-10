import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";

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

// Custom Invitation Item Component
const InvitationItem: React.FC<{
  bubble: InvitationBubble;
  onAccept: (bubbleId: string) => void;
  onDecline: (bubbleId: string) => void;
}> = ({ bubble, onAccept, onDecline }) => {
  const [creatorImageUrl, setCreatorImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Create signed URL for creator's avatar
  const createSignedUrlForCreator = useCallback(async () => {
    if (!bubble.creator?.avatar_url) return;

    try {
      const urlParts = bubble.creator.avatar_url.split("/user-images/");
      const filePath = urlParts.length > 1 ? urlParts[1] : null;

      if (!filePath) return;

      const { data, error } = await supabase.storage
        .from("user-images")
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error("[InvitationItem] Signed URL 생성 실패:", error);
        return;
      }

      setCreatorImageUrl(data.signedUrl);
    } catch (error) {
      console.error("[InvitationItem] Signed URL 생성 중 예외:", error);
    }
  }, [bubble.creator?.avatar_url]);

  useEffect(() => {
    createSignedUrlForCreator();
  }, [createSignedUrlForCreator]);

  const creatorName = bubble.creator ? `${bubble.creator.first_name}_${bubble.creator.last_name}` : "Someone";
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

export default function InvitationPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [invitedBubbles, setInvitedBubbles] = useState<InvitationBubble[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvitedBubbles = async () => {
      if (!session?.user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_my_bubbles", {
          p_user_id: session.user.id,
        });

        if (error) throw error;

        console.log("[InvitationPage] Raw RPC data:", JSON.stringify(data, null, 2));
        console.log("[InvitationPage] User ID:", session.user.id);
        
        // Filter only invited status bubbles and extract creator info
        const invited = (data || [])
          .filter((bubble: any) => {
            console.log(`[InvitationPage] Bubble ${bubble.id} has user_status: ${bubble.user_status}`);
            return bubble.user_status === "invited";
          })
          .map((bubble: any) => {
            // Extract creator info from members array (first member is usually the creator)
            const members = Array.isArray(bubble.members) 
              ? bubble.members 
              : (bubble.members ? JSON.parse(bubble.members) : []);
            
            const creator = members.find((member: any) => member.status === 'joined') || members[0];
            
            // Determine group size based on member count or group status
            const maxSize = members.length <= 2 ? "2:2" : "3:3";
            
            return {
              id: bubble.id,
              name: bubble.name,
              status: bubble.status,
              members: members,
              user_status: bubble.user_status,
              invited_at: bubble.invited_at,
              group_size: maxSize,
              creator: creator ? {
                id: creator.id,
                first_name: creator.first_name,
                last_name: creator.last_name,
                avatar_url: creator.images && creator.images[0] ? creator.images[0].image_url : null
              } : null
            };
          });

        console.log("[InvitationPage] Total filtered invited bubbles:", invited.length);
        console.log("[InvitationPage] Invited bubbles:", JSON.stringify(invited, null, 2));
        setInvitedBubbles(invited);
      } catch (error) {
        console.error("Error fetching invited bubbles:", error);
        setInvitedBubbles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitedBubbles();
  }, [session]);

  const handleAcceptInvitation = async (bubbleId: string) => {
    console.log("[InvitationPage] 🟢 handleAcceptInvitation 시작");
    console.log("[InvitationPage] 버블 ID:", bubbleId);
    console.log("[InvitationPage] 현재 세션 유저 ID:", session?.user?.id);

    if (!session?.user) {
      console.error("[InvitationPage] ❌ 세션이 없어 초대 수락을 중단합니다.");
      Alert.alert("Error", "You must be logged in to accept invitations.");
      return;
    }

    try {
      console.log("[InvitationPage] 📡 accept_invitation RPC 호출 시작");
      console.log("[InvitationPage] RPC 파라미터:", {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });

      const { data, error } = await supabase.rpc("accept_invitation", {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });

      console.log("[InvitationPage] 📡 RPC 응답 받음");
      console.log("[InvitationPage] RPC 응답 데이터:", data);
      console.log("[InvitationPage] RPC 에러:", error);

      if (error) {
        console.error("[InvitationPage] ❌ RPC 에러 발생:", error);
        console.error("[InvitationPage] 에러 상세:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log("[InvitationPage] ✅ RPC 호출 성공");
      console.log("[InvitationPage] 반환된 데이터:", data);

      // Optimistic UI update - Remove from local state immediately
      console.log("[InvitationPage] 🎨 Optimistic UI 업데이트 시작");
      console.log(
        "[InvitationPage] 업데이트 전 초대 목록 개수:",
        invitedBubbles.length
      );

      setInvitedBubbles((prev) => {
        const updated = prev.filter((bubble) => bubble.id !== bubbleId);
        console.log(
          "[InvitationPage] 업데이트 후 초대 목록 개수:",
          updated.length
        );
        console.log("[InvitationPage] 제거된 버블 ID:", bubbleId);
        return updated;
      });

      console.log("[InvitationPage] 🎉 초대 수락 완료!");
      Alert.alert("Success", "You have successfully joined the bubble! 🎉", [
        {
          text: "OK",
          onPress: () => {
            console.log("[InvitationPage] 사용자가 성공 알림을 확인했습니다.");
          },
        },
      ]);
    } catch (error) {
      console.error(
        "[InvitationPage] ❌ handleAcceptInvitation 전체 에러:",
        error
      );
      console.error("[InvitationPage] 에러 타입:", typeof error);
      console.error(
        "[InvitationPage] 에러 메시지:",
        error instanceof Error ? error.message : String(error)
      );

      Alert.alert("Error", "Failed to accept invitation. Please try again.", [
        {
          text: "OK",
          onPress: () => {
            console.log("[InvitationPage] 사용자가 에러 알림을 확인했습니다.");
          },
        },
      ]);
    }
  };

  const handleDeclineInvitation = async (bubbleId: string) => {
    console.log("[InvitationPage] 🔴 handleDeclineInvitation 시작");
    console.log("[InvitationPage] 버블 ID:", bubbleId);
    console.log("[InvitationPage] 현재 세션 유저 ID:", session?.user?.id);

    if (!session?.user) {
      console.error("[InvitationPage] ❌ 세션이 없어 초대 거절을 중단합니다.");
      Alert.alert("Error", "You must be logged in to decline invitations.");
      return;
    }

    try {
      console.log("[InvitationPage] 📡 decline_invitation RPC 호출 시작");
      console.log("[InvitationPage] RPC 파라미터:", {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });

      const { data, error } = await supabase.rpc("decline_invitation", {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });

      console.log("[InvitationPage] 📡 RPC 응답 받음");
      console.log("[InvitationPage] RPC 응답 데이터:", data);
      console.log("[InvitationPage] RPC 에러:", error);

      if (error) {
        console.error("[InvitationPage] ❌ RPC 에러 발생:", error);
        console.error("[InvitationPage] 에러 상세:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log("[InvitationPage] ✅ RPC 호출 성공");
      console.log("[InvitationPage] 반환된 데이터:", data);

      // Optimistic UI update - Remove from local state immediately
      console.log("[InvitationPage] 🎨 Optimistic UI 업데이트 시작");
      console.log(
        "[InvitationPage] 업데이트 전 초대 목록 개수:",
        invitedBubbles.length
      );

      setInvitedBubbles((prev) => {
        const updated = prev.filter((bubble) => bubble.id !== bubbleId);
        console.log(
          "[InvitationPage] 업데이트 후 초대 목록 개수:",
          updated.length
        );
        console.log("[InvitationPage] 제거된 버블 ID:", bubbleId);
        return updated;
      });

      console.log("[InvitationPage] 🎉 초대 거절 완료!");
      Alert.alert("Success", "Invitation declined successfully.", [
        {
          text: "OK",
          onPress: () => {
            console.log("[InvitationPage] 사용자가 성공 알림을 확인했습니다.");
          },
        },
      ]);
    } catch (error) {
      console.error(
        "[InvitationPage] ❌ handleDeclineInvitation 전체 에러:",
        error
      );
      console.error("[InvitationPage] 에러 타입:", typeof error);
      console.error(
        "[InvitationPage] 에러 메시지:",
        error instanceof Error ? error.message : String(error)
      );

      Alert.alert("Error", "Failed to decline invitation. Please try again.", [
        {
          text: "OK",
          onPress: () => {
            console.log("[InvitationPage] 사용자가 에러 알림을 확인했습니다.");
          },
        },
      ]);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="mail-outline" size={64} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyText}>
        You don't have any invites yet.
      </Text>
      <Text style={styles.emptySubtext}>
        You can only join one bubble at a time !
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Invites</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#80B7FF" />
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {invitedBubbles.length > 0 ? (
              invitedBubbles.map((bubble, index) => (
                <InvitationItem
                  key={bubble.id}
                  bubble={bubble}
                  onAccept={handleAcceptInvitation}
                  onDecline={handleDeclineInvitation}
                />
              ))
            ) : (
              renderEmptyState()
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 0.33,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Quicksand',
    fontWeight: '700',
    color: 'black',
  },
  // Content styles
  content: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Invitation card styles
  invitationCard: {
    width: '100%',
    height: 112,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CEE3FF',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  creatorAvatar: {
    width: 75.07,
    height: 75.07,
    borderRadius: 37.5,
    marginBottom: 8,
  },
  placeholderAvatar: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    textAlign: 'center',
    color: 'black',
    fontSize: 14,
    fontFamily: 'Quicksand',
    fontWeight: '500',
  },
  invitationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  invitationTextContainer: {
    marginBottom: 16,
  },
  invitationText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Quicksand',
  },
  normalText: {
    color: 'black',
    fontWeight: '500',
  },
  bubbleSizeText: {
    color: '#80B7FF',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  declineButton: {
    width: 108,
    height: 35,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#80B7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButtonText: {
    textAlign: 'center',
    color: 'black',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
    lineHeight: 22,
  },
  acceptButton: {
    width: 108,
    height: 35,
    backgroundColor: '#80B7FF',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
    lineHeight: 22,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: 'black',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '500',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'Quicksand',
    fontWeight: '400',
    lineHeight: 20,
  },
  // Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
