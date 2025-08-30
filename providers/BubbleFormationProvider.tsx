import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { EventBus } from "@/services/EventBus";
import BubbleFormationModal from "@/components/ui/BubbleFormationModal";

interface BubbleMember {
  id: string;
  name: string;
  imageUrl?: string;
}

interface BubbleFormationData {
  groupId: string;
  groupName: string;
  members: BubbleMember[];
}

type BubbleFormationContextType = {
  showBubbleFormationAnnouncement: (data: BubbleFormationData) => void;
};

const BubbleFormationContext = createContext<BubbleFormationContextType | undefined>(
  undefined
);

export default function BubbleFormationProvider({ children }: PropsWithChildren) {
  const [modalVisible, setModalVisible] = useState(false);
  const [bubbleData, setBubbleData] = useState<BubbleFormationData | null>(null);

  useEffect(() => {
    console.log("[BubbleFormationProvider] Setting up event listener");
    
    // Listen for bubble formation events
    const unsubscribe = EventBus.onEvent('BUBBLE_FORMED', (payload) => {
      console.log("[BubbleFormationProvider] Received BUBBLE_FORMED event:", payload);
      
      // Show the announcement modal
      showBubbleFormationAnnouncement({
        groupId: payload.groupId,
        groupName: payload.groupName,
        members: payload.members,
      });
    });

    return () => {
      console.log("[BubbleFormationProvider] Cleaning up event listener");
      unsubscribe();
    };
  }, []);

  const showBubbleFormationAnnouncement = (data: BubbleFormationData) => {
    console.log("[BubbleFormationProvider] Showing bubble formation announcement:", data);
    setBubbleData(data);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    console.log("[BubbleFormationProvider] Closing bubble formation announcement");
    setModalVisible(false);
    setBubbleData(null);
  };

  const value = {
    showBubbleFormationAnnouncement,
  };

  return (
    <BubbleFormationContext.Provider value={value}>
      {children}
      
      {/* Global Bubble Formation Modal */}
      {bubbleData && (
        <BubbleFormationModal
          visible={modalVisible}
          onClose={handleCloseModal}
          bubbleName={bubbleData.groupName}
          members={bubbleData.members}
        />
      )}
    </BubbleFormationContext.Provider>
  );
}

export const useBubbleFormation = () => {
  const context = useContext(BubbleFormationContext);
  if (context === undefined) {
    throw new Error("useBubbleFormation must be used within a BubbleFormationProvider");
  }
  return context;
};