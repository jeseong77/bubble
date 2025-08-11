import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

interface CreateBubbleModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate?: (bubbleType: "2-2" | "3-3" | "4-4") => void; // Made optional since we'll handle creation internally
}

const CreateBubbleModal: React.FC<CreateBubbleModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedType, setSelectedType] = useState<
    "2-2" | "3-3" | "4-4" | null
  >(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [bubbleName, setBubbleName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Move bubble creation logic from profile.tsx to here
  const handleCreateBubble = async (bubbleSize: "2-2" | "3-3" | "4-4", bubbleName: string) => {
    if (!session?.user) {
      Alert.alert("Error", "Please login to create a bubble.");
      return;
    }

    // Get user profile data first
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      Alert.alert("Error", "Could not load your profile. Please try again.");
      return;
    }

    if (!profile.gender) {
      Alert.alert("Error", "Please complete your profile setup first.");
      return;
    }

    console.log("[CreateBubbleModal] 🟢 Creating bubble...");
    console.log("[CreateBubbleModal] Bubble size:", bubbleSize);
    console.log("[CreateBubbleModal] Bubble name:", bubbleName);

    setIsCreating(true);
    try {
      // Convert bubble size to max_size number
      const maxSize = bubbleSize === "2-2" ? 2 : bubbleSize === "3-3" ? 3 : 4;
      
      const { data: newGroup, error } = await supabase.rpc("create_group", {
        p_creator_id: session.user.id,
        p_max_size: maxSize,
        p_group_name: bubbleName,
        p_preferred_gender: 'any' // Default to 'any' for now
      });

      if (error) {
        console.error("[CreateBubbleModal] RPC Error:", error);
        Alert.alert("Error", "Failed to create bubble. Please try again.");
        return;
      }

      if (!newGroup) {
        Alert.alert("Error", "Failed to create bubble. Please try again.");
        return;
      }

      console.log("[CreateBubbleModal] ✅ Bubble created with ID:", newGroup);

      // Navigate to the form page to show the bubble
      router.push({
        pathname: "/bubble/form",
        params: {
          groupId: newGroup,
          isExistingBubble: "false",
        },
      });
      
      // Reset modal state and close
      handleCancel();
    } catch (error) {
      console.error("[CreateBubbleModal] Error:", error);
      Alert.alert("Error", "Failed to create bubble. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => {
    if (selectedType) {
      setShowNameModal(true);
    }
  };

  const handleCreateWithName = async () => {
    if (!bubbleName.trim()) {
      Alert.alert("Error", "Please enter a bubble name.");
      return;
    }
    if (!selectedType) {
      Alert.alert("Error", "Please select a bubble size.");
      return;
    }
    
    await handleCreateBubble(selectedType, bubbleName.trim());
  };

  const handleCancel = () => {
    setSelectedType(null);
    setShowNameModal(false);
    setBubbleName("");
    setIsCreating(false);
    onClose();
  };

  const handleBackFromName = () => {
    setShowNameModal(false);
    setBubbleName("");
  };

  const bubbleTypes = [
    { type: "2-2", label: "2:2", icon: "people" },
    { type: "3-3", label: "3:3", icon: "people" },
    { type: "4-4", label: "4:4", icon: "people" },
  ] as const;

  return (
    <>
      {/* Size Selection Modal */}
      <Modal
        visible={visible && !showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Which size of Bubble{"\n"}do you want to make?</Text>

            <View style={styles.bubbleTypeContainer}>
              {bubbleTypes.map((bubbleType) => (
                <TouchableOpacity
                  key={bubbleType.type}
                  style={[
                    styles.bubbleTypeCircle,
                    selectedType === bubbleType.type && styles.selectedCircle,
                  ]}
                  onPress={() => setSelectedType(bubbleType.type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bubbleTypeLabel,
                      selectedType === bubbleType.type && styles.selectedLabel,
                    ]}
                  >
                    {bubbleType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !selectedType && styles.nextButtonDisabled,
                ]}
                onPress={handleNext}
                activeOpacity={0.7}
                disabled={!selectedType}
              >
                <Text
                  style={[
                    styles.nextButtonText,
                    !selectedType && styles.nextButtonTextDisabled,
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name Input Modal */}
      <Modal
        visible={visible && showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleBackFromName}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Name your Bubble</Text>

            <View style={styles.nameInputContainer}>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter bubble name..."
                value={bubbleName}
                onChangeText={setBubbleName}
                placeholderTextColor="#999"
                autoFocus
                maxLength={30}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!bubbleName.trim() || isCreating) && styles.createButtonDisabled,
                ]}
                onPress={handleCreateWithName}
                activeOpacity={0.7}
                disabled={!bubbleName.trim() || isCreating}
              >
                {isCreating ? (
                  <Text style={styles.createButtonText}>Creating...</Text>
                ) : (
                  <Text
                    style={[
                      styles.createButtonText,
                      !bubbleName.trim() && styles.createButtonTextDisabled,
                    ]}
                  >
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: Dimensions.get("window").width * 0.85,
    maxWidth: 400,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#000",
  },
  bubbleTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
  },
  bubbleTypeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCircle: {
    borderColor: "#5A99E5",
    backgroundColor: "#5A99E5",
  },
  bubbleTypeLabel: {
    fontSize: 18,
    color: "#666",
    fontWeight: "600",
  },
  selectedLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  nameInputContainer: {
    marginBottom: 32,
    backgroundColor: "#8ec3ff",
    borderRadius: 12,
    padding: 20,
    minHeight: 80,
  },
  nameInput: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#5A99E5",
  },
  nextButtonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  nextButtonText: {
    textAlign: "center",
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  nextButtonTextDisabled: {
    color: "#999",
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#5A99E5",
  },
  createButtonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  createButtonText: {
    textAlign: "center",
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  createButtonTextDisabled: {
    color: "#999",
  },
});

export default CreateBubbleModal;
