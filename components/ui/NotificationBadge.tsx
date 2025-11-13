import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  size = 18 
}) => {
  // Don't render if count is 0 or negative
  if (count <= 0) {
    return null;
  }

  // Show "99+" for counts over 99
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.badgeText, { fontSize: size * 0.6 }]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#80B7FF', // Primary light blue color
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 18,
    position: 'absolute',
    top: -8,
    right: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});