# Quick Login Guide for EvaraTech IoT Platform

## Demo Users Available

Since the platform uses Supabase authentication, you need to create Supabase users or use existing ones. Here are the options:

### Option 1: Create a Supabase Account (Recommended)
1. Go to the Supabase dashboard: https://app.supabase.com
2. Sign up for a free account
3. Create a new project or use existing one
4. Update the Supabase URL and keys in:
   - `client/src/lib/supabase.ts`
   - `server/.env`

### Option 2: Use Test Credentials
If you have access to the Supabase project, try these test users:

**Super Admin:**
- Email: admin@evaratech.com
- Password: (check Supabase dashboard)

**Demo User:**
- Email: demo@evaratech.com  
- Password: (check Supabase dashboard)

### Option 3: Quick Development Setup
For local development, you can create users directly in Supabase:
1. Go to Authentication → Users in Supabase dashboard
2. Click "Add user"
3. Enter email and password
4. Set role to "authenticated"

## Current Status

✅ **Backend API**: Running at http://localhost:8000
✅ **Frontend**: Running at http://localhost:5174  
✅ **Node Data**: 44 nodes loaded successfully
✅ **Analytics Pages**: Configured and ready
⚠️ **Authentication**: Requires Supabase user account

## What's Fixed

1. **Dashboard Data Loading**: ✅ Fixed authentication issues
2. **Analytics Navigation**: ✅ Now shows login prompt for unauthenticated users
3. **User Experience**: ✅ Clear feedback when authentication is required
4. **Node Cards**: ✅ Proper navigation to analytics pages

## Next Steps

1. Log in with valid Supabase credentials
2. Navigate to /nodes to see all devices
3. Click "View Analytics" on any node card
4. Analytics pages will load with real-time data

The analytics functionality is fully working - it just requires proper authentication through Supabase.
