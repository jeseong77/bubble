import React, { createContext, useContext, ReactNode } from "react";
// [Change 1] Import LikeResponse type along with useMatchmaking hook.
import {
  useMatchmaking,
  MatchingGroup,
  LikeResponse,
  PassResponse,
  SwipeLimitInfo,
} from "@/hooks/useMatchmaking";

interface MatchmakingContextType {
  matchingGroups: MatchingGroup[];
  currentUserGroup: string | null;
  currentUserGroupStatus: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  // [Change 2] Change likeGroup function return type from boolean to new response type.
  likeGroup: (targetGroupId: string) => Promise<LikeResponse | null>;
  passGroup: (targetGroupId: string) => Promise<PassResponse | null>;
  loadMore: () => Promise<void>;
  refetch: () => void;
  refreshAll: () => Promise<void>;
  // Daily swipe limit properties
  swipeLimitInfo: SwipeLimitInfo | null;
  isLoadingSwipeLimit: boolean;
  checkSwipeLimit: (groupId?: string) => Promise<SwipeLimitInfo | null>;
}

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(
  undefined
);

interface MatchmakingProviderProps {
  children: ReactNode;
}

export const MatchmakingProvider: React.FC<MatchmakingProviderProps> = ({
  children,
}) => {
  const matchmakingData = useMatchmaking();

  return (
    <MatchmakingContext.Provider value={matchmakingData}>
      {children}
    </MatchmakingContext.Provider>
  );
};

export const useMatchmakingContext = () => {
  const context = useContext(MatchmakingContext);
  if (context === undefined) {
    throw new Error(
      "useMatchmakingContext must be used within a MatchmakingProvider"
    );
  }
  return context;
};
