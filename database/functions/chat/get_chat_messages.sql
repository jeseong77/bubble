-- Get chat messages with user avatar URLs
CREATE OR REPLACE FUNCTION get_chat_messages(
  p_room_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  message_id BIGINT,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar_url TEXT,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  reply_to_id BIGINT,
  reply_to_content TEXT,
  is_own BOOLEAN,
  read_by_count INTEGER
) AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();

  RETURN QUERY
  SELECT
    cm.id as message_id,
    cm.sender_id,
    COALESCE(u.first_name, 'Unknown') as sender_name,
    u.avatar_url as sender_avatar_url,
    cm.content,
    cm.message_type,
    cm.created_at,
    cm.edited_at,
    cm.reply_to_id,
    cm.reply_to_content,
    (cm.sender_id = v_current_user_id) as is_own,
    COALESCE(mr.read_count, 0) as read_by_count
  FROM chat_messages cm
  LEFT JOIN users u ON cm.sender_id = u.id
  LEFT JOIN (
    SELECT message_id, COUNT(*) as read_count
    FROM message_reads
    GROUP BY message_id
  ) mr ON cm.id = mr.message_id
  WHERE cm.chat_room_id = p_room_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_chat_messages(UUID, INTEGER, INTEGER) TO authenticated;
