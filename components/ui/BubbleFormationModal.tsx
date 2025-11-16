import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

interface BubbleMember {
  id: string;
  name: string;
  imageUrl?: string;
}

interface BubbleFormationModalProps {
  visible: boolean;
  onClose: () => void;
  bubbleName: string;
  members: BubbleMember[];
}

const BubbleFormationModal: React.FC<BubbleFormationModalProps> = ({
  visible,
  onClose,
  bubbleName,
  members,
}) => {
  const { colors } = useAppTheme();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      // Add slight delay for better animation effect
      const timer = setTimeout(() => {
        setShowContent(true);
        // Provide haptic feedback
        Vibration.vibrate([0, 100, 100, 100]);
      }, 200);
      
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [visible]);

  const handleClose = () => {
    setShowContent(false);
    setTimeout(onClose, 200);
  };

  // Auto close after 10 seconds if user doesn't interact
  useEffect(() => {
    if (visible) {
      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, 10000);
      
      return () => clearTimeout(autoCloseTimer);
    }
  }, [visible]);

  const renderMemberAvatar = (member: BubbleMember, index: number) => {
    const isEven = members.length % 2 === 0;
    const totalMembers = members.length;
    
    // Calculate position based on member count and index
    let style = {};
    
    if (totalMembers === 2) {
      style = index === 0 ? styles.leftPosition : styles.rightPosition;
    } else if (totalMembers === 3) {
      if (index === 0) style = styles.leftPosition;
      else if (index === 1) style = styles.rightPosition;
      else style = styles.bottomCenterPosition;
    } else if (totalMembers === 4) {
      if (index === 0) style = styles.topLeftPosition;
      else if (index === 1) style = styles.topRightPosition;
      else if (index === 2) style = styles.bottomLeftPosition;
      else style = styles.bottomRightPosition;
    }

    return (
      <View key={member.id} style={[styles.memberContainer, style]}>
        <View style={styles.avatarContainer}>
          {member.imageUrl ? (
            <Image
              source={{ uri: member.imageUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person" size={40} color={colors.darkGray} />
            </View>
          )}
        </View>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, showContent && styles.containerVisible]}>
          {/* Close button - subtle, in top right */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.darkGray} />
          </TouchableOpacity>

          {/* Main announcement text */}
          <Text style={styles.title}>Your bubble is formed!</Text>

          {/* Bubble name */}
          <Text style={styles.bubbleName}>{bubbleName}</Text>

          {/* Members display area */}
          <View style={styles.membersContainer}>
            {members.map((member, index) => renderMemberAvatar(member, index))}
          </View>

          {/* Continue button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "white",
    borderRadius: 0,
    paddingHorizontal: 40,
    paddingVertical: 80,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transform: [{ scale: 0.9 }],
  },
  containerVisible: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 12,
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: "Quicksand-Bold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 40,
  },
  bubbleName: {
    fontSize: 40,
    fontFamily: "Quicksand-Bold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 80,
    letterSpacing: 1,
  },
  membersContainer: {
    width: 300,
    height: 300,
    position: "relative",
    marginBottom: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  memberContainer: {
    position: "absolute",
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#E0E0E0",
  },
  defaultAvatar: {
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
  },
  memberName: {
    fontSize: 16,
    fontFamily: "Quicksand-SemiBold",
    color: "#303030",
    textAlign: "center",
    maxWidth: 100,
  },
  continueButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#80B7FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  // Position styles for different member counts
  leftPosition: {
    left: -60,
    top: 0,
  },
  rightPosition: {
    right: -60,
    top: 0,
  },
  bottomCenterPosition: {
    bottom: -40,
    left: "50%",
    marginLeft: -60, // Half of avatar width
  },
  topLeftPosition: {
    left: -60,
    top: -40,
  },
  topRightPosition: {
    right: -60,
    top: -40,
  },
  bottomLeftPosition: {
    left: -60,
    bottom: -40,
  },
  bottomRightPosition: {
    right: -60,
    bottom: -40,
  },
});

export default BubbleFormationModal;