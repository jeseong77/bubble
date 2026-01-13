-- Mark messages as read in a chat room
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_room_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();

  -- Mark unread messages as read for this user
  INSERT INTO message_reads (message_id, user_id, read_at)
  SELECT cm.id, v_current_user_id, NOW()
  FROM chat_messages cm
  WHERE cm.chat_room_id = p_room_id
    AND cm.sender_id != v_current_user_id  -- Don't mark own messages
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr
      WHERE mr.message_id = cm.id AND mr.user_id = v_current_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID) TO authenticated;
