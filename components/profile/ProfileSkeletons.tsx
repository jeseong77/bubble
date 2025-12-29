import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Skeleton } from '@/components/feedback/SkeletonLoader';

const NUM_COLUMNS = 3;
const MAX_IMAGES_DEFAULT = 6;

export const SkeletonImageGrid = () => {
  const screenWidth = Dimensions.get('window').width;
  const contentPaddingHorizontal = 20;
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize = (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  return (
    <View style={styles.skeletonImageGrid}>
      {Array.from({ length: MAX_IMAGES_DEFAULT }).map((_, index) => (
        <View
          key={index}
          style={[styles.skeletonImageSlot, { width: itemSize, height: itemSize }]}
        >
          <Skeleton.Box width="100%" height="100%" style={{ borderRadius: 12 }} />
        </View>
      ))}
    </View>
  );
};

export const SkeletonProfileDetails = () => {
  return (
    <View style={styles.skeletonProfileDetails}>
      {Array.from({ length: 7 }).map((_, index) => (
        <View key={index} style={styles.skeletonDetailItem}>
          <Skeleton.Box width={80} height={14} style={{ marginBottom: 8 }} />
          <Skeleton.Box width="100%" height={20} />
        </View>
      ))}
      <Skeleton.Box width="100%" height={50} style={{ marginTop: 30, borderRadius: 25 }} />
    </View>
  );
};

export const SkeletonBubbleItem = () => {
  return (
    <View style={styles.skeletonBubbleItem}>
      <View style={styles.skeletonBubbleContent}>
        <View style={styles.skeletonBubbleAvatars}>
          <Skeleton.Circle size={40} />
          <Skeleton.Circle size={40} style={{ marginLeft: -10 }} />
        </View>
        <View style={styles.skeletonBubbleText}>
          <Skeleton.Box width={120} height={16} style={{ marginBottom: 4 }} />
          <Skeleton.Box width={80} height={12} />
        </View>
      </View>
      <Skeleton.Box width={24} height={24} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 20,
    gap: 10,
  },
  skeletonImageSlot: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonProfileDetails: {
    paddingTop: 30,
  },
  skeletonDetailItem: {
    marginBottom: 20,
    paddingBottom: 10,
  },
  skeletonBubbleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
    borderRadius: 10,
  },
  skeletonBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  skeletonBubbleAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonBubbleText: {
    marginLeft: 15,
  },
});
