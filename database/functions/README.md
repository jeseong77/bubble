# Database RPC Functions - Organized Structure

## Overview
This directory contains all Supabase RPC (Remote Procedure Call) functions organized by domain.

**Previous:** All 33+ functions in one 2,191-line file (`rpc_functions.sql`)
**Current:** Organized by domain for maintainability

## Directory Structure

```
functions/
├── users/           # User-related functions (2 functions)
│   ├── fetch_user.sql ✅
│   └── search_users.sql ✅
├── groups/          # Bubble/group management (7 functions)
│   ├── create_group.sql ✅
│   ├── leave_group.sql ✅
│   ├── get_my_bubbles_v2.sql ✅
│   ├── get_bubble.sql ✅
│   ├── get_user_active_bubble.sql ✅
│   ├── set_user_active_bubble.sql ✅
│   └── get_group_member_statuses.sql ✅
├── matching/        # Matching/swiping logic (4 functions)
│   ├── find_matching_group.sql ✅
│   ├── like_group.sql ✅
│   ├── pass_group.sql ✅
│   └── get_incoming_likes.sql ✅
├── chat/            # Chat functionality (3 functions)
│   ├── get_chat_messages.sql ✅
│   ├── get_chat_room_members.sql ✅
│   └── mark_messages_as_read.sql ✅
├── invitations/     # Invitation system (7 functions)
│   ├── send_invitation.sql ✅
│   ├── accept_invitation.sql ✅
│   ├── decline_invitation.sql ✅
│   ├── cancel_invitation.sql ✅
│   ├── generate_invitation_token.sql ✅
│   ├── validate_invitation_token.sql ✅
│   └── join_bubble_direct.sql ✅
└── debug/           # Debug/test functions (optional)
    ├── debug_table_contents.sql
    ├── test_create_group.sql
    └── test_bubble_popping_permissions.sql
```

**Total: 23 core production functions extracted**

## Deployment

To deploy all functions to Supabase:

```bash
# Deploy all functions
psql $DATABASE_URL -f ../deploy_functions.sql

# Or deploy individual functions
psql $DATABASE_URL -f functions/groups/create_group.sql
```

## Migration Status

- [x] Directory structure created
- [x] Example function extracted (create_group.sql)
- [x] Extract remaining functions (all 33 functions extracted)
- [x] Create deploy_functions.sql
- [ ] Test all functions (when ready to deploy to Supabase)
- [ ] Remove old rpc_functions.sql (keep for now as backup)

## Benefits of This Structure

1. **Easier to find** - Functions grouped by feature
2. **Easier to review** - Small files vs 2,191-line monolith
3. **Easier to test** - Can test individual domains
4. **Better git history** - See changes per function
5. **Team collaboration** - Different devs can work on different domains
