-- Cancel invitation (Diagnostic Debug)
CREATE OR REPLACE FUNCTION cancel_invitation(p_group_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  deleted_count INTEGER;
  found_any INTEGER;
  found_exact INTEGER;
  found_string_comparison INTEGER;
  found_raw_text INTEGER;
  sample_record RECORD;
  all_users_in_table INTEGER;
BEGIN
  -- Basic info
  RAISE NOTICE '[RPC] === UUID DIAGNOSTIC DEBUG ===';
  RAISE NOTICE '[RPC] Received group_id: % (length: %)', p_group_id, LENGTH(p_group_id::text);
  RAISE NOTICE '[RPC] Received user_id: % (length: %)', p_user_id, LENGTH(p_user_id::text);

  -- Count total users in table
  SELECT COUNT(*) INTO all_users_in_table FROM group_members;
  RAISE NOTICE '[RPC] Total records in group_members table: %', all_users_in_table;

  -- Test 1: Standard UUID comparison
  SELECT COUNT(*) INTO found_any FROM group_members WHERE user_id = p_user_id;
  RAISE NOTICE '[RPC] Test 1 - Standard UUID comparison: % records found', found_any;

  -- Test 2: String comparison
  SELECT COUNT(*) INTO found_string_comparison FROM group_members WHERE user_id::text = p_user_id::text;
  RAISE NOTICE '[RPC] Test 2 - String comparison: % records found', found_string_comparison;

  -- Test 3: Raw text comparison (no casting)
  EXECUTE format('SELECT COUNT(*) FROM group_members WHERE user_id::text = %L', p_user_id::text) INTO found_raw_text;
  RAISE NOTICE '[RPC] Test 3 - Raw text comparison: % records found', found_raw_text;

  -- Test 4: Get actual record to compare UUIDs
  SELECT user_id, group_id, status INTO sample_record FROM group_members LIMIT 1;
  IF sample_record.user_id IS NOT NULL THEN
    RAISE NOTICE '[RPC] === ACTUAL DATABASE RECORD ===';
    RAISE NOTICE '[RPC] DB user_id: % (length: %)', sample_record.user_id, LENGTH(sample_record.user_id::text);
    RAISE NOTICE '[RPC] DB group_id: % (length: %)', sample_record.group_id, LENGTH(sample_record.group_id::text);
    RAISE NOTICE '[RPC] DB status: %', sample_record.status;
    RAISE NOTICE '[RPC] === RECEIVED PARAMETERS ===';
    RAISE NOTICE '[RPC] RX user_id: % (length: %)', p_user_id, LENGTH(p_user_id::text);
    RAISE NOTICE '[RPC] RX group_id: % (length: %)', p_group_id, LENGTH(p_group_id::text);
    RAISE NOTICE '[RPC] === DIRECT COMPARISON ===';
    RAISE NOTICE '[RPC] user_id match: %', (sample_record.user_id = p_user_id);
    RAISE NOTICE '[RPC] group_id match: %', (sample_record.group_id = p_group_id);
    RAISE NOTICE '[RPC] user_id string match: %', (sample_record.user_id::text = p_user_id::text);
    RAISE NOTICE '[RPC] group_id string match: %', (sample_record.group_id::text = p_group_id::text);
  END IF;

  -- Test 5: Check exact match with all methods
  SELECT COUNT(*) INTO found_exact FROM group_members WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'invited';
  RAISE NOTICE '[RPC] Test 5 - Exact match (UUID): % records found', found_exact;

  -- Test 6: Force string matching for exact record
  EXECUTE format('SELECT COUNT(*) FROM group_members WHERE group_id::text = %L AND user_id::text = %L AND status = %L',
    p_group_id::text, p_user_id::text, 'invited') INTO found_raw_text;
  RAISE NOTICE '[RPC] Test 6 - Exact match (string): % records found', found_raw_text;

  -- Actual delete attempt
  DELETE FROM group_members
  WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND status = 'invited';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '[RPC] Deletion result: % records deleted', deleted_count;

  -- Return diagnostic info
  RETURN json_build_object(
    'success', deleted_count > 0,
    'deleted_count', deleted_count,
    'total_records_in_table', all_users_in_table,
    'found_uuid_comparison', found_any,
    'found_string_comparison', found_string_comparison,
    'found_exact_uuid', found_exact,
    'found_exact_string', found_raw_text,
    'group_id_received', p_group_id::text,
    'user_id_received', p_user_id::text,
    'group_id_length', LENGTH(p_group_id::text),
    'user_id_length', LENGTH(p_user_id::text)
  );
END;
$$ LANGUAGE plpgsql;
