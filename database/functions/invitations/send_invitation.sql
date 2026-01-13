-- Send invitation (Fixed schema mismatch)
CREATE OR REPLACE FUNCTION send_invitation(p_group_id UUID, p_invited_user_id UUID, p_invited_by_user_id UUID)
RETURNS JSON AS $$
DECLARE
  insert_success BOOLEAN := FALSE;
  conflict_occurred BOOLEAN := FALSE;
  verification_record RECORD;
  inserted_count INTEGER;
BEGIN
  -- Log parameters with detailed info
  RAISE NOTICE 'send_invitation called: group_id=%, invited_user_id=%, invited_by=%',
    p_group_id, p_invited_user_id, p_invited_by_user_id;

  -- Check if record already exists
  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_invited_user_id) THEN
    conflict_occurred := TRUE;
    RAISE NOTICE 'Record already exists for group_id=%, user_id=%', p_group_id, p_invited_user_id;
  ELSE
    -- Insert the invitation
    INSERT INTO group_members (group_id, user_id, status, invited_at)
    VALUES (p_group_id, p_invited_user_id, 'invited', NOW());

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'INSERT completed. Row count: %', inserted_count;

    -- Verify the record was actually inserted
    SELECT group_id, user_id, status, invited_at INTO verification_record
    FROM group_members
    WHERE group_id = p_group_id AND user_id = p_invited_user_id;

    IF verification_record.group_id IS NOT NULL THEN
      insert_success := TRUE;
      RAISE NOTICE 'Verification successful: Found record with status=%, invited_at=%',
        verification_record.status, verification_record.invited_at;
    ELSE
      insert_success := FALSE;
      RAISE NOTICE 'Verification failed: No record found after insert';
    END IF;
  END IF;

  RETURN json_build_object(
    'success', insert_success,
    'already_exists', conflict_occurred,
    'inserted_count', COALESCE(inserted_count, 0),
    'verification_status', CASE
      WHEN verification_record.group_id IS NOT NULL THEN verification_record.status
      ELSE NULL
    END,
    'parameters', json_build_object(
      'group_id', p_group_id,
      'invited_user_id', p_invited_user_id,
      'invited_by_user_id', p_invited_by_user_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Exception in send_invitation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'parameters', json_build_object(
        'group_id', p_group_id,
        'invited_user_id', p_invited_user_id,
        'invited_by_user_id', p_invited_by_user_id
      )
    );
END;
$$ LANGUAGE plpgsql;
