import React from "react";
import { View, Text, StyleSheet, ActivityIndicator , TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Finding matches...",
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8ec3ff" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <View style={styles.container}>
      <Feather name="alert-circle" size={48} color="#ff6b6b" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

interface EmptyStateProps {
  message?: string;
  onRefresh?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = "Someone awesome will like you soon!",
  onRefresh,
}) => {
  return (
    <View style={styles.container}>
      <Feather name="heart" size={48} color="#8ec3ff" />
      <Text style={styles.emptyTitle}>No likes yet.</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface NoGroupStateProps {
  onCreateGroup: () => void;
}

export const NoGroupState: React.FC<NoGroupStateProps> = ({
  onCreateGroup,
}) => {
  return (
    <View style={styles.container}>
      <Feather name="users" size={48} color="#8ec3ff" />
      <Text style={styles.emptyTitle}>No Active Group</Text>
      <Text style={styles.emptyMessage}>
        You need to be part of a complete group to start matching
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={onCreateGroup}>
        <Text style={styles.createButtonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );
};

export const NoMoreGroupsState: React.FC = () => {
  return (
    <View style={styles.noMoreGroupsContainer}>
      <Text style={styles.noMoreGroupsMessage}>No more groups available</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  message: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#8ec3ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "#8ec3ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#5A99E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noMoreGroupsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  noMoreGroupsMessage: {
    fontSize: 18,
    color: "#303030",
    fontWeight: "500",
    textAlign: "center",
  },
});
