import React, { createContext, useContext, ReactNode } from "react";
import { useMatchmaking, MatchingGroup } from "@/hooks/useMatchmaking";

interface MatchmakingContextType {
  matchingGroups: MatchingGroup[];
  currentUserGroup: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  likeGroup: (targetGroupId: string) => Promise<boolean>;
  passGroup: (targetGroupId: string) => void;
  loadMore: () => Promise<void>;
  refetch: () => void;
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
