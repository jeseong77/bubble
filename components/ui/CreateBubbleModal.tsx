import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

interface CreateBubbleModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (bubbleType: "2-2" | "3-3" | "4-4") => void;
}

const CreateBubbleModal: React.FC<CreateBubbleModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [selectedType, setSelectedType] = useState<
    "2-2" | "3-3" | "4-4" | null
  >(null);

  // 클라이언트에서 위 함수를 호출하는 테스트 코드
  const handleTestRpc = async () => {
    console.log("Testing group creation via RPC...");
    const { data, error } = await supabase.rpc("test_create_group");

    if (error) {
      console.error("RPC Error:", error);
      alert("RPC 호출에 실패했습니다. 로그를 확인하세요.");
    } else {
      console.log("RPC Success, new group ID:", data);
      alert("RPC 호출 성공! 새로운 그룹이 생성되었습니다.");
    }
  };

  const handleCreate = () => {
    if (selectedType) {
      // 3:3 버튼을 누르면 테스트 RPC 함수 실행
      if (selectedType === "3-3") {
        handleTestRpc();
        setSelectedType(null);
        onClose();
        return;
      }

      onCreate(selectedType);
      setSelectedType(null);
    }
  };

  const handleCancel = () => {
    setSelectedType(null);
    onClose();
  };

  const bubbleTypes = [
    { type: "2-2", label: "2:2", icon: "people" },
    { type: "3-3", label: "3:3", icon: "people" },
    { type: "4-4", label: "4:4", icon: "people" },
  ] as const;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Create New Bubble</Text>

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
                <Ionicons
                  name={bubbleType.icon}
                  size={32}
                  color={selectedType === bubbleType.type ? "#5A99E5" : "#666"}
                />
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
                styles.createButton,
                !selectedType && styles.createButtonDisabled,
              ]}
              onPress={handleCreate}
              activeOpacity={0.7}
              disabled={!selectedType}
            >
              <Text
                style={[
                  styles.createButtonText,
                  !selectedType && styles.createButtonTextDisabled,
                ]}
              >
                Create
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCircle: {
    borderColor: "#5A99E5",
    backgroundColor: "#E3F0FF",
  },
  bubbleTypeLabel: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
    fontWeight: "500",
  },
  selectedLabel: {
    color: "#5A99E5",
    fontWeight: "600",
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
