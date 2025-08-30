# Daily Swipe Limits System

## Overview
This system implements daily swipe limits for group-based swiping, where each group can perform only 5 swipes per day (resets at midnight NYC time), with the swipe count shared among all group members.

## Features Implemented

### 1. Database Schema
- **`group_daily_swipes`** table: Tracks daily swipe counts per group
- **`group_passes`** table: Stores group pass records
- Proper indexing for performance
- Row Level Security (RLS) policies for data protection

### 2. RPC Functions
- **`check_daily_swipe_limit(p_group_id UUID)`**: Returns remaining swipes and limit info
- **`increment_daily_swipe_count(p_group_id UUID)`**: Increments swipe count and returns updated info
- **`like_group(p_from_group_id UUID, p_to_group_id UUID)`**: Updated with swipe limit checking
- **`pass_group(p_from_group_id UUID, p_to_group_id UUID)`**: Updated with swipe limit checking

### 3. Frontend Implementation
- **useMatchmaking Hook**: Added swipe limit state and functions
- **Main Swipe Screen**: Visual swipe counter and disabled state when limit reached
- **Error Handling**: Clear messaging when daily limit is exceeded
- **Real-time Updates**: Swipe counter updates immediately after each swipe

### 4. User Experience Features
- **Swipe Counter**: Shows "X/5 swipes remaining"
- **Visual Feedback**: Buttons are disabled and faded when no swipes left
- **Reset Timer**: Shows countdown to next reset (midnight NYC time)
- **Error Messages**: Clear alerts when trying to swipe with no swipes left
- **Shared Limits**: All group members share the same swipe count

## Technical Details

### Time Zone Handling
- All resets occur at midnight Eastern Time (America/New_York)
- Uses PostgreSQL's timezone-aware functions for accurate reset calculation

### Group-Based Logic
- Swipe limits are tied to groups, not individual users
- If user A in group AB uses 3 swipes, user B only has 2 swipes remaining
- When groups are destroyed ("popped"), their swipe history remains until the next reset

### API Response Format
```typescript
// Like/Pass responses now include swipe info
{
  status: "liked" | "matched" | "passed" | "limit_exceeded" | "error",
  message?: string,
  swipe_info?: {
    remaining_swipes: number,
    used_swipes: number,
    daily_limit: number,
    can_swipe: boolean,
    reset_time: string, // ISO timestamp
    limit_reached?: boolean
  },
  chat_room_id?: string, // For matches
  match_id?: string      // For matches
}
```

## Files Modified/Created

### Database Files
- `database/daily_swipe_limits.sql` - New table and RPC functions
- `database/rpc_functions.sql` - Updated like_group and pass_group functions

### Frontend Files  
- `hooks/useMatchmaking.ts` - Added swipe limit logic and state
- `providers/MatchmakingProvider.tsx` - Added swipe limit types and context
- `app/(tabs)/index.tsx` - Added UI counter and limit handling

## Testing the Implementation

### 1. Database Setup
Run the following SQL files in Supabase:
```sql
-- First, create the tables and functions
\i database/daily_swipe_limits.sql

-- Then update the main RPC functions (this will override existing functions)
\i database/rpc_functions.sql
```

### 2. Frontend Testing Steps

1. **Initial Load**: 
   - Check that swipe counter shows "5/5 swipes remaining"
   - Verify buttons are enabled

2. **Swipe Testing**:
   - Perform 1-2 swipes (like or pass)
   - Verify counter updates to "4/5" then "3/5"
   - Check that swipe info updates immediately

3. **Limit Testing**:
   - Use all 5 swipes
   - Verify counter shows "0/5 swipes remaining"  
   - Verify buttons become disabled and faded
   - Try to swipe - should show "Daily Limit Reached" alert

4. **Reset Time Testing**:
   - When limit reached, verify reset timer shows correct countdown
   - Format should be "Resets in Xh Ym" or "Resets in Ym"

5. **Group Sharing Testing**:
   - Have different group members test swiping
   - Verify they share the same swipe count
   - One member's swipes should reduce the count for all members

### 3. Manual Database Testing
```sql
-- Check current swipe status for a group
SELECT check_daily_swipe_limit('your-group-id-here');

-- Manually reset a group's daily swipes (for testing)
DELETE FROM group_daily_swipes WHERE group_id = 'your-group-id-here';

-- View all daily swipe records
SELECT * FROM group_daily_swipes ORDER BY swipe_date DESC, updated_at DESC;
```

### 4. Edge Cases to Test

1. **Timezone Reset**: Test around midnight EST to verify proper reset
2. **Concurrent Swipes**: Multiple group members swiping simultaneously
3. **Network Errors**: Handle failed RPC calls gracefully
4. **Group Changes**: What happens when user switches between groups
5. **App Restart**: Verify swipe counter persists after app reload

## Architecture Benefits

### Performance
- Single database lookup to check/update swipe limits
- Efficient indexing on group_id and date
- Minimal frontend state management

### Scalability
- Date-based partitioning ready (group_daily_swipes table)
- Can easily adjust daily limits via constant change
- Timezone handling is database-driven

### User Experience
- Real-time feedback on swipe usage
- Clear messaging about limits and resets
- Visual cues when limits are reached
- No surprise failures - limits checked before swiping

### Data Integrity
- RLS policies ensure users can only see their group's data
- Foreign key constraints maintain referential integrity
- Proper error handling at all levels

## Future Enhancements

1. **Variable Limits**: Different limits for different group types/subscriptions
2. **Premium Features**: Extra swipes for premium users
3. **Analytics**: Track swipe patterns and usage statistics
4. **Notifications**: Push notifications when limits reset
5. **Rollover**: Allow unused swipes to roll over (with limits)

## Troubleshooting

### Common Issues

1. **Swipe counter not updating**: Check that RPC functions are properly deployed
2. **Timezone issues**: Verify server timezone settings in Supabase
3. **Permissions errors**: Ensure RLS policies are correctly configured
4. **Reset not working**: Check that date calculations use America/New_York timezone

### Debug Queries
```sql
-- Check RPC function exists
SELECT proname FROM pg_proc WHERE proname LIKE '%swipe%';

-- Verify table structure
\d group_daily_swipes

-- Check current NYC time
SELECT NOW() AT TIME ZONE 'America/New_York';
```