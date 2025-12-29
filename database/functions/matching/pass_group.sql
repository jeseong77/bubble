-- Updated pass_group function with swipe limits
CREATE OR REPLACE FUNCTION pass_group(
  p_from_group_id UUID,
  p_to_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_swipe_limit_info JSON;
  v_can_swipe BOOLEAN;
  v_result JSON;
BEGIN
  -- Check daily swipe limit first
  SELECT check_daily_swipe_limit(p_from_group_id) INTO v_swipe_limit_info;
  v_can_swipe := (v_swipe_limit_info->>'can_swipe')::BOOLEAN;

  -- Return limit exceeded error if no swipes remaining
  IF NOT v_can_swipe THEN
    RETURN json_build_object(
      'status', 'limit_exceeded',
      'message', 'Daily swipe limit reached',
      'swipe_info', v_swipe_limit_info
    );
  END IF;

  -- Increment swipe count
  SELECT increment_daily_swipe_count(p_from_group_id) INTO v_swipe_limit_info;

  -- Insert pass record (create group_passes table if it doesn't exist)
  INSERT INTO group_passes (from_group_id, to_group_id)
  VALUES (p_from_group_id, p_to_group_id)
  ON CONFLICT (from_group_id, to_group_id) DO NOTHING;

  -- Return success with updated swipe info
  RETURN json_build_object(
    'status', 'passed',
    'swipe_info', v_swipe_limit_info
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION pass_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION pass_group(UUID, UUID) TO authenticated;
