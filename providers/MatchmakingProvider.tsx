import React, { createContext, useContext, ReactNode } from "react";
// [수정 1] useMatchmaking 훅에서 LikeResponse 타입을 함께 import 합니다.
import {
  useMatchmaking,
  MatchingGroup,
  LikeResponse,
} from "@/hooks/useMatchmaking";

interface MatchmakingContextType {
  matchingGroups: MatchingGroup[];
  currentUserGroup: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  // [수정 2] likeGroup 함수의 반환 타입을 boolean에서 새로운 응답 타입으로 변경합니다.
  likeGroup: (targetGroupId: string) => Promise<LikeResponse | null>;
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
