import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import styled from '@emotion/native';

interface ChatMessage {
  message_id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar_url?: string;
  content: string;
  created_at: string;
  is_own: boolean;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  prevMessage: ChatMessage | null;
  nextMessage: ChatMessage | null;
  onUserPress: (senderId: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  prevMessage,
  nextMessage,
  onUserPress,
}) => {
  // Check if this message should show profile/name (first in group)
  const isFirstInGroup = !prevMessage ||
    prevMessage.sender_id !== message.sender_id ||
    new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !==
    new Date(prevMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check if this message should show timestamp (last in group)
  const isLastInGroup = !nextMessage ||
    nextMessage.sender_id !== message.sender_id ||
    new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !==
    new Date(nextMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <MessageContainer isOwn={message.is_own} isGrouped={!isFirstInGroup}>
      {!message.is_own && isFirstInGroup && (
        <MessageHeader>
          <SenderName>{message.sender_name}</SenderName>
        </MessageHeader>
      )}
      <MessageRow isOwn={message.is_own} isGrouped={!isFirstInGroup}>
        {!message.is_own && isFirstInGroup && (
          <TouchableOpacity onPress={() => onUserPress(message.sender_id)}>
            <UserAvatar>
              {message.sender_avatar_url ? (
                <Image
                  source={{ uri: message.sender_avatar_url }}
                  style={{
                    width: 41,
                    height: 41,
                    borderRadius: 20.5
                  }}
                />
              ) : (
                <AvatarText>{message.sender_name?.charAt(0) || 'U'}</AvatarText>
              )}
            </UserAvatar>
          </TouchableOpacity>
        )}
        {message.is_own && isLastInGroup && (
          <MessageTime isOwn={message.is_own}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </MessageTime>
        )}
        <MessageBubble isOwn={message.is_own}>
          <MessageContent>
            <MessageText isOwn={message.is_own}>{message.content}</MessageText>
          </MessageContent>
        </MessageBubble>
        {!message.is_own && isLastInGroup && (
          <MessageTime isOwn={message.is_own}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </MessageTime>
        )}
      </MessageRow>
    </MessageContainer>
  );
};

// Styled Components
const MessageContainer = styled.View<{ isOwn: boolean; isGrouped: boolean }>`
  margin-bottom: ${(props) => (props.isGrouped ? '2px' : '12px')};
  padding-horizontal: 16px;
`;

const MessageHeader = styled.View`
  margin-bottom: 4px;
  margin-left: 50px;
`;

const SenderName = styled.Text`
  font-size: 12px;
  font-weight: 500;
  color: #666;
`;

const MessageRow = styled.View<{ isOwn: boolean; isGrouped: boolean }>`
  flex-direction: row;
  align-items: flex-end;
  justify-content: ${(props) => (props.isOwn ? 'flex-end' : 'flex-start')};
  gap: 8px;
`;

const UserAvatar = styled.View`
  width: 41px;
  height: 41px;
  border-radius: 20.5px;
  background-color: #e0e0e0;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const AvatarText = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: #666;
`;

const MessageBubble = styled.View<{ isOwn: boolean }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background-color: ${(props) => (props.isOwn ? '#007AFF' : '#F0F0F0')};
`;

const MessageContent = styled.View`
  flex-direction: column;
`;

const MessageText = styled.Text<{ isOwn: boolean }>`
  font-size: 16px;
  line-height: 22px;
  color: ${(props) => (props.isOwn ? '#FFFFFF' : '#000000')};
`;

const MessageTime = styled.Text<{ isOwn: boolean }>`
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
`;
