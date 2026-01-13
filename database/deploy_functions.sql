-- Deploy all database RPC functions in correct order
-- Run this file to deploy all functions to Supabase

-- Users (no dependencies)
\i functions/users/fetch_user.sql
\i functions/users/search_users.sql

-- Groups (depends on users)
\i functions/groups/create_group.sql
\i functions/groups/leave_group.sql
\i functions/groups/get_my_bubbles_v2.sql
\i functions/groups/get_bubble.sql
\i functions/groups/get_user_active_bubble.sql
\i functions/groups/set_user_active_bubble.sql
\i functions/groups/get_group_member_statuses.sql

-- Matching (depends on groups)
\i functions/matching/find_matching_group.sql
\i functions/matching/like_group.sql
\i functions/matching/pass_group.sql
\i functions/matching/get_incoming_likes.sql

-- Invitations (depends on groups)
\i functions/invitations/send_invitation.sql
\i functions/invitations/accept_invitation.sql
\i functions/invitations/decline_invitation.sql
\i functions/invitations/cancel_invitation.sql
\i functions/invitations/generate_invitation_token.sql
\i functions/invitations/validate_invitation_token.sql
\i functions/invitations/join_bubble_direct.sql

-- Chat (depends on groups)
\i functions/chat/get_chat_messages.sql
\i functions/chat/get_chat_room_members.sql
\i functions/chat/mark_messages_as_read.sql

-- Debug/Test functions (optional, development only)
-- \i functions/debug/debug_table_contents.sql
-- \i functions/debug/test_create_group.sql
-- \i functions/debug/test_bubble_popping_permissions.sql
