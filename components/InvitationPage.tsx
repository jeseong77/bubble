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
import { InvitationItem } from "@/components/invitation/InvitationItem";

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

        
        // Filter only invited status bubbles and extract creator info
        const invited = (data || [])
          .filter((bubble: any) => {
            
            const isInvited = bubble.user_status === "invited";
            return isInvited;
          })
          .map((bubble: any, index: number) => {
            
            const members = Array.isArray(bubble.members) 
              ? bubble.members 
              : (bubble.members ? JSON.parse(bubble.members) : []);
            
            
            // Use creator info directly from RPC response instead of guessing from members
            const creator = bubble.creator;
            
            // Determine group size based on member count or group status
            const maxSize = members.length <= 2 ? "2:2" : "3:3";
            
            const result = {
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
                avatar_url: creator.avatar_url
              } : null
            };
            
            return result;
          });

        setInvitedBubbles(invited);
      } catch (error) {
        setInvitedBubbles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitedBubbles();
  }, [session]);

  const handleAcceptInvitation = async (bubbleId: string) => {

    if (!session?.user) {
      Alert.alert("Error", "You must be logged in to accept invitations.");
      return;
    }

    try {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });

      const { data, error } = await supabase.rpc("accept_invitation", {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });


      if (error) {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        Alert.alert("Error", error.message || "Failed to accept invitation. Please try again.");
        return;
      }

      // Handle the new JSON response format
      if (!data || !data.success) {
        
        // Handle specific error cases
        let errorMessage = "Failed to accept invitation.";
        let errorTitle = "Error";
        
        if (data?.error === 'GROUP_FULL') {
          errorTitle = "Bubble Full";
          errorMessage = `This bubble is already full (${data.current_size}/${data.max_size} members).`;
        } else if (data?.error === 'GROUP_NOT_FORMING') {
          errorTitle = "Bubble Not Available";
          errorMessage = "This bubble is no longer accepting new members.";
        } else if (data?.error === 'NO_PENDING_INVITATION') {
          errorTitle = "Invalid Invitation";
          errorMessage = "You don't have a pending invitation to this bubble.";
        } else if (data?.error === 'GROUP_NOT_FOUND') {
          errorTitle = "Bubble Not Found";
          errorMessage = "This bubble no longer exists.";
        } else if (data?.message) {
          errorMessage = data.message;
        }
        
        Alert.alert(errorTitle, errorMessage);
        
        // If the invitation is no longer valid, remove it from the UI
        if (data?.error === 'GROUP_FULL' || 
            data?.error === 'GROUP_NOT_FORMING' || 
            data?.error === 'NO_PENDING_INVITATION' || 
            data?.error === 'GROUP_NOT_FOUND') {
          setInvitedBubbles((prev) => prev.filter((bubble) => bubble.id !== bubbleId));
        }
        
        return;
      }

        name: data.group_name,
        isFull: data.group_full,
        finalSize: data.final_size || data.current_size,
        maxSize: data.max_size,
        cleanedUpInvitations: data.cleaned_up_invitations
      });

      // Remove this invitation from local state
      setInvitedBubbles((prev) => {
        const updated = prev.filter((bubble) => bubble.id !== bubbleId);
        return updated;
      });

      // Show success message with additional context
      let successMessage = `You've successfully joined "${data.group_name}"! 🎉`;
      
      if (data.group_full && data.cleaned_up_invitations > 0) {
        successMessage += `\n\nThe bubble is now full (${data.final_size}/${data.max_size}), and ${data.cleaned_up_invitations} other pending invitation(s) have been automatically removed.`;
      } else if (data.group_full) {
        successMessage += `\n\nThe bubble is now full (${data.final_size}/${data.max_size})!`;
      } else {
        successMessage += `\n\nBubble size: ${data.current_size}/${data.max_size}`;
      }

      Alert.alert("Joined Bubble!", successMessage, [
        {
          text: "OK",
          onPress: () => {
          },
        },
      ]);
      
    } catch (error) {
        "[InvitationPage] Error message:",
        error instanceof Error ? error.message : String(error)
      );

      Alert.alert("Error", "An unexpected error occurred. Please try again.", [
        {
          text: "OK",
          onPress: () => {
          },
        },
      ]);
    }
  };

  const handleDeclineInvitation = async (bubbleId: string) => {

    if (!session?.user) {
      Alert.alert("Error", "You must be logged in to decline invitations.");
      return;
    }

    try {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });

      const { data, error } = await supabase.rpc("decline_invitation", {
        p_group_id: bubbleId,
        p_user_id: session.user.id,
      });


      if (error) {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }


      // Optimistic UI update - Remove from local state immediately
        "[InvitationPage] Invitation list count before update:",
        invitedBubbles.length
      );

      setInvitedBubbles((prev) => {
        const updated = prev.filter((bubble) => bubble.id !== bubbleId);
          "[InvitationPage] Invitation list count after update:",
          updated.length
        );
        return updated;
      });

      Alert.alert("Success", "Invitation declined successfully.", [
        {
          text: "OK",
          onPress: () => {
          },
        },
      ]);
    } catch (error) {
        "[InvitationPage] ❌ handleDeclineInvitation complete error:",
        error
      );
        "[InvitationPage] Error message:",
        error instanceof Error ? error.message : String(error)
      );

      Alert.alert("Error", "Failed to decline invitation. Please try again.", [
        {
          text: "OK",
          onPress: () => {
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
        You can only join one bubble at a time!
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
    fontWeight: '600',
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
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -90,  // Move up by header height + 30px
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666',
  },
  // Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
