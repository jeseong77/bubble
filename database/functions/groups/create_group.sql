-- Create a new group/bubble
-- Used when a user creates a new bubble
CREATE OR REPLACE FUNCTION create_group(p_creator_id UUID, p_max_size INTEGER, p_group_name TEXT, p_preferred_gender TEXT)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  creator_gender TEXT;
BEGIN
  -- Get creator's gender for group_gender setting
  SELECT gender INTO creator_gender FROM users WHERE id = p_creator_id;

  -- Raise detailed error if user not found
  IF creator_gender IS NULL THEN
    RAISE EXCEPTION 'User with ID % not found in users table', p_creator_id;
  END IF;

  -- Validate user gender (unified system - no backward compatibility)
  IF creator_gender NOT IN ('man', 'woman', 'nonbinary', 'everyone') THEN
    RAISE EXCEPTION 'Invalid gender value: %. Expected man, woman, nonbinary, or everyone', creator_gender;
  END IF;

  IF p_preferred_gender NOT IN ('man', 'woman', 'nonbinary', 'everyone') THEN
    RAISE EXCEPTION 'Invalid preferred_gender value: %. Expected man, woman, nonbinary, or everyone', p_preferred_gender;
  END IF;

  -- Create the group with proper creator_id column, group_gender, and current_num_users = 1
  INSERT INTO groups (name, max_size, preferred_gender, creator_id, group_gender, current_num_users)
  VALUES (p_group_name, p_max_size, p_preferred_gender, p_creator_id, creator_gender, 1)
  RETURNING id INTO new_group_id;

  -- Raise detailed error if group creation failed
  IF new_group_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create group - INSERT returned NULL';
  END IF;

  -- Add creator as a joined member with proper timestamp
  INSERT INTO group_members (group_id, user_id, status, joined_at)
  VALUES (new_group_id, p_creator_id, 'joined', NOW());

  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql;
