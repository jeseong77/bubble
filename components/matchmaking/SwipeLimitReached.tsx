import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const SwipeLimitReached: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Message Display */}
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          You've used all your swipes for today.{'\n'}
          Please wait for new Bubbles tomorrow!
        </Text>
      </View>

      {/* Disabled Swipe Controls */}
      <View style={styles.swipeControls}>
        <TouchableOpacity
          style={[styles.xButton, styles.disabledButton]}
          disabled={true}
        >
          <Feather name="x" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.checkButton, styles.disabledButton]}
          disabled={true}
        >
          <Feather name="heart" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    fontSize: 18,
    fontWeight: '500',
    color: '#303030',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 60,
  },
  swipeControls: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  xButton: {
    backgroundColor: '#8ec3ff',
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkButton: {
    backgroundColor: '#8ec3ff',
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.4,
  },
});
