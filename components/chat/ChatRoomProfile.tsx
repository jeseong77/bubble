import React from 'react';
import { View, Text, Image, ScrollView, Dimensions } from 'react-native';
import styled from '@emotion/native';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  bio: string;
  images: Array<{ id: string; image_url: string; position: number }>;
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
  
  // Determine grid layout based on total members
  const getGridConfig = (memberCount: number) => {
    if (memberCount <= 4) {
      return { columns: 2, rows: 2, gridSize: '2x2', imageSize: 90 };
    } else if (memberCount <= 6) {
      return { columns: 3, rows: 2, gridSize: '3x2', imageSize: 80 };
    } else {
      return { columns: 4, rows: 2, gridSize: '4x2', imageSize: 70 };
    }
  };

  const gridConfig = getGridConfig(totalMembers);
  const itemWidth = (screenWidth - 40) / gridConfig.columns; // 40px for padding and gaps

  const renderMemberCard = (member: Member, index: number) => {
    return (
      <MemberCard key={member.id} itemWidth={itemWidth}>
        <ProfileImageContainer>
          {member.primary_image ? (
            <ProfileImage 
              source={{ uri: member.primary_image }} 
              imageSize={gridConfig.imageSize}
            />
          ) : (
            <PlaceholderImage imageSize={gridConfig.imageSize}>
              <PlaceholderText imageSize={gridConfig.imageSize}>
                {member.first_name.charAt(0)}
              </PlaceholderText>
            </PlaceholderImage>
          )}
        </ProfileImageContainer>
        <MemberInfo>
          <MemberName numberOfLines={1} fontSize={gridConfig.imageSize >= 80 ? 16 : 14}>
            {member.first_name} {member.last_name.charAt(0)}.
          </MemberName>
          <MemberAge fontSize={gridConfig.imageSize >= 80 ? 14 : 12}>{member.age}</MemberAge>
        </MemberInfo>
      </MemberCard>
    );
  };

  return (
    <Container>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <GridContainer>
          <MembersGrid columns={gridConfig.columns}>
            {allMembers.map((member, index) => renderMemberCard(member, index))}
          </MembersGrid>
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
  padding: 20px;
  justify-content: center;
`;

const MembersGrid = styled.View<{ columns: number }>`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
`;

const MemberCard = styled.View<{ itemWidth: number }>`
  width: ${props => props.itemWidth}px;
  margin-bottom: 24px;
  align-items: center;
  padding: 0 4px;
`;

const ProfileImageContainer = styled.View`
  position: relative;
  margin-bottom: 8px;
`;

const ProfileImage = styled.Image<{ imageSize: number }>`
  width: ${props => props.imageSize}px;
  height: ${props => props.imageSize}px;
  border-radius: ${props => props.imageSize / 2}px;
  background-color: #F4F4F4;
`;

const PlaceholderImage = styled.View<{ imageSize: number }>`
  width: ${props => props.imageSize}px;
  height: ${props => props.imageSize}px;
  border-radius: ${props => props.imageSize / 2}px;
  background-color: #CEE3FF;
  justify-content: center;
  align-items: center;
`;

const PlaceholderText = styled.Text<{ imageSize: number }>`
  font-size: ${props => Math.max(props.imageSize * 0.35, 20)}px;
  font-weight: 600;
  color: #303030;
  font-family: Quicksand-SemiBold;
`;

const MemberInfo = styled.View`
  align-items: center;
`;

const MemberName = styled.Text<{ fontSize: number }>`
  font-size: ${props => props.fontSize}px;
  font-weight: 600;
  color: #303030;
  font-family: Quicksand-SemiBold;
  text-align: center;
  margin-bottom: 2px;
`;

const MemberAge = styled.Text<{ fontSize: number }>`
  font-size: ${props => props.fontSize}px;
  color: #7A7A7A;
  font-family: Quicksand-Regular;
`;

