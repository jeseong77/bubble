import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface BubbleMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status?: 'invited' | 'joined' | 'declined';
}

interface BubbleMemberLayoutProps {
  bubbleMemberCount: number;
  bubbleMembers: BubbleMember[];
  creatorSignedUrl: string | null;
  memberSignedUrls: { [key: string]: string };
  groupId: string;
}

export const BubbleMemberLayout: React.FC<BubbleMemberLayoutProps> = ({
  bubbleMemberCount,
  bubbleMembers,
  creatorSignedUrl,
  memberSignedUrls,
  groupId,
}) => {
  const router = useRouter();

  const navigateToSearch = () => {
    router.push({
      pathname: '/search',
      params: { groupId },
    });
  };

  const renderCreatorName = () => {
    if (bubbleMembers[0]?.first_name && bubbleMembers[0]?.last_name) {
      return `${bubbleMembers[0].first_name} ${bubbleMembers[0].last_name}`;
    }
    return bubbleMembers[0]?.first_name || 'Me';
  };

  const renderCreatorAvatar = (imageStyle: any) => {
    if (creatorSignedUrl) {
      return <Image source={{ uri: creatorSignedUrl }} style={imageStyle} />;
    }
    return (
      <View style={[imageStyle, styles.placeholderImage]}>
        <Feather name="user" size={imageStyle.width ? imageStyle.width * 0.4 : 40} color="#999" />
      </View>
    );
  };

  const renderMemberSlot = (
    member: BubbleMember | undefined,
    slotStyle: any,
    nameStyle: any,
    imageStyle: any,
    plusSize: number
  ) => {
    if (member) {
      return (
        <View style={slotStyle}>
          <Text style={nameStyle}>{member.first_name || 'Member'}</Text>
          <Image
            source={{ uri: memberSignedUrls[member.id] || member.avatar_url || undefined }}
            style={imageStyle}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity style={slotStyle} onPress={navigateToSearch}>
        <View style={[imageStyle, { backgroundColor: '#D9D9D9' }]}>
          <Feather name="plus" size={plusSize} color="#5A99E5" />
        </View>
      </TouchableOpacity>
    );
  };

  if (bubbleMemberCount === 2) {
    // Size 2: Overlapping circles layout
    return (
      <View style={styles.membersContainer}>
        <View style={styles.memberWithName}>
          <Text style={styles.creatorName}>{renderCreatorName()}</Text>
          <View style={styles.memberCircle}>
            {renderCreatorAvatar(styles.memberImage)}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addMemberCircle, styles.overlappingCircle]}
          onPress={navigateToSearch}
        >
          <Feather name="plus" size={40} color="#5A99E5" />
        </TouchableOpacity>
      </View>
    );
  }

  if (bubbleMemberCount === 3) {
    // Size 3: Triangle layout - 1 on top, 2 on bottom
    return (
      <View style={styles.triangleContainer}>
        {/* Top member (creator) */}
        <View style={styles.triangleTop}>
          <Text style={styles.creatorName}>{renderCreatorName()}</Text>
          <View style={styles.memberCircle}>
            {renderCreatorAvatar(styles.triangleMemberImage)}
          </View>
        </View>

        {/* Bottom row - 2 members */}
        <View style={styles.triangleBottom}>
          {renderMemberSlot(
            bubbleMembers[1],
            styles.triangleMemberSlot,
            styles.triangleMemberName,
            styles.triangleMemberImage,
            35
          )}
          {renderMemberSlot(
            bubbleMembers[2],
            styles.triangleMemberSlot,
            styles.triangleMemberName,
            styles.triangleMemberImage,
            35
          )}
        </View>
      </View>
    );
  }

  // Size 4: Diamond/Square layout - 2x2 arrangement
  return (
    <View style={styles.diamondContainer}>
      {/* Top row */}
      <View style={styles.diamondRow}>
        {/* Creator (top-left) */}
        <View style={styles.diamondMemberSlot}>
          <Text style={styles.diamondMemberName}>{renderCreatorName()}</Text>
          <View style={styles.memberCircle}>
            {renderCreatorAvatar(styles.diamondMemberImage)}
          </View>
        </View>

        {renderMemberSlot(
          bubbleMembers[1],
          styles.diamondMemberSlot,
          styles.diamondMemberName,
          styles.diamondMemberImage,
          30
        )}
      </View>

      {/* Bottom row */}
      <View style={styles.diamondRow}>
        {renderMemberSlot(
          bubbleMembers[2],
          styles.diamondMemberSlot,
          styles.diamondMemberName,
          styles.diamondMemberImage,
          30
        )}
        {renderMemberSlot(
          bubbleMembers[3],
          styles.diamondMemberSlot,
          styles.diamondMemberName,
          styles.diamondMemberImage,
          30
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  creatorName: {
    fontSize: 20,
    fontFamily: 'Quicksand-Bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 60,
    justifyContent: 'center',
  },
  memberWithName: {
    alignItems: 'center',
    zIndex: 2,
  },
  memberCircle: {
    zIndex: 2,
  },
  memberImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#eee',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMemberCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#eee',
  },
  overlappingCircle: {
    marginLeft: -40,
    zIndex: 1,
  },

  // Triangle layout styles (Size 3)
  triangleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  triangleTop: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 2,
  },
  triangleBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 260,
    zIndex: 1,
  },
  triangleMemberSlot: {
    alignItems: 'center',
  },
  triangleMemberName: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  triangleMemberImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Diamond layout styles (Size 4)
  diamondContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  diamondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    marginBottom: 20,
  },
  diamondMemberSlot: {
    alignItems: 'center',
  },
  diamondMemberName: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  diamondMemberImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
