import React from 'react';
import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import styled from '@emotion/native';
import { useRouter } from 'expo-router';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  bio: string;
  images: { id: string; image_url: string; position: number }[];
  primary_image: string | null;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
}

interface ChatRoomProfileData {
  success: boolean;
  all_members: Member[];
  total_members: number;
  error?: string;
}

interface ChatRoomProfileProps {
  data: ChatRoomProfileData | null;
  isLoading: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const ChatRoomProfile: React.FC<ChatRoomProfileProps> = ({ data, isLoading }) => {
  const router = useRouter();
  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingText>Loading profiles...</LoadingText>
        </LoadingContainer>
      </Container>
    );
  }

  if (!data || !data.success) {
    return (
      <Container>
        <ErrorContainer>
          <ErrorText>Unable to load member profiles</ErrorText>
          {data?.error && <ErrorSubText>{data.error}</ErrorSubText>}
        </ErrorContainer>
      </Container>
    );
  }

  const allMembers = data.all_members || [];
  const totalMembers = allMembers.length;
  
  // Always use 2x2 grid with HUGE images like in the design
  const gridConfig = { columns: 2, rows: 2, gridSize: '2x2', imageSize: 150 };
  const containerPadding = 60;
  const itemGap = 20;
  const itemWidth = (screenWidth - containerPadding - itemGap) / 2;

  const handleUserPress = (userId: string) => {
    router.push(`/bubble/user/${userId}`);
  };

  const renderMemberCard = (member: Member, index: number) => {
    // Find the image at position 0
    const position0Image = member.images?.find(img => img.position === 0);
    const imageUrl = position0Image?.image_url;

    return (
      <MemberCard key={member.id}>
        <MemberInfo>
          <MemberName numberOfLines={1} style={{fontSize: 20}}>
            {member.first_name} {member.age}
          </MemberName>
        </MemberInfo>
        <ProfileImageContainer>
          <TouchableOpacity onPress={() => handleUserPress(member.id)}>
            <PlaceholderImage>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{
                    position: 'absolute',
                    width: 170,
                    height: 170,
                    borderRadius: 85
                  }}
                />
              ) : null}
            </PlaceholderImage>
          </TouchableOpacity>
        </ProfileImageContainer>
      </MemberCard>
    );
  };

  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < allMembers.length; i += 2) {
      const rowMembers = allMembers.slice(i, i + 2);
      rows.push(
        <GridRow key={i}>
          {rowMembers.map((member, index) => renderMemberCard(member, i + index))}
        </GridRow>
      );
    }
    return rows;
  };

  return (
    <Container>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <GridContainer>
          {renderGrid()}
        </GridContainer>
      </ScrollView>
    </Container>
  );
};

const Container = styled.View`
  flex: 1;
  background-color: #fff;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const LoadingText = styled.Text`
  font-size: 16px;
  color: #7A7A7A;
  font-family: Quicksand-Medium;
`;

const ErrorContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ErrorText = styled.Text`
  font-size: 16px;
  color: #EF4D24;
  font-family: Quicksand-SemiBold;
  text-align: center;
  margin-bottom: 8px;
`;

const ErrorSubText = styled.Text`
  font-size: 14px;
  color: #7A7A7A;
  font-family: Quicksand-Regular;
  text-align: center;
`;

const GridContainer = styled.View`
  flex: 1;
  padding: 30px;
  justify-content: center;
`;

const GridRow = styled.View`
  flex-direction: row;
  justify-content: center;
  margin-bottom: 40px;
  width: 100%;
  gap: 20px;
`;

const MemberCard = styled.View`
  align-items: center;
  flex: 1;
  max-width: 50%;
`;

const ProfileImageContainer = styled.View`
  position: relative;
  margin-top: 8px;
`;


const PlaceholderImage = styled.View`
  width: 170px;
  height: 170px;
  border-radius: 85px;
  background-color: #CEE3FF;
  justify-content: center;
  align-items: center;
`;

const MemberInfo = styled.View`
  align-items: center;
  margin-bottom: 8px;
`;

const MemberName = styled.Text`
  font-weight: normal;
  color: #303030;
  text-align: center;
  font-family: Quicksand-Medium;
`;

