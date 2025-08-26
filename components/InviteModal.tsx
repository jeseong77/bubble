import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/hooks/useAppTheme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName?: string;
  bubbleSize?: string;
}

export default function InviteModal({
  visible,
  onClose,
  groupId,
  groupName = "My Bubble",
  bubbleSize = "2:2",
}: InviteModalProps) {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const [inviteLink, setInviteLink] = useState<string>("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);

  // Generate the invitation link
  useEffect(() => {
    if (visible && groupId) {
      generateInviteLink();
    }
  }, [visible, groupId]);

  const generateInviteLink = async () => {
    if (!session?.user?.id) {
      Alert.alert("Error", "You must be logged in to generate invitations");
      return;
    }

    setIsGeneratingLink(true);
    try {
      console.log("[InviteModal] Generating secure invitation token...");
      
      const { data, error } = await supabase.rpc("generate_invitation_token", {
        p_group_id: groupId,
        p_created_by: session.user.id,
        p_expires_hours: 168 // 7 days
      });

      console.log("[InviteModal] Token generation response:", { data, error });

      if (error) {
        console.error("[InviteModal] RPC error:", error);
        Alert.alert("Error", error.message || "Failed to generate invitation token");
        return;
      }

      if (!data?.success) {
        console.error("[InviteModal] Token generation failed:", data);
        Alert.alert("Error", data?.message || "Failed to generate invitation link");
        return;
      }

      // Store token data and set invite link
      setTokenData(data);
      setInviteLink(data.invite_link);
      
      console.log("[InviteModal] ✅ Secure invitation generated:", {
        token: data.token,
        link: data.invite_link,
        expires: data.expires_at
      });
      
    } catch (error) {
      console.error("[InviteModal] Exception in generateInviteLink:", error);
      Alert.alert("Error", "An unexpected error occurred while generating the invitation");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (!inviteLink) {
        Alert.alert("Error", "Invite link not ready yet");
        return;
      }

      await Clipboard.setStringAsync(inviteLink);
      
      // Provide haptic feedback
      Vibration.vibrate(50);
      
      // Show success feedback
      Alert.alert(
        "Link Copied! 📋",
        "Invitation link copied to clipboard",
        [{ text: "OK", style: "default" }]
      );
      
      console.log("[InviteModal] Link copied to clipboard:", inviteLink);
    } catch (error) {
      console.error("[InviteModal] Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy link to clipboard");
    }
  };

  const shareLink = async () => {
    try {
      if (!inviteLink) {
        Alert.alert("Error", "Invite link not ready yet");
        return;
      }

      // For now, just copy to clipboard as sharing
      // In a real implementation, you'd use React Native's Share API
      await copyToClipboard();
      
      console.log("[InviteModal] Share initiated for link:", inviteLink);
    } catch (error) {
      console.error("[InviteModal] Error sharing link:", error);
      Alert.alert("Error", "Failed to share invitation link");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={["#80B7FF", "#5A99E5", "#4A8BD8"]}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Close button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>
            Invite your friends{"\n"}to join your Bubble!
          </Text>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            {isGeneratingLink ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : inviteLink ? (
              <QRCode
                value={inviteLink}
                size={220}
                color="black"
                backgroundColor="white"
                logo={null}
                logoSize={30}
                logoBackgroundColor="transparent"
                quietZone={10}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={60} color={colors.darkGray} />
                <Text style={styles.qrPlaceholderText}>
                  Loading QR Code...
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Share Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={shareLink}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={24} color="#5A99E5" />
            </TouchableOpacity>

            {/* Copy Link Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={copyToClipboard}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={24} color="#5A99E5" />
            </TouchableOpacity>
          </View>

          {/* Helper text */}
          <Text style={styles.helperText}>
            Friends can scan this QR code or use the link to instantly join your {bubbleSize} bubble
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 80,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 30,
    zIndex: 10,
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Quicksand-Bold",
    color: "white",
    textAlign: "center",
    marginBottom: 80,
    lineHeight: 36,
  },
  qrContainer: {
    width: 280,
    height: 280,
    backgroundColor: "white",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholderText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 40,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  helperText: {
    fontSize: 14,
    fontFamily: "Quicksand-Regular",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});