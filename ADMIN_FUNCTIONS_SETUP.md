# Admin Functions Setup Guide

## Issue: Password Reset Error

If you're getting the error "Failed to send a request to the Edge Function" when trying to reset a user's password from the admin dashboard, it means the `admin-reset-password` Edge Function is not deployed.

## Solution

### Option 1: Deploy All Admin Functions (Recommended)
1. Open Command Prompt as Administrator
2. Navigate to your project directory:
   ```cmd
   cd c:\Users\user\Desktop\campusconnect-safe
   ```
3. Run the deployment script:
   ```cmd
   deploy-admin-functions.bat
   ```

### Option 2: Deploy Individual Function
If you only want to deploy the password reset function:
```cmd
supabase functions deploy admin-reset-password
```

### Option 3: Manual Deployment
1. Make sure Supabase CLI is installed:
   ```cmd
   npm install -g supabase
   ```
2. Login to Supabase:
   ```cmd
   supabase login
   ```
3. Link to your project:
   ```cmd
   supabase link --project-ref ssqplkrxtrvfptrsnpow
   ```
4. Deploy the function:
   ```cmd
   supabase functions deploy admin-reset-password
   ```

## Verification

After deployment, you should be able to:
1. Go to the Admin Dashboard
2. Click on a user's "Reset Password" button
3. Enter a new password (minimum 8 characters)
4. Successfully reset the password without errors

## Troubleshooting

### Error: "Supabase CLI not found"
Install the Supabase CLI:
```cmd
npm install -g supabase
```

### Error: "Not logged in"
Login to Supabase:
```cmd
supabase login
```

### Error: "Project not linked"
Link to your project:
```cmd
supabase link --project-ref ssqplkrxtrvfptrsnpow
```

### Error: "Function deployment failed"
1. Check your internet connection
2. Verify you have admin access to the Supabase project
3. Try logging out and back in:
   ```cmd
   supabase logout
   supabase login
   ```

## What the Function Does

The `admin-reset-password` Edge Function:
- Accepts a user ID and new password from admin users
- Validates the password (minimum 8 characters)
- Uses Supabase Admin API to update the user's password
- Returns success/error status

## Security Notes

- Only admin users can access this functionality
- The function validates password requirements
- All password changes are logged for security
- Users receive notifications when their password is changed