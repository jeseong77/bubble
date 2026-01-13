import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { InvitationItem } from "@/components/invitation/InvitationItem";
import { useInvitations } from "@/hooks/useInvitations";

export default function InvitationPage() {
  const router = useRouter();
  const { session } = useAuth();

  const {
    invitedBubbles,
    loading,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = useInvitations({
    userId: session?.user?.id,
    onAcceptSuccess: () => {
      // Optionally navigate or refresh
    },
  });

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
