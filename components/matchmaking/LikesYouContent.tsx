import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from './MatchCard';
import { GroupMember } from '@/hooks/useLikesYou';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const centerBubbleDiameter = Math.min(screenWidth * 1.12, screenHeight * 0.62);

interface LikesYouContentProps {
  currentGroup: any;
  animatedBubbleStyle: any;
  isAnimating: boolean;
  isLoadingMore: boolean;
  handleSwipe: (direction: 'left' | 'right') => void;
  handleUserClick: (user: GroupMember) => void;
}

export const LikesYouContent: React.FC<LikesYouContentProps> = ({
  currentGroup,
  animatedBubbleStyle,
  isAnimating,
  isLoadingMore,
  handleSwipe,
  handleUserClick,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* MatchCard for the current group */}
      <Animated.View
        style={[
          styles.centerBubbleWrap,
          {
            top: screenHeight * 0.17 + insets.top,
            left: (screenWidth - centerBubbleDiameter) / 2,
            width: centerBubbleDiameter,
            height: centerBubbleDiameter,
          },
          animatedBubbleStyle,
        ]}
      >
        <MatchCard group={currentGroup} onUserPress={handleUserClick} />
      </Animated.View>

      {/* Swipe Controls */}
      <View style={styles.swipeControls}>
        <TouchableOpacity
          style={styles.xButton}
          onPress={() => handleSwipe('left')}
          disabled={isAnimating}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Feather name="x" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkButton}
          onPress={() => handleSwipe('right')}
          disabled={isAnimating}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Feather name="heart" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <View style={styles.loadingMoreContainer}>
          <View style={styles.loadingMoreIndicator}>
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  centerBubbleWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  swipeControls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    zIndex: 100,
    pointerEvents: 'box-none',
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
    elevation: 5,
    zIndex: 101,
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
    elevation: 5,
    zIndex: 101,
  },
  loadingMoreContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingMoreIndicator: {
    backgroundColor: '#8ec3ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  loadingMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
