import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Skeleton } from '@/components/feedback/SkeletonLoader';

interface BubbleMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status?: 'invited' | 'joined' | 'declined';
}

interface BubbleMemberSlotProps {
  index: number;
  bubbleMemberCount: number;
  isExisting: boolean;
  member: BubbleMember | null;
  isCreator: boolean;
  bubbleMembers: BubbleMember[];
  creatorSignedUrl: string | null;
  memberSignedUrls: { [key: string]: string };
  bubbleSize: number;
  overlapOffset: number;
  groupId: string;
  isLoading: boolean;
  isMembersLoading: boolean;
}

export const BubbleMemberSlot: React.FC<BubbleMemberSlotProps> = ({
  index,
  bubbleMemberCount,
  isExisting,
  member,
  isCreator,
  bubbleMembers,
  creatorSignedUrl,
  memberSignedUrls,
  bubbleSize,
  overlapOffset,
  groupId,
  isLoading,
  isMembersLoading,
}) => {
  const router = useRouter();

  const navigateToSearch = () => {
    router.push({
      pathname: '/search',
      params: { groupId },
    });
  };

  const renderContent = () => {
    if (isCreator) {
      // Display creator (first slot of new bubble)
      return (
        <View style={styles.bubbleContent}>
          {isLoading || isMembersLoading ? (
            <>
              <Skeleton.Box width={60} height={20} style={{ marginBottom: 12 }} />
              <Skeleton.Circle size={bubbleSize} style={styles.bubbleImage} />
            </>
          ) : (
            <>
              <Text style={[styles.nameText, { marginBottom: 12 }]}>
                {bubbleMembers[0]?.first_name || 'Me'}
              </Text>
              {creatorSignedUrl ? (
                <Image
                  source={{ uri: creatorSignedUrl }}
                  style={[
                    styles.bubbleImage,
                    {
                      width: bubbleSize,
                      height: bubbleSize,
                      borderRadius: bubbleSize / 2,
                      marginBottom: 0,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.bubbleImage,
                    {
                      width: bubbleSize,
                      height: bubbleSize,
                      borderRadius: bubbleSize / 2,
                      marginBottom: 0,
                      backgroundColor: '#e0e0e0',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Feather name="user" size={bubbleSize * 0.4} color="#999" />
                </View>
              )}
            </>
          )}
        </View>
      );
    }

    if (isExisting && member) {
      // Display existing member
      return (
        <View style={styles.bubbleContent}>
          {isMembersLoading ? (
            <>
              <Skeleton.Box width={60} height={20} style={{ marginBottom: 12 }} />
              <Skeleton.Circle size={bubbleSize} style={styles.bubbleImage} />
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.nameText,
                  {
                    marginBottom: 12,
                    color: member.status === 'invited' ? '#D9D9D9' : '#222',
                  },
                ]}
              >
                {member.first_name || 'Member'}
              </Text>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{
                    uri: memberSignedUrls[member.id] || member.avatar_url || undefined,
                  }}
                  style={[
                    styles.bubbleImage,
                    {
                      width: bubbleSize,
                      height: bubbleSize,
                      borderRadius: bubbleSize / 2,
                      marginBottom: 0,
                      opacity: member.status === 'invited' ? 0.6 : 1,
                    },
                  ]}
                />
                {member.status === 'invited' && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="more-horizontal" size={32} color="#999" />
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      );
    }

    if (isExisting) {
      // Empty slot for existing bubble (when no member)
      return (
        <View style={styles.bubbleContent}>
          {isLoading ? (
            <>
              <Skeleton.Box width={80} height={20} style={{ marginBottom: 12 }} />
              <Skeleton.Circle size={bubbleSize} style={styles.emptyBubble} />
            </>
          ) : (
            <TouchableOpacity
              onPress={navigateToSearch}
              activeOpacity={0.7}
              style={styles.bubbleContent}
            >
              <Text style={[styles.nameText, { marginBottom: 12, color: '#80B7FF' }]}>
                Add Member
              </Text>
              <View
                style={[
                  styles.emptyBubble,
                  {
                    width: bubbleSize,
                    height: bubbleSize,
                    borderRadius: bubbleSize / 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#D9D9D9',
                  },
                ]}
              >
                <Feather name="plus" size={32} color="#80B7FF" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Invitation slot for new bubble
    return (
      <TouchableOpacity
        onPress={navigateToSearch}
        activeOpacity={0.7}
        style={styles.bubbleContent}
      >
        <Text style={[styles.nameText, { marginBottom: 12, color: '#80B7FF' }]}>
          Invite Friend
        </Text>
        <View
          style={[
            styles.emptyBubble,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: bubbleSize / 2,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#D9D9D9',
            },
          ]}
        >
          <Feather name="plus" size={32} color="#80B7FF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      key={index}
      style={[
        styles.bubbleContainer,
        {
          position: 'absolute',
          left: index * overlapOffset,
          top: 0,
          zIndex: bubbleMemberCount - index,
          alignItems: 'center',
        },
      ]}
    >
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleImage: {
    borderWidth: 2,
    borderColor: '#eee',
  },
  nameText: {
    fontSize: 20,
    fontFamily: 'Quicksand-Bold',
    color: '#222',
    marginTop: 4,
    fontWeight: '600',
  },
  emptyBubble: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
});
